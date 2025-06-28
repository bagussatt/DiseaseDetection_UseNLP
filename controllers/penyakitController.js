const admin = require('firebase-admin');
const { detectPenyakit } = require('../nlp');

// API untuk memproses input teks dan mendeteksi penyakit
exports.processText = async (req, res) => {
    const inputText = req.body.inputText; // Input teks dari pengguna
    const hasil = detectPenyakit(inputText); // Hasil deteksi dari fungsi NLP

    // Format tanggal DD-MM-YYYY
    const now = new Date();
    const timestamp = now.toLocaleDateString('id-ID');

    const dataToSave = {
        inputText: inputText,
        hasil: hasil,
        timestamp: timestamp
    };
    console.log("[Firebase Save] Data to be saved:", JSON.stringify(dataToSave, null, 2));
    try {
        await admin.database().ref('deteksiPenyakit').push(dataToSave);
        console.log("[Firebase Save] Data successfully saved to Firebase.");
    } catch (firebaseError) {
        console.error("[Firebase Save] Error saving data to Firebase:", firebaseError);
    }
    // --- AKHIR BAGIAN KRITIS ---


    let responseText = '';
    // Cek jika hasil adalah kasus 'Tidak Terdeteksi' dari NLP
    if (hasil.length === 1 && hasil[0].penyakit === 'Tidak Terdeteksi') {
        const item = hasil[0];
        responseText += `Penyakit terdeteksi: ${item.penyakit}\n`;
        // Pastikan gejala ditampilkan jika ada, meskipun tidak ada diagnosis kuat
        responseText += `Gejala yang muncul: ${Array.isArray(item.gejala) && item.gejala.length > 0 ? item.gejala.join(', ') : 'Tidak ada gejala spesifik'}\n`;
        responseText += `Saran Tambahan: ${item.saranDokter}\n`;
    } else if (hasil.length > 0) {
        // Ini untuk kasus penyakit yang benar-benar terdeteksi (skor >= 3)
        hasil.forEach(item => {
            responseText += `Penyakit terdeteksi: ${item.penyakit}\n`;
            responseText += `Gejala yang muncul: ${Array.isArray(item.gejala) ? item.gejala.join(', ') : 'N/A'}\n`;
            responseText += `Saran Tambahan: ${item.saranDokter}\n`;
        });
    } else {
        // Fallback, meskipun dengan perubahan di NLP, blok ini seharusnya jarang (atau tidak pernah) tercapai
        // Ini akan terjadi jika NLP mengembalikan array kosong, bukan objek 'Tidak Terdeteksi'
        responseText = 'Tidak ada penyakit yang terdeteksi secara spesifik dari gejala yang Anda masukkan.';
    }


    res.json({ hasilDeteksi: responseText });
};

// Fungsi untuk menghitung persentase penyakit secara keseluruhan
exports.getPersentasePenyakit = async (req, res) => {
    try {
        const db = admin.database();
        const ref = db.ref('deteksiPenyakit');

        // Ambil data dari Firebase
        const snapshot = await ref.once('value');
        const data = snapshot.val();

        if (!data) {
            return res.status(404).json({ message: 'Data tidak ditemukan' });
        }

        // Hitung jumlah penyakit
        const totalPenyakit = {};
        let totalCount = 0;

        for (const key in data) {
            const penyakitList = data[key].hasil; // Mengakses `hasil` agar sesuai dengan struktur penyimpanan
            penyakitList.forEach(item => {
                // Hanya hitung penyakit yang terdeteksi secara spesifik, bukan 'Tidak Terdeteksi'
                if (item.penyakit !== 'Tidak Terdeteksi') {
                    totalCount++;
                    if (totalPenyakit[item.penyakit]) {
                        totalPenyakit[item.penyakit]++;
                    } else {
                        totalPenyakit[item.penyakit] = 1;
                    }
                }
            });
        }

        // Hitung persentase
        const persentasePenyakit = {};
        for (const penyakit in totalPenyakit) {
            persentasePenyakit[penyakit] = ((totalPenyakit[penyakit] / totalCount) * 100).toFixed();
        }

        res.json({ totalCount, persentasePenyakit });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data' });
    }
};

// API untuk mendapatkan persentase penyakit spesifik berdasarkan nama penyakit
exports.getPersentaseSpesifik = async (req, res) => {
    try {
        const penyakitDicari = req.params.penyakit.toLowerCase(); // Ambil parameter penyakit dari URL
        const db = admin.database();
        const ref = db.ref('deteksiPenyakit');

        const snapshot = await ref.once('value');
        const data = snapshot.val();

        if (!data) {
            return res.status(404).json({ message: 'Data tidak ditemukan' });
        }

        let totalCount = 0;
        let penyakitCount = 0;

        for (const key in data) {
            const penyakitList = data[key].hasil; // Mengakses `hasil` agar sesuai dengan format penyimpanan
            penyakitList.forEach(item => {
                // Hanya hitung penyakit yang terdeteksi secara spesifik
                if (item.penyakit !== 'Tidak Terdeteksi') {
                    totalCount++;
                    if (item.penyakit.toLowerCase() === penyakitDicari) {
                        penyakitCount++;
                    }
                }
            });
        }

        if (totalCount === 0) {
            return res.json({ penyakit: penyakitDicari, persentase: "0.00" });
        }

        const persentase = ((penyakitCount / totalCount) * 100).toFixed();

        res.json({ penyakit: penyakitDicari, persentase });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data' });
    }
};

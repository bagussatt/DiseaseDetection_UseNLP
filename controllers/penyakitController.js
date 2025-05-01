const admin = require('firebase-admin');
const { detectPenyakit } = require('../nlp');

// API untuk memproses input teks dan mendeteksi penyakit
exports.processText = async (req, res) => {
    const inputText = req.body.inputText;
    const hasil = detectPenyakit(inputText);

    // Format tanggal DD-MM-YYYY
    const now = new Date();
    const timestamp = now.toLocaleDateString('id-ID');

    if (hasil.length > 0) {
        hasil.forEach(item => {
            item.timestamp = timestamp; // Pastikan timestamp ditambahkan ke setiap entri
        });

        // Simpan ke Firebase dengan format yang seragam
        await admin.database().ref('deteksiPenyakit').push({ hasil });

        let responseText = '';
        hasil.forEach(item => {
            responseText += `Penyakit terdeteksi: ${item.penyakit}\n`;
            responseText += `Gejala yang muncul: ${item.gejala.join(', ')}\n`;
            responseText += `Saran Dokter: ${item.saranDokter}\n`;
            responseText += `Saran Obat: ${item.saranObat}\n`;
            // responseText += `Waktu Deteksi: ${item.timestamp}\n\n`;
        });

        res.json({ hasilDeteksi: responseText }); // Kirim respons JSON
    } else {
        res.json({ hasilDeteksi: 'Tidak ada penyakit yang terdeteksi.' }); // Kirim respons JSON
    }
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
                totalCount++;
                if (totalPenyakit[item.penyakit]) {
                    totalPenyakit[item.penyakit]++;
                } else {
                    totalPenyakit[item.penyakit] = 1;
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
                totalCount++;
                if (item.penyakit.toLowerCase() === penyakitDicari) {
                    penyakitCount++;
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
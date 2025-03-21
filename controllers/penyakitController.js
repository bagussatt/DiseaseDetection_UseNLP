const admin = require('firebase-admin');
const { detectPenyakit } = require('../nlp');

// Fungsi untuk mendapatkan persentase penyakit
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
            const penyakitList = data[key];
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
            persentasePenyakit[penyakit] = (totalPenyakit[penyakit] / totalCount) * 100;
        }

        res.json({ totalCount, persentasePenyakit });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data' });
    }
};

// Fungsi untuk memproses teks
exports.processText = async (req, res) => {
    const inputText = req.body.inputText;

    // Panggil fungsi deteksi penyakit dari nlp.js
    const hasil = detectPenyakit(inputText);

    // Menghasilkan respons
    let responseText = '';
    if (hasil.length > 0) {
        hasil.forEach(item => {
            responseText += `Penyakit terdeteksi: ${item.penyakit}<br>`;
            responseText += `${item.saranObat}<br>`;
            responseText += `${item.saranDokter}<br>`;
            responseText += `Gejala yang muncul: ${item.gejala.join(', ')}<br><br>`;
        });

        // Simpan hasil ke Firebase
        await admin.database().ref('deteksiPenyakit').push(hasil);
    } else {
        responseText = 'Tidak ada penyakit yang terdeteksi.';
    }

    // Kirim respons ke klien
    res.send(`
        <html>
            <body>
                <h1>Hasil Deteksi</h1>
                <div>${responseText}</div>
                <script>
                    alert('Data berhasil disimpan ke Firebase!');
                </script>
            </body>
        </html>
    `);
};
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
            const penyakitList = data[key];
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

        const persentase = ((penyakitCount / totalCount) * 100).toFixed(2);

        res.json({ penyakit: penyakitDicari, persentase });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil data' });
    }
};

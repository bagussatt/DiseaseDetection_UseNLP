const express = require('express');
const bodyParser = require('body-parser');
const { deteksiGejala } = require('./nlp'); // Mengimpor fungsi dari nlp.js

const app = express();
const port = 3000;

// Middleware untuk parsing data formulir
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Route untuk halaman utama
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Route untuk memproses teks
app.post('/process', async (req, res) => {
    const inputText = req.body.inputText;
    const intent = await deteksiGejala(inputText); // Menggunakan fungsi deteksi gejala

    // Menentukan saran berdasarkan intent
    let saranObat = '';
    let saranDokter = '';

    switch (intent) {
        case 'gejala.flu':
            saranObat = 'Obat yang disarankan: Paracetamol untuk demam dan batuk.';
            saranDokter = 'Saran: Istirahat yang cukup dan minum banyak cairan.';
            break;
        case 'gejala.diare':
            saranObat = 'Obat yang disarankan: Loperamide untuk diare.';
            saranDokter = 'Saran: Pastikan untuk tetap terhidrasi.';
            break;
        case 'gejala.hipertensi':
            saranObat = 'Obat yang disarankan: Obat antihipertensi sesuai resep dokter.';
            saranDokter = 'Saran: Periksa tekanan darah secara rutin.';
            break;
        default:
            saranObat = 'Gejala tidak terdeteksi. Silakan konsultasikan dengan dokter.';
            saranDokter = '';
            break;
    }

    res.send(`Hasil deteksi: ${intent}<br>${saranObat}<br>${saranDokter}`);
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});

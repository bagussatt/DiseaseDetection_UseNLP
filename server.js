const express = require('express');
const bodyParser = require('body-parser');
const { deteksiGejala } = require('./nlp'); // Pastikan ini sesuai dengan nama file Anda

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
app.post('/process', (req, res) => {
    const inputText = req.body.inputText;
    const hasilDeteksi = deteksiGejala(inputText);

    if (hasilDeteksi.penyakit) {
        res.send(`Penyakit terdeteksi: ${hasilDeteksi.penyakit}<br>
                  Saran obat: ${hasilDeteksi.saranObat}<br>
                  Saran dokter: ${hasilDeteksi.saranDokter}`);
    } else {
        res.send('Tidak ada gejala yang terdeteksi.');
    }
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});

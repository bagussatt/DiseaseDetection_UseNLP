const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const { detectPenyakit } = require('./nlp'); // Pastikan jalur ini benar


// Inisialisasi Firebase Admin SDK
const serviceAccount = require('./config/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://deteksipenyakit-e049c-default-rtdb.asia-southeast1.firebasedatabase.app"
});

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

    // Panggil fungsi deteksi penyakit dari nlp.js
    const hasil = detectPenyakit(inputText); // Pastikan Anda sudah mengimpor fungsi ini dari nlp.js

    // Jika tidak ada penyakit yang terdeteksi
    if (hasil.length === 0) {
        res.send("Tidak ada penyakit yang terdeteksi.");
    } else {
        // Menghasilkan respons
        let responseText = '';
        hasil.forEach(item => {
            responseText += `Penyakit terdeteksi: ${item.penyakit}<br>`;
            responseText += `${item.saranObat}<br>`;
            responseText += `${item.saranDokter}<br>`;
            responseText += `Gejala yang muncul: ${item.gejala.join(', ')}<br><br>`;
        });

        // Simpan hasil ke Firebase
        const db = admin.database();
        const ref = db.ref('deteksiPenyakit');
        await ref.push(hasil); // Menyimpan hasil ke Firebase

        // Kirim respons ke klien
        res.send(responseText);
    }
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});

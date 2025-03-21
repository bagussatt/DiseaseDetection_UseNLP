const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const serviceAccount = require('./config/serviceAccountKey.json');
const penyakitRoutes = require('./routes/penyakitRoutes');

// Inisialisasi Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://deteksipenyakit-e049c-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const app = express();
const port = 3000;

// Middleware untuk parsing data formulir
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware untuk menyajikan file statis dari folder 'public'
app.use(express.static('public'));

// Rute utama
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
app.get('/speech-to-text', (req, res) => {
    res.sendFile(__dirname + '/public/deteksiPenyakit.html');
});
app.get('/speech-to-text', (req, res) => {
    res.sendFile(__dirname + '/public/flu.html');
});
// Menggunakan rute penyakit
app.use('/api', penyakitRoutes);

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});

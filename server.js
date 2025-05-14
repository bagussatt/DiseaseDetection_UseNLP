const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const serviceAccount = require('./config/serviceAccountKey.json');
const penyakitRoutes = require('./routes/penyakitRoutes');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
console.log('Telegram Bot initialized...')
// Inisialisasi Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://deteksipenyakit-e049c-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const app = express();
const port = 3000;

app.use(express.json()); // Tambahkan ini jika belum ada
// Middleware untuk parsing data formulir
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware untuk menyajikan file statis dari folder 'public'
app.use(express.static('public'));



// Rute utama
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});
app.get('/speech-to-text', (req, res) => {
    res.sendFile(__dirname + '/public/deteksiPenyakit.html');
});
app.get('/speech-to-text', (req, res) => {
    res.sendFile(__dirname + '/public/flu.html');
});
// Menggunakan rute penyakit
app.use('/api', penyakitRoutes);

app.get('/api/nearby-hospitals', async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude dan longitude dibutuhkan.' });
    }

    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:30];(node(around:5000,${lat},${lng})["amenity"="hospital"];way(around:5000,${lat},${lng})["amenity"="hospital"];relation(around:5000,${lat},${lng})["amenity"="hospital"];);out center;`;

    try {
        const response = await axios.get(overpassUrl);
        const hospitals = response.data.elements.map(element => {
            return {
                lat: element.lat || element.center?.lat,
                lng: element.lon || element.center?.lon,
                name: element.tags?.name || 'Hospital',
                address: element.tags?.["addr:street"] ? `${element.tags?.["addr:street"]} ${element.tags?.["addr:housenumber"]}, ${element.tags?.["addr:city"] || element.tags?.["addr:locality"]}` : 'Alamat tidak tersedia'
            };
        }).filter(h => h.lat && h.lng);

        res.json(hospitals);
    } catch (error) {
        console.error('Error fetching hospitals from Overpass API:', error);
        res.status(500).json({ error: 'Gagal mengambil data rumah sakit terdekat.' });
    }
});
// Middleware untuk parsing JSON body (jika Anda mengirim data sebagai JSON dari frontend)

// Rute untuk menangani submit formulir reservasi
app.post('/api/reservasi', async (req, res) => {
    console.log('Menerima permintaan reservasi:', req.body);

    const reservasiData = {
        nama: req.body.nama,
        telepon: req.body.telepon,
        telegram_id: req.body.telegram_id || null, // ID Telegram dari form
        rumah_sakit: req.body.rumah_sakit_nama || null,
        tanggal: req.body.tanggal,
        waktu: req.body.waktu || null,
        catatan: req.body.catatan || null,
        diagnosis: req.body.diagnosis,
        timestamp: admin.database.ServerValue.TIMESTAMP
    };

    // Validasi dasar
    if (!reservasiData.nama || !reservasiData.telepon || !reservasiData.tanggal || !reservasiData.diagnosis) {
        console.error("Data tidak lengkap:", reservasiData);
        return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
    }

    try {
        // 1. Simpan data ke Firebase
        const db = admin.database();
        const reservasiRef = db.ref('reservasi');
        const newReservasi = await reservasiRef.push(reservasiData); // Simpan dan dapatkan referensi data baru
        const reservasiId = newReservasi.key; // Dapatkan ID unik Firebase
        console.log('Data reservasi berhasil disimpan ke Firebase dengan ID:', reservasiId);

        // --- Kirim Notifikasi Telegram jika ID Telegram diisi ---
        if (reservasiData.telegram_id) {
            const chatId = reservasiData.telegram_id; // Asumsikan ini adalah Chat ID numerik
            const message = `
✅ *Reservasi Baru Diterima*

**Nama:** ${reservasiData.nama}
**Telepon:** ${reservasiData.telepon}
**Tanggal:** ${reservasiData.tanggal}${reservasiData.waktu ? ` (${reservasiData.waktu})` : ''}
**RS Tujuan:** ${reservasiData.rumah_sakit || '-'}
**Catatan:** ${reservasiData.catatan || '-'}
*Status: Registrasi SUKSES*

**Ringkasan Gejala:**
\`\`\`
${reservasiData.diagnosis || 'Tidak ada data diagnosis'}
\`\`\`

_(ID Reservasi: ${reservasiId})_
            `;

            try {
                // Kirim pesan menggunakan Markdown untuk formatting
                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                console.log(`Notifikasi Telegram berhasil dikirim ke Chat ID: ${chatId}`);
            } catch (telegramError) {
                console.error(`Gagal mengirim notifikasi Telegram ke Chat ID: ${chatId}`, telegramError.response ? telegramError.response.body : telegramError.message);
                // Jangan gagalkan seluruh proses hanya karena notif Telegram gagal
                // Mungkin tambahkan logging khusus untuk error ini
            }
        } else {
            console.log('Tidak ada ID Telegram yang diberikan, notifikasi tidak dikirim.');
        }
        // ---------------------------------------------------------

        // 3. Kirim response sukses ke frontend
        res.status(201).json({ success: true, message: 'Permintaan reservasi berhasil dikirim dan disimpan!' });

    } catch (error) {
        console.error('Error saat menyimpan reservasi atau mengirim notifikasi:', error);
        res.status(500).json({ success: false, message: 'Terjadi kesalahan internal saat memproses permintaan Anda.' });
    }
});
app.post('/api/register', async (req, res) => {
    const { email, password, nama } = req.body;
    if (!email || !password) { return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' }); }
    if (password.length < 6) { return res.status(400).json({ success: false, message: 'Password minimal harus 6 karakter.' }); }
    try {
        console.log(`Mencoba mendaftarkan pengguna baru: ${email}`);
        const userRecord = await admin.auth().createUser({
            email: email, password: password, displayName: nama || '', emailVerified: false,
        });
        console.log('Pengguna baru berhasil dibuat:', userRecord.uid);
        // Opsional: Simpan data tambahan ke DB
        res.status(201).json({ success: true, message: 'Registrasi berhasil!', uid: userRecord.uid });
    } catch (error) {
        console.error('Error saat registrasi pengguna:', error);
        let errorMessage = 'Gagal melakukan registrasi.';
        if (error.code === 'auth/email-already-exists') { errorMessage = 'Email ini sudah terdaftar.'; }
        else if (error.code === 'auth/invalid-email') { errorMessage = 'Format email tidak valid.'; }
        else if (error.code === 'auth/invalid-password') { errorMessage = 'Password tidak valid (minimal 6 karakter).'; }
        res.status(400).json({ success: false, message: errorMessage, errorCode: error.code });
    }
});
app.get('/api/firebase-config', (req, res) => {
    // Ambil nilai konfigurasi publik dari environment variables
    // Pastikan Anda sudah mengatur variabel ini di server Anda (misal, via .env atau pengaturan hosting)
    const firebaseConfigPublic = {
        apiKey: process.env.FIREBASE_API_KEY, // Nama variabel lingkungan bisa Anda tentukan sendiri
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID, 
        databaseURL: process.env.FIREBASE_DATABASE_URL 
    };

    // Validasi sederhana apakah variabel lingkungan penting sudah diatur
    if (!firebaseConfigPublic.apiKey || !firebaseConfigPublic.authDomain || !firebaseConfigPublic.projectId) {
         console.error("Kesalahan Konfigurasi Server: Variabel lingkungan Firebase publik (API_KEY, AUTH_DOMAIN, PROJECT_ID) belum diatur!");
         // Jangan kirim detail error ke klien
         return res.status(500).json({ success: false, message: "Kesalahan konfigurasi pada server." });
    }

    res.json({
        apiKey: firebaseConfigPublic.apiKey,
        authDomain: firebaseConfigPublic.authDomain,
        projectId: firebaseConfigPublic.projectId,
        storageBucket: firebaseConfigPublic.storageBucket,
        messagingSenderId: firebaseConfigPublic.messagingSenderId,
        appId: firebaseConfigPublic.appId,
        measurementId: firebaseConfigPublic.measurementId,
        databaseURL: firebaseConfigPublic.databaseURL // Kirim jika perlu
    });
});

app.post('/api/set-admin', async (req, res) => {
    const { uid } = req.body; // Ambil UID pengguna target dari body request

    if (!uid) {
        return res.status(400).json({ success: false, message: 'UID pengguna target wajib diisi.' });
    }


    try {
        // Tetapkan custom claim { admin: true } ke pengguna target
        await admin.auth().setCustomUserClaims(uid, { admin: true });
        console.log(`Admin claim berhasil ditetapkan untuk UID: ${uid} (Dipanggil tanpa verifikasi admin pemanggil)`);

        // Kirim response sukses
        res.status(200).json({ success: true, message: `Klaim admin berhasil ditetapkan untuk pengguna ${uid}.` });

    } catch (error) {
        console.error(`Error saat menetapkan admin claim untuk UID ${uid}:`, error);
        let errorMessage = 'Gagal menetapkan klaim admin.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = `Pengguna dengan UID ${uid} tidak ditemukan.`;
            return res.status(404).json({ success: false, message: errorMessage });
        }
        res.status(500).json({ success: false, message: errorMessage });
    }
});


app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
    }

    console.log(`Menerima permintaan login untuk: ${email}`);

    try {
     
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`Pengguna ditemukan: ${userRecord.uid}, Email terverifikasi: ${userRecord.emailVerified}`);

        res.status(200).json({
            success: true,
            message: 'Email terdaftar. Verifikasi password dilakukan di frontend.',
            uid: userRecord.uid,
            emailVerified: userRecord.emailVerified,
            displayName: userRecord.displayName
            // Jangan kirim password atau informasi sensitif lainnya
        });

    } catch (error) {
        console.error('Error pada endpoint /api/login:', error);
        if (error.code === 'auth/user-not-found') {
            res.status(404).json({ success: false, message: 'Email tidak terdaftar.' });
        } else {
            res.status(500).json({ success: false, message: 'Terjadi kesalahan internal.' });
        }
    }
});
// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});

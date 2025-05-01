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


// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});

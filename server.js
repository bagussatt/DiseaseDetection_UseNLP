const express = require('express');
const bodyParser = require('body-parser');
const natural = require('natural');

const app = express();
const port = 3000;

// Middleware untuk parsing data formulir
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); 

// Inisialisasi Naive Bayes Classifier
const classifier = new natural.BayesClassifier();

// Latih classifier dengan data contoh
classifier.addDocument('Setelah melihat hasil tes, saya rasa Anda hanya mengalami flu biasa, padahal sebenarnya Anda menderita pneumonia', '-');
classifier.addDocument('Saya tidak melihat tanda-tanda yang menunjukkan adanya masalah serius, meskipun Anda sudah mengeluhkan nyeri yang terus-menerus', '-');
classifier.addDocument('Saya akan memberikan Anda obat ini, meskipun saya tidak yakin apakah ini yang Anda butuhkan untuk gejala yang Anda alami', '-');
classifier.addDocument('Berdasarkan hasil pemeriksaan dan gejala yang Anda sampaikan, saya merekomendasikan obat ini untuk membantu mengatasi masalah Anda', '+');
classifier.addDocument('Setelah mengikuti pengobatan ini selama dua minggu, saya senang mendengar bahwa gejala Anda sudah berkurang', '+');
classifier.train();

// Route untuk halaman utama
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Route untuk memproses teks
app.post('/process', (req, res) => {
    const inputText = req.body.inputText;
    const classification = classifier.classify(inputText);
    
    // Hitung persentase malpraktik
    const totalDocuments = classifier.getClassifications(inputText);
    const malpraktikCount = totalDocuments.find(doc => doc.label === '-')?.value || 0;
    const tidakMalpraktikCount = totalDocuments.find(doc => doc.label === '+')?.value || 0;

    const total = malpraktikCount + tidakMalpraktikCount;
    const percentageMalpraktik = total > 0 ? (malpraktikCount / total) * 100 : 0;

    res.send(`Hasil klasifikasi: ${classification}<br>Persentase kemungkinan malpraktik: ${percentageMalpraktik.toFixed(2)}%`);
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});

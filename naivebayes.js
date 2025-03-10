const natural = require('natural');

// Inisialisasi Naive Bayes Classifier
const classifier = new natural.BayesClassifier();

// Latih classifier dengan data contoh
function trainClassifier() {
    classifier.addDocument('Setelah melihat hasil tes, saya rasa Anda hanya mengalami flu biasa, padahal sebenarnya Anda menderita pneumonia', '-');
    classifier.addDocument('Saya tidak melihat tanda-tanda yang menunjukkan adanya masalah serius, meskipun Anda sudah mengeluhkan nyeri yang terus-menerus', '-');
    classifier.addDocument('Saya akan memberikan Anda obat ini, meskipun saya tidak yakin apakah ini yang Anda butuhkan untuk gejala yang Anda alami', '-');
    classifier.addDocument('Berdasarkan hasil pemeriksaan dan gejala yang Anda sampaikan, saya merekomendasikan obat ini untuk membantu mengatasi masalah Anda', '+');
    classifier.addDocument('Setelah mengikuti pengobatan ini selama dua minggu, saya senang mendengar bahwa gejala Anda sudah berkurang', '+');
    classifier.train();
}

// Fungsi untuk mengklasifikasikan teks
function classifyText(inputText) {
    return classifier.classify(inputText);
}

// Fungsi untuk mendapatkan persentase klasifikasi
function getClassificationPercentage(inputText) {
    const totalDocuments = classifier.getClassifications(inputText);
    const malpraktikCount = totalDocuments.find(doc => doc.label === '-')?.value || 0;
    const tidakMalpraktikCount = totalDocuments.find(doc => doc.label === '+')?.value || 0;

    const total = malpraktikCount + tidakMalpraktikCount;
    const percentageMalpraktik = total > 0 ? (malpraktikCount / total) * 100 : 0;

    return percentageMalpraktik;
}

// Ekspor fungsi
module.exports = {
    trainClassifier,
    classifyText,
    getClassificationPercentage
};

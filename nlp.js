const natural = require('natural');
const { WordTokenizer, PorterStemmer } = natural;
const tokenizer = new WordTokenizer();

const stopwords = ['saya', 'yang', 'dan', 'atau', 'adalah', 'pada', 'dari', 'ke', 'itu', 'ini'];
const keywords = {
        flu: {
            keywords: ['demam', 'batuk', 'pilek', 'sakit kepala', 'nyeri otot'],
            saranObat: 'Obat yang disarankan: Paracetamol untuk demam dan nyeri, serta obat batuk yang sesuai.',
            saranDokter: 'Saran: Istirahat yang cukup dan minum banyak cairan.'
        },
        diare: {
            keywords: ['diare', 'nyeri perut', 'mual', 'kram perut'],
            saranObat: 'Obat yang disarankan: Loperamide untuk mengurangi frekuensi buang air besar.',
            saranDokter: 'Saran: Pastikan tetap terhidrasi dengan minum oralit atau cairan elektrolit.'
        },
        hipertensi: {
            keywords: ['tekanan darah tinggi', 'pusing', 'sakit kepala', 'lemas', "Mimisan", 'Kepala berdenging'],
            saranObat: 'Obat yang disarankan: Obat antihipertensi seperti amlodipin atau sesuai resep dokter.',
            saranDokter: 'Saran: Periksa tekanan darah secara rutin dan hindari makanan tinggi garam.'
        },
        diabetes: {
            keywords: ['sering kencing', 'lemas', 'luka sulit sembuh', 'kesemutan', 'kencing manis', 'haus'],
            saranObat: 'Obat yang disarankan: Insulin atau obat antidiabetes oral sesuai resep dokter.',
            saranDokter: 'Saran: Jaga pola makan sehat, rutin berolahraga, pantau kadar gula darah, dan ikuti anjuran dokter.'
        },
        ispa: {
            keywords: ['sakit tenggorokan', 'sesak napas', 'kelelahan', 'bersin', 'nyeri tenggorokan'],
            saranObat: 'Obat yang disarankan: Paracetamol atau ibuprofen untuk demam, diphenhydramine dan pseudoephedrine untuk hidung tersumbat, guaifenesin untuk batuk, dan antibiotik jika diresepkan oleh dokter.',
            saranDokter: 'Saran: Lakukan pemeriksaan ke dokter jika gejala berlangsung lebih dari 3 minggu atau semakin memburuk.'
        }
    
};

function removeStopwords(tokens) {
    return tokens.filter(token => !stopwords.includes(token));
}

function detectPenyakit(input) {
    const tokens = tokenizer.tokenize(input.toLowerCase());
    const filteredTokens = removeStopwords(tokens);
    const stemmedTokens = filteredTokens.map(token => PorterStemmer.stem(token));

    const hasil = [];
    for (const [penyakit, data] of Object.entries(keywords)) {
        const foundKeywords = data.keywords.filter(keyword => stemmedTokens.includes(PorterStemmer.stem(keyword)));
        if (foundKeywords.length > 0) {
            hasil.push({
                penyakit: penyakit,
                saranObat: data.saranObat,
                saranDokter: data.saranDokter,
                gejala: foundKeywords
            });
        }
    }

    // Jika tidak ada penyakit yang terdeteksi
    if (hasil.length === 0) {
        return [{
            penyakit: 'Tidak ada penyakit yang terdeteksi.',
            saranObat: 'Tidak ada obat yang disarankan.',
            saranDokter: 'Silakan konsultasikan dengan dokter.',
            gejala: []
        }];
    }

    return hasil;
}

module.exports = { detectPenyakit };

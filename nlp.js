const natural = require('natural');
const { WordTokenizer, PorterStemmer } = natural;
const tokenizer = new WordTokenizer();

const stopwords = ['saya', 'yang', 'dan', 'atau', 'adalah', 'pada', 'dari', 'ke', 'itu', 'ini'];
const keywords = {
    flu: {
        keywords: ['demam', 'batuk', 'pilek', 'sakit kepala', 'nyeri otot'],
        saranObat: 'Obat yang disarankan: Paracetamol untuk demam dan batuk.',
        saranDokter: 'Saran: Istirahat yang cukup dan minum banyak cairan.'
    },
    diare: {
        keywords: ['diare', 'nyeri perut', 'mual', 'kram perut'],
        saranObat: 'Obat yang disarankan: Loperamide untuk diare.',
        saranDokter: 'Saran: Pastikan untuk tetap terhidrasi.'
    },
    hipertensi: {
        keywords: ['tekanan darah tinggi', 'pusing', 'sakit kepala', 'lemas'],
        saranObat: 'Obat yang disarankan: Obat antihipertensi sesuai resep dokter.',
        saranDokter: 'Saran: Periksa tekanan darah secara rutin.'
    },
    diabetes: {
        keywords: ['sering kencing', 'lemas', 'luka sulit sembuh', 'lemas','kesemutan','kencing manis','haus'],
        saranObat: 'Obat yang disarankan: Insulin sesuai resep dokter.',
        saranDokter: 'Saran:  menjaga pola makan sehat, rutin berolahraga, memantau kadar gula darah, dan mengikuti saran dokter '
    },
    ISPA : {

        keyword: ['batuk','pilek','sakit tenggorokan','Sesak Nafas','Kelelahan','Bersin'],
        saranObat: ['Obat yang disarankan: Tentu, ini ringkasan obat-obatan dalam format paragraf biasa:Untuk mengatasi demam dan nyeri otot, Anda bisa menggunakan ibuprofen atau paracetamol. Jika Anda mengalami pilek dan hidung tersumbat, diphenhydramine dan pseudoephedrine dapat membantu. Guaifenesin digunakan untuk meredakan batuk. Apabila infeksi saluran pernapasan disebabkan oleh bakteri, antibiotik mungkin diperlukan dan penting untuk menghabiskan seluruh dosis sesuai anjuran dokter. Terakhir, jika ISPA disebabkan oleh virus dan gejalanya berat, seperti pada influenza, obat antiviral mungkin akan diresepkan'],
        saranDokter: ['Saran: Silahkan datang ke dokter untuk diresepkan obat untuk antibiotik, Lakukan pemeriksaan ke dokter jika Anda mengalami gejala di atas, terutama bila keluhan memburuk dan telah berlangsung selama lebih dari 3 minggu.']
    },
    
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

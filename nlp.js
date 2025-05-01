const natural = require('natural');
const { WordTokenizer, PorterStemmer } = natural;
const tokenizer = new WordTokenizer();

const stopwords = ['saya', 'yang', 'dan', 'atau', 'adalah', 'pada', 'dari', 'ke', 'itu', 'ini'];
const keywords = {

    flu: {
        keywords: ['demam', 'batuk', 'pilek', 'sakit kepala', 'nyeri otot'].map(PorterStemmer.stem),
        saranObat: 'Obat yang disarankan: Paracetamol untuk demam dan nyeri, serta obat batuk yang sesuai.',
        saranDokter: 'Saran: Istirahat yang cukup dan minum banyak cairan.'
    },
    diare: {
        keywords: ['diare', 'nyeri perut', 'mual', 'kram perut'].map(PorterStemmer.stem),
        saranObat: 'Obat yang disarankan: Loperamide untuk mengurangi frekuensi buang air besar.',
        saranDokter: 'Saran: Pastikan tetap terhidrasi dengan minum oralit atau cairan elektrolit.'
    },
    hipertensi: {
        keywords: ['tekanan darah tinggi', 'pusing', 'sakit kepala', 'lemas', "mimisan", 'kepala berdenging'].map(PorterStemmer.stem),
        saranObat: 'Obat yang disarankan: Obat antihipertensi seperti amlodipin atau sesuai resep dokter.',
        saranDokter: 'Saran: Periksa tekanan darah secara rutin dan hindari makanan tinggi garam.'
    },
    diabetes: {
        keywords: ['sering kencing', 'lemas', 'luka sulit sembuh', 'kesemutan', 'kencing manis', 'gula darah tinggi', 'haus'].map(PorterStemmer.stem),
        saranObat: 'Obat yang disarankan: Insulin atau obat antidiabetes oral sesuai resep dokter.',
        saranDokter: 'Saran: Jaga pola makan sehat, rutin berolahraga, pantau kadar gula darah, dan ikuti anjuran dokter.'
    },
    ispa: {
        keywords: ['sakit tenggorokan', 'sesak napas', 'kelelahan', 'bersin', 'nyeri tenggorokan'].map(PorterStemmer.stem),
        saranObat: 'Obat yang disarankan: Paracetamol atau ibuprofen untuk demam, diphenhydramine dan pseudoephedrine untuk hidung tersumbat, guaifenesin untuk batuk, dan antibiotik jika diresepkan oleh dokter.',
        saranDokter: 'Saran: Lakukan pemeriksaan ke dokter jika gejala berlangsung lebih dari 3 minggu atau semakin memburuk.'
    },
    stroke: {
        keywords: ['lemah anggota gerak', 'bicara pelo', 'mati rasa', 'gangguan penglihatan', 'sakit kepala hebat', 'pecah pembuluh darah otak', 'penyumbatan pembuluh darah otak'].map(PorterStemmer.stem),
        saranObat: 'Obat yang disarankan: Tidak ada penanganan obat mandiri. Segera cari pertolongan medis.',
        saranDokter: 'Saran: Segera bawa ke rumah sakit jika ada gejala stroke. Penanganan cepat sangat penting.'
    },
    sakitjantung: {
        keywords: ['nyeri dada', 'sesak napas', 'berdebar debar', 'mudah lelah', 'keringat dingin'].map(PorterStemmer.stem),
        saranObat: 'Obat yang disarankan: Tidak ada penanganan obat mandiri. Konsultasikan dengan dokter.',
        saranDokter: 'Saran: Lakukan pemeriksaan jantung secara rutin, terutama jika ada faktor risiko.'
    },
    penyakitparukronis: {
        keywords: ['sesak napas kronis', 'batuk berdahak menahun', 'mengik', 'napas pendek', 'penyempitan saluran napas menahun'].map(PorterStemmer.stem),
        saranObat: 'Obat yang disarankan: Bronkodilator inhaler sesuai resep dokter.',
        saranDokter: 'Saran: Hindari paparan asap rokok dan polusi udara. Konsultasikan dengan dokter paru.'
    }
}

function removeStopwords(tokens) {
    return tokens.filter(token => !stopwords.includes(token));
}

function detectPenyakit(input) {
    const tokens = tokenizer.tokenize(input.toLowerCase());
    const filteredTokens = removeStopwords(tokens);
    const stemmedTokens = filteredTokens.map(token => PorterStemmer.stem(token));

    const hasil = [];
    for (const [penyakit, data] of Object.entries(keywords)) {
        let foundKeywords = [];
        for (const keyword of data.keywords) {
            const stemmedKeyword = PorterStemmer.stem(keyword);
            if (stemmedTokens.includes(stemmedKeyword)) {
                foundKeywords.push(keyword);
            }
        }
        if (foundKeywords.length > 2) {
            hasil.push({
                penyakit: penyakit,
                gejala: foundKeywords,
                saranDokter: data.saranDokter,
                saranObat: data.saranObat,
            });
        }
    }

    // Deteksi frasa kata kunci (n-gram)
    for (const [penyakit, data] of Object.entries(keywords)) {
        let foundKeywords = [];
        for (const keyword of data.keywords) {
            const stemmedKeyword = PorterStemmer.stem(keyword);
            if (keyword.split(' ').length > 1) { // Jika kata kunci adalah frasa
                const stemmedKeywordParts = keyword.split(' ').map(PorterStemmer.stem);
                for (let i = 0; i <= stemmedTokens.length - stemmedKeywordParts.length; i++) {
                    const nGram = stemmedTokens.slice(i, i + stemmedKeywordParts.length).join(' ');
                    if (nGram === stemmedKeywordParts.join(' ')) {
                        foundKeywords.push(keyword);
                        break;
                    }
                }
            }
        }
        // Gabungkan kata kunci tunggal dan frasa yang ditemukan
        const allFoundKeywords = [...(hasil.find(h => h.penyakit === penyakit)?.gejala || []), ...foundKeywords];
        // Perbarui atau tambahkan hasil jika ada lebih dari 2 gejala
        if (allFoundKeywords.length > 2) {
            const existingResultIndex = hasil.findIndex(h => h.penyakit === penyakit);
            if (existingResultIndex !== -1) {
                hasil[existingResultIndex].gejala = [...new Set([...hasil[existingResultIndex].gejala, ...allFoundKeywords])];
            } else {
                hasil.push({
                    penyakit: penyakit,
                    gejala: [...new Set(allFoundKeywords)],
                    saranDokter: data.saranDokter,
                    saranObat: data.saranObat,
                });
            }
        }
    }


    if (hasil.length === 0) {
        return [{
            penyakit: 'Tidak ada penyakit yang terdeteksi.',
            gejala: [],
            saranDokter: 'Silakan konsultasikan dengan dokter.',
            saranObat: 'Tidak ada obat yang disarankan.',
        }];
    }

    return hasil;
}

module.exports = { detectPenyakit };
const natural = require('natural');
const { WordTokenizer, PorterStemmer } = natural;
const tokenizer = new WordTokenizer();

const stopwords = ['saya', 'yang', 'dan', 'atau', 'adalah', 'pada', 'dari', 'ke', 'itu', 'ini'];
const keywords = {

    ispa: {
        keywords: ['batuk', 'pilek', 'sakit tenggorokan', 'demam', 'sesak napas', 'bersin', 'nyeri otot', 'sakit kepala', 'lemas', 'mual', 'muntah', 'diare'],
        saranObat: 'Paracetamol atau ibuprofen untuk demam, diphenhydramine dan pseudoephedrine untuk hidung tersumbat, guaifenesin untuk batuk, dan antibiotik jika diresepkan oleh dokter.',
        saranDokter: 'Lakukan pemeriksaan ke dokter jika gejala berlangsung lebih dari 3 minggu atau semakin memburuk.',
        sumber: '[Kementerian Kesehatan RI](https://ayosehat.kemkes.go.id/mengenali-gejala-ispa-dan-tindakan-yang-perlu-dilakukan)'
    },
    hipertensi: {
        keywords: ['tekanan darah tinggi', 'pusing', 'sakit kepala', 'sesak napas', 'gelisah', 'penglihatan kabur', 'mudah lelah', 'jantung berdebar', 'nyeri dada', 'mimisan'],
        saranObat: 'Obat antihipertensi seperti amlodipin atau sesuai resep dokter.',
        saranDokter: 'Periksa tekanan darah secara rutin dan hindari makanan tinggi garam.',
        sumber: '[Kementerian Kesehatan RI](https://ayosehat.kemkes.go.id/topik-penyakit/pencegahan-infeksi-pada-usia-produktif/hipertensi-tekanan-darah-tinggi). Data prevalensi: Survei Kesehatan Indonesia (SKI) 2023.'
    },
    diabetes: {
        keywords: ['sering kencing', 'cepat lapar', 'sering haus', 'berat badan menurun', 'kesemutan', 'gatal', 'luka sulit sembuh', 'cepat lelah', 'penglihatan kabur', 'infeksi kulit', 'kencing manis', 'gula darah tinggi', 'haus'],
        saranObat: 'Insulin atau obat antidiabetes oral sesuai resep dokter.',
        saranDokter: 'Jaga pola makan sehat, rutin berolahraga, pantau kadar gula darah, dan ikuti anjuran dokter.',
        sumber: '[Kementerian Kesehatan RI](https://upk.kemkes.go.id/new/mengenal-gejala-diabetes-melitus). Data prevalensi: Survei Kesehatan Indonesia (SKI) 2023.'
    },
    diare: {
        keywords: ['diare', 'nyeri perut', 'mual', 'muntah', 'kram perut', 'feses cair', 'dehidrasi', 'demam', 'lemas'],
        saranObat: 'Loperamide untuk mengurangi frekuensi buang air besar.',
        saranDokter: 'Pastikan tetap terhidrasi dengan minum oralit atau cairan elektrolit.',
        sumber: '[Kementerian Kesehatan RI](https://ayosehat.kemkes.go.id/penyakit/diare). Data prevalensi: Survei Kesehatan Indonesia (SKI) 2023.'
    },
    ginjalkronis: {
        keywords: ['sering kencing malam', 'bengkak kaki', 'mudah lelah', 'mual', 'muntah', 'nafsu makan menurun', 'tekanan darah tinggi', 'darah dalam urin', 'gatal', 'sakit kepala', 'sesak napas'],
        saranObat: 'Tidak ada penanganan obat mandiri. Konsultasikan dengan dokter.',
        saranDokter: 'Jaga pola makan sehat, batasi asupan cairan sesuai anjuran dokter, dan lakukan pemeriksaan ginjal secara rutin jika berisiko.',
        sumber: '[Kementerian Kesehatan RI](https://ayosehat.kemkes.go.id/gejala-penyakit-ginjal-kronis-yang-harus-diwaspadai). Data prevalensi: Survei Kesehatan Indonesia (SKI) 2023.'
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
        if (foundKeywords.length > 1) {
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
const natural = require('natural');
const { WordTokenizer, PorterStemmer } = natural;
const tokenizer = new WordTokenizer();

// Daftar stopwords dalam Bahasa Indonesia (bisa ditambahkan sesuai kebutuhan)
const stopwords = ['saya', 'yang', 'dan', 'atau', 'adalah', 'pada', 'dari', 'ke', 'itu', 'ini', 'merasa', 'mengalami', 'rasanya', 'agak', 'sedikit', 'di', 'bagian', 'terasa', 'sekali', 'banget', 'juga', 'untuk', 'dengan', 'nya', 'punya', 'sudah', 'belum', 'sering', 'cepat', 'kadang'];

// Basis data penyakit dan kata kunci gejala
// Pastikan objek ini tersedia atau diimpor jika didefinisikan di file lain
const keywords = {
    ispa: {
        name: "ISPA (Infeksi Saluran Pernapasan Akut)",
        keywords: ['batuk', 'pilek', 'tenggorok', 'demam', 'sesak', 'napas', 'bersin', 'nyeri otot', 'sakit kepala', 'lemas', 'mual', 'muntah', 'diare'],
        saranDokter: 'Lakukan pemeriksaan ke dokter jika gejala berlangsung lebih dari 3 minggu atau semakin memburuk.',
        sumber: '[Kementerian Kesehatan RI](https://ayosehat.kemkes.go.id/mengenali-gejala-ispa-dan-tindakan-yang-perlu-dilakukan)'
    },
    hipertensi: {
        name: "Hipertensi (Tekanan Darah Tinggi)",
        keywords: ['darah tinggi', 'pusing', 'sakit kepala', 'sesak', 'napas', 'gelisah', 'penglihatan kabur', 'mudah lelah', 'jantung berdebar', 'nyeri dada', 'mimisan'],
        saranDokter: 'Periksa tekanan darah secara rutin dan hindari makanan tinggi garam.',
        sumber: '[Kementerian Kesehatan RI](https://ayosehat.kemkes.go.id/topik-penyakit/pencegahan-infeksi-pada-usia-produktif/hipertensi-tekanan-darah-tinggi). Data prevalensi: Survei Kesehatan Indonesia (SKI) 2023.'
    },
    diabetes: {
        name: "Diabetes Melitus",
        keywords: ['kencing', 'lapar', 'haus', 'berat badan turun', 'kesemutan', 'gatal', 'luka sulit sembuh', 'lelah', 'penglihatan kabur', 'infeksi kulit', 'kencing manis', 'gula darah tinggi'],
        saranDokter: 'Jaga pola makan sehat, rutin berolahraga, pantau kadar gula darah, dan ikuti anjuran dokter.',
        sumber: '[Kementerian Kesehatan RI](https://upk.kemkes.go.id/new/mengenal-gejala-diabetes-melitus). Data prevalensi: Survei Kesehatan Indonesia (SKI) 2023.'
    },
    diare: {
        name: "Diare",
        keywords: ['diare', 'nyeri perut', 'mual', 'muntah', 'kram perut', 'feses cair', 'bab cair', 'dehidrasi', 'demam', 'lemas', 'mencret'],
        saranDokter: 'Pastikan tetap terhidrasi dengan minum oralit atau cairan elektrolit. Segera ke dokter jika diare parah atau disertai darah.',
        sumber: '[Kementerian Kesehatan RI](https://ayosehat.kemkes.go.id/penyakit/diare). Data prevalensi: Survei Kesehatan Indonesia (SKI) 2023.'
    },
    ginjalkronis: {
        name: "Penyakit Ginjal Kronis",
        keywords: ['kencing malam', 'bengkak kaki', 'bengkak mata', 'lelah', 'mual', 'muntah', 'nafsu makan turun', 'darah tinggi', 'darah urin', 'gatal', 'sakit kepala', 'sesak napas'],
        saranDokter: 'Jaga pola makan sehat, batasi asupan cairan sesuai anjuran dokter, dan lakukan pemeriksaan ginjal secara rutin jika berisiko.',
        sumber: '[Kementerian Kesehatan RI](https://ayosehat.kemkes.go.id/gejala-penyakit-ginjal-kronis-yang-harus-diwaspadai). Data prevalensi: Surveai Kesehatan Indonesia (SKI) 2023.'
    }
    // Tambahkan penyakit lain di sini
};

/**
 * Menghapus stopwords dari array token.
 * @param {string[]} tokens - Array token kata.
 * @returns {string[]} Array token setelah stopwords dihapus.
 */
function removeStopwords(tokens) {
    return tokens.filter(token => !stopwords.includes(token));
}

/**
 * Mendeteksi penyakit berdasarkan input teks gejala menggunakan sistem poin.
 * @param {string} input - Teks keluhan atau gejala yang dimasukkan pengguna.
 * @returns {object[]} Array objek hasil deteksi (hanya yang skor >= 3), diurutkan berdasarkan skor.
 */
function detectPenyakit(input) {
    // 1. Tokenisasi
    const originalTokens = tokenizer.tokenize(input.toLowerCase());
    console.log("\n--- Proses NLP Dimulai ---");
    console.log("[NLP] 1. Original Tokens:", originalTokens);

    // 2. Hapus Stopwords
    const filteredTokens = removeStopwords(originalTokens);
    console.log("[NLP] 2. Filtered Tokens (No Stopwords):", filteredTokens);

    // 3. Stemming
    const stemmedTokensSet = new Set(filteredTokens.map(token => PorterStemmer.stem(token)));
    console.log("[NLP] 3. Stemmed Tokens (Unique):", Array.from(stemmedTokensSet));

    const diseaseScores = {};
    const matchedSymptoms = {}; // Ini akan menyimpan gejala yang cocok untuk setiap penyakit

    // 4. Pencocokan & Skoring
    console.log("[NLP] 4. Matching Keywords and Scoring:");
    for (const [diseaseKey, diseaseData] of Object.entries(keywords)) {
        diseaseScores[diseaseKey] = 0;
        matchedSymptoms[diseaseKey] = new Set(); // Gunakan Set untuk menghindari duplikasi gejala
        let diseaseMatchedKeywordsLog = [];

        for (const keyword of diseaseData.keywords) {
            const keywordParts = keyword.split(' ');
            let matchFound = false;
            if (keywordParts.length === 1) {
                const stemmedKeyword = PorterStemmer.stem(keyword);
                if (stemmedTokensSet.has(stemmedKeyword)) { matchFound = true; }
            } else {
                const stemmedKeywordParts = keywordParts.map(part => PorterStemmer.stem(part));
                // Cek apakah semua bagian dari keyword multi-kata ada di stemmedTokensSet
                if (stemmedKeywordParts.every(part => stemmedTokensSet.has(part))) { matchFound = true; }
            }
            if (matchFound) {
                // Tambahkan keyword asli (bukan stemmed) ke matchedSymptoms
                if (!matchedSymptoms[diseaseKey].has(keyword)) {
                    diseaseScores[diseaseKey]++; // Hanya tambahkan skor jika gejala belum pernah dicocokkan untuk penyakit ini
                }
                matchedSymptoms[diseaseKey].add(keyword);
                diseaseMatchedKeywordsLog.push(keyword);
            }
        }
        if(diseaseScores[diseaseKey] > 0) {
            console.log(`   - ${diseaseData.name}: Score = ${diseaseScores[diseaseKey]}, Matched (internal set): [${Array.from(matchedSymptoms[diseaseKey]).join(', ')}]`);
        }
    }

    // 5. Format Hasil Akhir & Filter Skor
    const hasil = [];
    for (const diseaseKey in diseaseScores) {
        // Filter berdasarkan skor minimal 3
        if (diseaseScores[diseaseKey] >= 3) {
            hasil.push({
                penyakit: keywords[diseaseKey].name,
                skor: diseaseScores[diseaseKey],
                gejala: Array.from(matchedSymptoms[diseaseKey]), // Ambil gejala dari Set
                saranDokter: keywords[diseaseKey].saranDokter,
                saranObat: keywords[diseaseKey].saranObat, // Pastikan ini ada di objek keywords jika digunakan
                sumber: keywords[diseaseKey].sumber,
            });
        } else if (diseaseScores[diseaseKey] > 0) {
            // Log penyakit yang terdeteksi tapi skornya < 3 (opsional)
            console.log(`[NLP] Penyakit "${keywords[diseaseKey].name}" terdeteksi tetapi skor (${diseaseScores[diseaseKey]}) di bawah threshold (3).`);
        }
    }

    // 6. Urutkan Hasil
    hasil.sort((a, b) => b.skor - a.skor);

    // 7. Tangani Jika Tidak Ada Hasil yang Memenuhi Skor Minimal
    if (hasil.length === 0) {
        // Kumpulkan semua gejala unik yang cocok dari semua penyakit, bahkan jika skornya terlalu rendah
        const allMatchedSymptomsAcrossDiseases = new Set();
        for (const diseaseKey in matchedSymptoms) {
            matchedSymptoms[diseaseKey].forEach(symptom => allMatchedSymptomsAcrossDiseases.add(symptom));
        }
        const detectedSymptomsList = Array.from(allMatchedSymptomsAcrossDiseases);

        console.log("[NLP] Tidak ditemukan penyakit yang cocok dengan skor minimal 3.");
        console.log("[NLP] Namun, gejala terdeteksi (di bawah threshold):", detectedSymptomsList);

        // Kembalikan objek khusus yang menunjukkan tidak ada diagnosis yang kuat,
        // tetapi tetap menyertakan gejala yang terdeteksi (jika ada)
        return [{
            penyakit: 'Tidak Terdeteksi', // Penanda khusus untuk frontend
            skor: 0,
            gejala: detectedSymptomsList, // Ini adalah gejala yang terdeteksi, meskipun tidak mengarah ke diagnosis kuat
            saranDokter: 'Gejala yang Anda sebutkan mungkin kurang spesifik atau tidak cukup untuk mengarah pada satu diagnosis. Mohon berikan lebih banyak detail atau gejala lain.',
            saranObat: 'Tidak ada rekomendasi obat tanpa diagnosis dokter.',
            sumber: null
        }];
    }

    console.log("[NLP] Final Sorted Detection Results (Score >= 3):", JSON.stringify(hasil, null, 2));
    console.log("--- Proses NLP Selesai ---");
    return hasil;
}

// Ekspor fungsi dan keywords
module.exports = { detectPenyakit, keywords };

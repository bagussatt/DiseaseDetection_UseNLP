const { NlpManager } = require('node-nlp');

// Membuat instance NlpManager
const manager = new NlpManager({ languages: ['id'] });

// Definisikan kata kunci untuk setiap penyakit
const gejalaPenyakit = {
    flu: ['demam', 'batuk', 'pilek', 'lemas', 'sakit kepala'],
    diare: ['diare', 'nyeri perut', 'mual', 'kram perut'],
    hipertensi: ['tekanan darah tinggi', 'pusing', 'sakit kepala', 'lemas']
};

// Fungsi untuk mendeteksi gejala berdasarkan kata kunci
function deteksiGejala(teks) {
    const hasil = {
        penyakit: null,
        saranObat: null,
        saranDokter: null
    };

    // Cek gejala untuk setiap penyakit
    for (const [penyakit, gejala] of Object.entries(gejalaPenyakit)) {
        for (const kataKunci of gejala) {
            if (teks.toLowerCase().includes(kataKunci)) {
                hasil.penyakit = penyakit;
                break;
            }
        }
        if (hasil.penyakit) break; // Keluar dari loop jika penyakit sudah terdeteksi
    }

    // Memberikan saran berdasarkan penyakit yang terdeteksi
    if (hasil.penyakit === 'flu') {
        hasil.saranObat = 'Paracetamol untuk meredakan demam dan nyeri.';
        hasil.saranDokter = 'Istirahat yang cukup dan perbanyak minum air.';
    } else if (hasil.penyakit === 'diare') {
        hasil.saranObat = 'Loperamide untuk mengurangi frekuensi diare.';
        hasil.saranDokter = 'Pastikan untuk tetap terhidrasi.';
    } else if (hasil.penyakit === 'hipertensi') {
        hasil.saranObat = 'Obat antihipertensi sesuai resep dokter.';
        hasil.saranDokter = 'Periksa tekanan darah secara rutin.';
    }

    return hasil;
}

// Ekspor fungsi
module.exports = { deteksiGejala };

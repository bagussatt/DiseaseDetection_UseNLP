const { NlpManager } = require('node-nlp');

// Membuat instance NlpManager
const manager = new NlpManager({ languages: ['id'] });

// Menambahkan dokumen pelatihan untuk mendeteksi gejala
manager.addDocument('id', 'saya merasa demam dan batuk', 'gejala.flu');
manager.addDocument('id', 'saya mengalami diare', 'gejala.diare');
manager.addDocument('id', 'saya merasa pusing dan tekanan darah tinggi', 'gejala.hipertensi');
manager.addDocument('id', 'saya batuk dan pilek', 'gejala.flu');
manager.addDocument('id', 'saya lemas dan demam', 'gejala.flu');
manager.addDocument('id', 'saya nyeri perut dan diare', 'gejala.diare');
manager.addDocument('id', 'saya mual dan pusing', 'gejala.hipertensi');

// Melatih model
(async () => {
    await manager.train();
    manager.save();
})();

// Fungsi untuk mendeteksi gejala berdasarkan input
async function deteksiGejala(teks) {
    const response = await manager.process('id', teks);
    return response.intent; // Mengembalikan intent yang terdeteksi
}

// Ekspor fungsi
module.exports = { deteksiGejala };

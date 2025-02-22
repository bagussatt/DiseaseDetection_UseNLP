let viewer = document.getElementById("view");
let speech;
let recording = "";
let uniqueTexts = new Set(); // Menggunakan Set untuk menyimpan teks unik

function setup() {
    noCanvas(); // Tidak perlu kanvas untuk aplikasi ini

    // Inisialisasi pengenalan suara untuk bahasa Indonesia
    speech = new p5.SpeechRec("id-ID", getResult);

    // Event listener ketika rekaman suara dimulai
    speech.onStart = function() {
        viewer.innerHTML = "Merekam suara...";
    };

    // Event listener ketika rekaman suara berakhir
    speech.onEnd = reset;

    // Mulai mendengarkan dengan mode kontinu diaktifkan
    speech.start(true, true);
}

function getResult() {
    let text = speech.resultString.trim(); // Mengambil hasil pengenalan suara dan menghapus spasi di awal/akhir
    if (text && !uniqueTexts.has(text)) { // Cek jika teks tidak kosong dan belum ada di Set
        uniqueTexts.add(text); // Tambahkan teks ke Set
        recording += (recording ? " " : "") + text; // Tambahkan teks ke rekaman
        viewer.innerHTML = recording; // Tampilkan rekaman
    }
}

function reset() {
    // Mulai kembali mendengarkan secara kontinu
    speech.start(true, true);
}

// Event listener untuk tombol submit
document.getElementById("submitBtn").addEventListener("click", function() {
    if (recording) {
        sendToServer(recording); // Kirim data ke server
    } else {
        alert("Tidak ada teks yang direkam untuk dikirim.");
    }
});

function sendToServer(inputText) {
    fetch('/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `inputText=${encodeURIComponent(inputText)}` // Mengirim data sebagai URL encoded
    })
    .then(response => response.text())
    .then(data => {
        viewer.innerHTML = data; // Tampilkan hasil klasifikasi di elemen viewer
        recording = ""; // Reset rekaman setelah pengiriman
        uniqueTexts.clear(); // Kosongkan Set setelah pengiriman
    })
    .catch(error => {
        console.error('Error:', error);
        viewer.innerHTML = "Terjadi kesalahan saat mengirim data.";
    });
}

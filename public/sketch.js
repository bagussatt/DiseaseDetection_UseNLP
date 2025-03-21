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
document.getElementById("submitBtn").addEventListener("click", async function() {
    if (recording) {
        await sendToServer(recording); // Kirim data ke server
    } else {
        Swal.fire("Peringatan", "Tidak ada teks yang direkam untuk dikirim.", "warning");
    }
});

async function sendToServer(inputText) {
    try {
        viewer.innerHTML = "Mengirim data ke server..."; // Umpan balik saat mengirim
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `inputText=${encodeURIComponent(inputText)}` // Mengirim data sebagai URL encoded
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.text();
        viewer.innerHTML = data; // Tampilkan hasil klasifikasi di elemen viewer

        // Menampilkan hasil dengan SweetAlert2
        Swal.fire({
            title: "Hasil Deteksi",
            html: data, // Menampilkan hasil deteksi dalam popup
            icon: "success",
            confirmButtonText: "Kembali ke Home"
        }).then(() => {
            window.location.href = "index.html"; // Redirect ke index.html
            setTimeout(() => {
                location.reload(); // Refresh halaman setelah pindah ke index.html
            }, 500); // Beri jeda untuk memastikan halaman sudah termuat sebelum refresh
        });
        

        resetRecording(); // Reset rekaman setelah pengiriman
    } catch (error) {
        console.error('Error:', error);
        Swal.fire("Kesalahan", "Terjadi kesalahan saat mengirim data.", "error");
    }
}

function resetRecording() {
    recording = ""; // Reset rekaman
    uniqueTexts.clear(); // Kosongkan Set setelah pengiriman
}

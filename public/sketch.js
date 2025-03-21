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

function saveAsPDF(content, print = false) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.text("Hasil Deteksi Penyakit", 20, 20);
    doc.setFont("helvetica", "normal");

    
    let tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    let cleanText = tempDiv.textContent || tempDiv.innerText || "";

    cleanText = cleanText.replace(/alert\(.*?\);/g, "").trim();
    cleanText = cleanText.replace(/Obat yang disarankan:\s+/g, ""); // Hapus label duplikat
    cleanText = cleanText.replace(/Saran:\s+/g, ""); // Hapus kata "Saran:" berulang

   
    let formattedText = cleanText
        .replace(/Penyakit terdeteksi:/g, "\nPenyakit terdeteksi: ")
        .replace(/Saran Obat:/g, "\nSaran Obat: ")
        .replace(/Saran Dokter:/g, "\nSaran Dokter: ")
        .replace(/Gejala yang muncul:/g, "\nGejala yang muncul: ")
        .replace(/Waktu Deteksi:/g, "\nWaktu Deteksi: ");

    let splitText = doc.splitTextToSize(formattedText, 180);
    doc.text(splitText, 20, 40);

    if (print) {
        doc.autoPrint(); // Cetak otomatis
        window.open(doc.output("bloburl"), "_blank");
    } else {
        doc.save("Hasil_Deteksi.pdf"); // Simpan PDF
    }
}


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

            // 🔹 Bersihkan & Format Hasil Deteksi agar lebih rapi
            let formattedData = data
            .replace("Obat yang disarankan:", "") 
            .replace("Saran:", "")
            .replace(/Penyakit terdeteksi:/g, "<b>Penyakit terdeteksi:</b> ")
            .replace(/Saran Obat:/g, "<b>Saran Obat:</b> ")
            .replace(/Saran Dokter:/g, "<b>Saran Dokter:</b> ")
            .replace(/Gejala yang muncul:/g, "<b>Gejala yang muncul:</b> ")
            .replace(/Waktu Deteksi:/g, "<b>Waktu Deteksi:</b> ")
            .replace(/\n/g, "<br>"); // Ganti newline dengan <br> agar HTML terformat dengan baik

        // 🔹 Tampilkan notifikasi dengan SweetAlert2
        Swal.fire({
            title: "Hasil Deteksi",
            html: `<div style="text-align: left;">${formattedData}</div>`, // Menjadikan teks rata kiri
            icon: "success",
            showCancelButton: true,
            confirmButtonText: "Kembali ke Home",
            cancelButtonText: "Simpan sebagai PDF"
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = "index.html"; // Redirect ke index.html
                setTimeout(() => {
                    location.reload(); // Refresh halaman setelah pindah ke index.html
                }, 500);
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                saveAsPDF(data); // Simpan sebagai PDF
            }
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

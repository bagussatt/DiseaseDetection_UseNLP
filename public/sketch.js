let viewer = document.getElementById("view");
let speech;
let recording = "";
let finalTranscript = "";
let isRecordingActive = false;
let storedSentence = ""; // Variabel untuk menyimpan kalimat yang lebih dari empat kata
let interimTimeoutId;
const interimDebounceTime = 200; // Waktu debounce untuk hasil sementara (200ms)

function setup() {
    noCanvas();

    speech = new p5.SpeechRec("id-ID", getResult);
    speech.continuous = true;
    speech.interimResults = true;

    speech.onStart = function() {
        viewer.innerHTML = "Merekam suara...";
        isRecordingActive = true;
        finalTranscript = "";
        storedSentence = "";
        console.log("Mulai merekam");
    };

    speech.onResult = function() {
        if (isRecordingActive) {
            let currentResult = speech.resultString.trim();
            let wordCount = currentResult.split(/\s+/).filter(Boolean).length;

            clearTimeout(interimTimeoutId);
            interimTimeoutId = setTimeout(() => {
                if (wordCount > 4) {
                    storedSentence = (storedSentence ? storedSentence + " " : "") + currentResult;
                    viewer.innerHTML = storedSentence + " (sementara)";
                    console.log("Kalimat disimpan (debounce):", storedSentence);
                }
            }, interimDebounceTime);

            if (speech.final) {
                finalTranscript += (finalTranscript ? " " : "") + currentResult;
                console.log("Hasil final (per bagian):", currentResult);
            }
        }
    };

    speech.onEnd = function() {
        if (isRecordingActive) {
            console.log("Perekaman sementara berhenti");
        }
    };

    speech.start();
    console.log("speech.start() dipanggil");
}

function getResult() {}

function reset() {
    isRecordingActive = false;
    recording = "";
    finalTranscript = "";
    storedSentence = "";
    viewer.innerHTML = "";
    speech.stop();
    console.log("Perekaman direset dan dihentikan");
}

document.getElementById("submitBtn").addEventListener("click", async function() {
        isRecordingActive = false;
        speech.stop();
        recording = storedSentence.trim(); // Kirim storedSentence, bukan finalTranscript
        viewer.innerHTML = recording; // Tampilkan storedSentence sebagai hasil final
        if (recording) {
            console.log("Data yang akan dikirim (dari submit):", recording);
            await sendToServer(recording); // Panggil fungsi sendToServer dengan storedSentence
        } else {
            Swal.fire("Peringatan", "Tidak ada teks yang direkam untuk dikirim.", "warning");
        }
});

function saveAsPDF(content, print = false) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.text("Hasil Deteksi Penyakit", 10, 10);
    doc.setFont("helvetica", "normal");

    
    let tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    let cleanText = tempDiv.textContent || tempDiv.innerText || "";

    cleanText = cleanText.replace(/alert\(.*?\);/g, "").trim();
    cleanText = cleanText.replace(/Obat yang disarankan:\s+/g, ""); // Hapus label duplikat
    cleanText = cleanText.replace(/Saran:\s+/g, ""); // Hapus kata "Saran:" berulang

   
    let formattedText = cleanText
        .replace(/Penyakit terdeteksi:/g, "\nPenyakit terdeteksi: ")
        .replace(/Gejala yang muncul:/g, "\nGejala yang muncul: ")
        .replace(/Saran Dokter:/g, "\nSaran Dokter: ")
        .replace(/Saran Obat:/g, "\nSaran Obat: ")     
        // .replace(/Waktu Deteksi:/g, "\nWaktu Deteksi: ");

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
            .replace(/Penyakit terdeteksi:/g, "<b>Penyakit terdeteksi:</b> ")
            .replace(/Gejala yang muncul:/g, "<b>Gejala yang muncul:</b> ")
            .replace(/Saran Dokter:/g, "<b>Saran Dokter:</b> ")
            .replace(/Saran Obat:/g, "<b>Saran Obat:</b> ")
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
                window.location.href = "index.html"; 
                saveAsPDF(data); // Simpan sebagai PDF
            }
        });

        // resetRecording(); // Reset rekaman setelah pengiriman
    } catch (error) {
        console.error('Error:', error);
        Swal.fire("Kesalahan", "Terjadi kesalahan saat mengirim data.", "error");
    }
}

// function resetRecording() {
//     recording = ""; // Reset rekaman
//     uniqueTexts.clear(); // Kosongkan Set setelah pengiriman
// }

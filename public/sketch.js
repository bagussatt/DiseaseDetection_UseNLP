let speechRec;
let speechSynth;
let transcriptArea;
let listenButton;
let statusDisplay;
let speakingIndicator;
// let reservationButton; // Tombol reservasi dihapus/disembunyikan total di HTML
let doctorImageElement;
let isListening = false; // Status apakah STT aktif mendengarkan
let isSpeaking = false; // Status apakah bot sedang berbicara
let lastDetectionResult = null; // Menyimpan hasil deteksi mentah dari backend
let lastDetectedDisease = null; // Menyimpan nama penyakit terdeteksi (untuk display di popup)
let greetingSpoken = false;
let statusTimeout;
let consentGiven = false;
let isProcessingSpeech = false; // Flag untuk mencegah pemrosesan berulang saat continuous


// --- Fungsi Setup p5.js ---
function setup() {
    noCanvas();
    transcriptArea = select('#transcript-area');
    listenButton = select('#listenButton');
    statusDisplay = select('#status');
    speakingIndicator = select('#speaking-indicator');
    // reservationButton = select('#showMapBtn'); // Tidak digunakan lagi sebagai tombol interaktif
    doctorImageElement = select('#doctor-image');

    // Periksa elemen UI esensial, kecuali tombol reservasi yang akan dihapus/disembunyikan
    if (!transcriptArea || !listenButton || !statusDisplay || !speakingIndicator || !doctorImageElement) {
        console.error("FATAL ERROR: Essential UI element missing! Check HTML IDs.");
        alert("Kesalahan kritis: Komponen antarmuka penting hilang.");
        return;
    }
    console.log("All essential UI elements selected successfully.");

    // Inisialisasi Text-to-Speech (TTS)
    // TTS tetap diinisialisasi untuk suara bot respon diagnosis dan error, hanya instruksi reservasi yang teks
    if (typeof p5 !== 'undefined' && p5.Speech) {
        try {
            speechSynth = new p5.Speech();
            speechSynth.onLoad = voiceReady; // <-- Panggil voiceReady saat TTS siap
            speechSynth.onStart = botStartedSpeaking;
            speechSynth.onEnd = botFinishedSpeaking;
            speechSynth.setLang('id-ID');
            console.log("p5.Speech (TTS) initialized. Waiting for voices to load...");
        } catch (ttsError) {
            console.error("Error initializing p5.Speech (TTS):", ttsError);
            speechSynth = null;
            if (statusDisplay) updateStatus("Error: Gagal memuat fitur suara bot.", 5000);
        }
    } else {
        console.warn("p5.Speech library not found. TTS disabled.");
        speechSynth = null;
        if (statusDisplay) updateStatus("Peringatan: Fitur suara bot tidak tersedia.", 5000);
    }

    // Inisialisasi Speech-to-Text (STT)
    if (typeof p5 !== 'undefined' && p5.SpeechRec) {
        try {
            initializeSpeechRec();
            console.log("p5.SpeechRec (STT) initialized.");
            if (listenButton) {
                listenButton.removeAttribute('disabled');
                listenButton.mousePressed(toggleListening);
                console.log("Listen button enabled and listener attached.");
            }
        } catch (sttError) {
            console.error("Error during p5.SpeechRec initialization:", sttError);
            if (listenButton) listenButton.attribute('disabled', '');
            if (statusDisplay) updateStatus("Error: Gagal memuat fitur pengenal suara.", 5000);
        }
    } else {
        console.warn("p5.SpeechRec library not found. STT disabled.");
        if (listenButton) listenButton.attribute('disabled', '');
        if (statusDisplay) updateStatus("Peringatan: Fitur pengenal suara tidak tersedia.", 5000);
    }

    // Tombol Reservasi di HTML (#showMapBtn) akan disembunyikan via CSS atau dihapus
    // Listener mousePressed untuk tombol reservasi dihapus dari sini

    console.log("Initial message will be added via voiceReady.");
    updateStatus('');
    console.log("p5.js setup complete.");
}

// --- Fungsi Inisialisasi SpeechRec ---
function initializeSpeechRec() {
    console.log("Attempting to initialize Speech Recognition...");
    try {
        speechRec = new p5.SpeechRec('id-ID', gotSpeech);
        // Set continuous ke true agar bot bisa terus mendengarkan perintah setelah berbicara
        speechRec.continuous = true;
        speechRec.interimResults = false; // Kita hanya butuh hasil akhir
        speechRec.onError = speechError;
        // speechRec.onEnd akan dipanggil saat stop() manual atau error fatal.
        speechRec.onEnd = speechEnd; // Pastikan onEnd tetap terpasang
        console.log("Speech Recognition configured.");
    } catch (e) {
        console.error("FATAL ERROR during new p5.SpeechRec():", e);
        speechRec = null;
        throw e;
    }
}

// --- Fungsi Callback dan Helper ---

function voiceReady() {
    // Fungsi ini dipanggil SETELAH library TTS siap digunakan
    console.log("TTS engine ready (voiceReady callback).");
    // Coba ucapkan greeting jika belum pernah dan TTS siap
    // Greeting awal memberitahu cara memulai
    if (!greetingSpoken && speechSynth && !isSpeaking) {
        const greetingMsg = 'Halo Saya Vira! Saya siap membantu. Klik tombol "Mulai Bicara" lalu sebutkan gejala Anda.';
        console.log("Attempting to speak initial greeting...");
        addMessageToTranscript('Bot', greetingMsg); // Tambahkan ke transkrip dulu
        speakText(greetingMsg); // Baru ucapkan
        greetingSpoken = true; // Tandai sudah diucapkan
    } else {
         console.log("Initial greeting condition not met or already spoken.");
         if(greetingSpoken) console.log("Reason: Greeting already spoken.");
         if(!speechSynth) console.log("Reason: speechSynth is null.");
         if(isSpeaking) console.log("Reason: Bot is currently speaking.");
    }
}


function botStartedSpeaking() {
    isSpeaking = true;
    if (speakingIndicator) speakingIndicator.style('display', 'flex');
    // Tombol listen tetap aktif di mode continuous, hanya tambahkan class visual jika perlu
    // if (listenButton) listenButton.attribute('disabled', ''); // Dihapus
    updateStatus('Bot sedang berbicara...');
    if (doctorImageElement) doctorImageElement.addClass('bot-speaking');
}

function botFinishedSpeaking() {
    console.log("Bot finished speaking (TTS onEnd callback).");
    isSpeaking = false;
    if (speakingIndicator) speakingIndicator.style('display', 'none');
    updateStatus(''); // Hapus status "Bot sedang berbicara"
    if (doctorImageElement) doctorImageElement.removeClass('bot-speaking');

    // Di mode continuous, STT tetap mendengarkan setelah bot selesai berbicara.
    // Tombol listen seharusnya tetap aktif/beranimasi (jika isListening true).
    // Tidak perlu mereset UI tombol listen di sini.
    console.log("Bot finished speaking. STT remains listening (continuous mode).");
    // Pastikan tombol listen enabled setelah bot selesai bicara, kecuali jika ada error STT fatal
    if (listenButton && !isListening && speechRec) { // Cek speechRec agar tidak error jika inisialisasi gagal
        resetListenButtonUI(true); // Aktifkan kembali tombol listen jika STT tidak listening (misal setelah stop manual sebelumnya)
    }
}

// --- Fungsi Inti Pengenalan Suara ---

function startListeningProcedure() {
    console.log("Attempting to start listening procedure...");
    try {
        if (!speechRec) {
            console.error("Cannot start listening: speechRec not initialized.");
            updateStatus('Error: Pengenal suara belum siap.', 3000);
            return;
        }
        // Cek apakah sudah listening sebelum memanggil start()
        if (!isListening) {
             speechRec.start();
             isListening = true;
             console.log("speechRec.start() called.");
             if (listenButton) {
                 listenButton.html('<i class="fas fa-stop text-xl"></i><span class="text-base">Berhenti</span>');
                 listenButton.addClass('listening', 'recording-animation');
             }
             updateStatus('Mendengarkan...');
        } else {
             console.log("Speech Recognition is already listening.");
             updateStatus('Mendengarkan...'); // Pastikan status tetap "Mendengarkan"
             // Pastikan kelas animasi ditambahkan jika tombol diklik ulang saat sudah listening
             if (listenButton) {
                listenButton.html('<i class="fas fa-stop text-xl"></i><span class="text-base">Berhenti</span>');
                listenButton.addClass('listening', 'recording-animation');
             }
        }

    } catch (err) {
        console.error("Error starting speech recognition:", err);
        updateStatus('Gagal memulai pendengaran.', 3000);
        isListening = false; // Set false jika gagal memulai
        resetListenButtonUI(true); // Reset UI dan aktifkan tombol jika gagal
    }
}

function toggleListening() {
    console.log("toggleListening called...");
    if (isSpeaking) {
        console.warn("toggleListening blocked: Bot is speaking.");
        updateStatus('Harap tunggu bot selesai berbicara.', 2000);
        return;
    }
     if (!speechRec) {
        console.error("toggleListening blocked: Speech Recognition not initialized!");
        updateStatus('Error: Fitur rekam suara tidak siap.', 3000);
        return;
    }

    if (!isListening) {
        // CEK PERSETUJUAN DATA AWAL
        if (consentGiven) {
            console.log("Consent already given. Starting listening procedure.");
            startListeningProcedure();
        } else {
            console.log("Consent not given yet. Showing initial consent popup.");
            Swal.fire({
                title: 'Persetujuan Penggunaan Data Suara',
                html: `<p>Saya mengerti dan menyetujui bahwa suara saya akan direkam dan diproses untuk tujuan analisis.</p>
                        <input type="checkbox" id="persetujuan-data-check" required>
                        <label for="persetujuan-data-check"> Saya Setuju</label>`, // Konten popup
                icon: 'info',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#aaa',
                confirmButtonText: 'Setuju & Mulai Bicara',
                cancelButtonText: 'Batal',
                allowOutsideClick: false,
                preConfirm: () => {
                    const checkbox = document.getElementById('persetujuan-data-check');
                    if (!checkbox) {
                         console.error("Elemen #persetujuan-data-check tidak ditemukan dalam HTML popup!");
                         Swal.showValidationMessage('Terjadi kesalahan internal. Elemen persetujuan tidak ditemukan.');
                         return false;
                    }
                    const isChecked = checkbox.checked;
                    if (!isChecked) {
                        Swal.showValidationMessage('Anda harus menyetujui pernyataan untuk melanjutkan.');
                        return false;
                    }
                    return true;
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    console.log("User consented to initial data usage.");
                    consentGiven = true;
                    startListeningProcedure();
                } else {
                    console.log("User did not consent to initial data usage.");
                    updateStatus('Persetujuan diperlukan untuk memulai analisis.', 3000);
                }
            });
        }
    } else {
        // --- BERHENTI MENDENGARKAN (MANUAL) ---
        console.log("Attempting to stop listening manually...");
        try {
            if (speechRec) {
                 speechRec.stop();
                 // FIX: Reset UI dan status isListening SEGERa setelah memanggil stop()
                 resetListenButtonUI(true); // Reset UI dan aktifkan tombol
                 isListening = false; // Set status listening ke false
                 console.log("Manual stop requested. UI reset and isListening set to false.");
            } else {
                console.warn("Attempted to stop, but speechRec is null.");
                isListening = false; // Set false jika speechRec null
                speechEnd(); // Panggil speechEnd sebagai fallback
                return;
            }
            // speechEnd mungkin masih dipanggil oleh API setelah stop() selesai,
            // tapi UI sudah direset di sini.
            updateStatus('Menghentikan pendengaran...');
        } catch (e) {
            console.error("Error stopping speech recognition:", e);
            updateStatus('Gagal menghentikan pendengaran.', 3000);
            isListening = false; // Set false jika error saat stop
            speechEnd(); // Panggil speechEnd jika error saat stop
        }
    }
}

function gotSpeech() {
    console.log("gotSpeech callback triggered. isProcessingSpeech:", isProcessingSpeech);

    // Gunakan flag isProcessingSpeech untuk mencegah pemrosesan ganda di mode continuous
    if (isProcessingSpeech) {
        console.log("Already processing speech, ignoring current result.");
        return;
    }

    if (speechRec && speechRec.resultValue && speechRec.resultString) {
        let userInput = speechRec.resultString.toLowerCase().trim(); // Ubah ke lowercase & trim

        // Abaikan hasil yang sangat pendek atau kosong di mode continuous
        if (userInput.length < 2) {
             console.log("Ignoring short or empty speech result:", userInput);
             return;
        }

        isProcessingSpeech = true; // Set flag sedang memproses
        addMessageToTranscript('User', userInput);
        console.log(`User spoke: "${userInput}"`);

        // --- LOGIKA DETEKSI PERINTAH SUARA ---
        // Deteksi perintah "reservasi" atau "saya ingin reservasi"
        if (userInput.includes('reservasi')) {
            console.log("User command: Reservasi detected.");
            handleVoiceReservationCommand(); // Panggil fungsi penanganan reservasi suara
        } else {
            // Jika bukan perintah reservasi, lanjutkan ke analisis gejala
            console.log("User input is not a reservation command. Proceeding to symptom analysis.");
            sendToServerForDetection(userInput);
        }

    } else {
        console.warn("gotSpeech callback triggered but no valid result found.");
        // Di mode continuous, ini sering terjadi. Jangan tampilkan pesan error ke user.
    }
    // Flag isProcessingSpeech direset di finally block sendToServerForDetection atau setelah SweetAlert2 ditutup
}

// --- Fungsi Penanganan Perintah Suara Reservasi ---
function handleVoiceReservationCommand() {
    console.log("handleVoiceReservationCommand called.");

    // Cek apakah ada hasil deteksi yang valid
    if (!lastDetectionResult || lastDetectionResult === "NO_VALID_DIAGNOSIS") {
        console.warn("Voice command 'reservasi' received, but no valid diagnosis data available. Showing confirmation popup.");
        // Tampilkan popup konfirmasi untuk reservasi tanpa diagnosis
        showNoDiagnosisReservationPopup(); // Panggil fungsi popup baru
        // Flag isProcessingSpeech akan direset setelah SweetAlert2 ditutup
    } else {
        console.log("Valid diagnosis data available. Proceeding with reservation confirmation popup.");
        // Panggil logika konfirmasi reservasi dengan diagnosis
        showReservationConfirmationPopup(lastDetectionResult, lastDetectedDisease);
        // Flag isProcessingSpeech akan direset setelah SweetAlert2 ditutup
    }
}

// --- Fungsi untuk Menampilkan Popup Konfirmasi Reservasi TANPA Diagnosis ---
function showNoDiagnosisReservationPopup() {
    console.log("Showing no-diagnosis reservation confirmation popup...");

    Swal.fire({
        title: 'Reservasi Tanpa Diagnosis',
        html: `
            <p>Anda belum melakukan konsultasi atau diagnosis belum terdeteksi. Apakah Anda yakin ingin melanjutkan langsung ke halaman reservasi?</p>
             <div class="form-check text-start mt-3 mb-2">
                <input class="form-check-input" type="checkbox" value="" id="konfirmasi-reservasi-check-no-diag">
                <label class="form-check-label" for="konfirmasi-reservasi-check-no-diag">
                    Saya setuju untuk melanjutkan tanpa data diagnosis spesifik.
                </label>
            </div>
        `,
        icon: 'warning', // Ubah ikon menjadi warning
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Lanjutkan Reservasi',
        cancelButtonText: 'Batal',
        focusConfirm: false,
        allowOutsideClick: false,
        preConfirm: () => {
             const checkbox = document.getElementById('konfirmasi-reservasi-check-no-diag');
             if (!checkbox) {
                  console.error("Elemen #konfirmasi-reservasi-check-no-diag tidak ditemukan dalam HTML popup!");
                  Swal.showValidationMessage('Terjadi kesalahan internal. Elemen persetujuan tidak ditemukan.');
                  return false;
             }
             const isChecked = checkbox.checked;
             if (!isChecked) {
                 Swal.showValidationMessage('Anda harus menyetujui pernyataan untuk melanjutkan.');
                 return false;
             }
             return true;
         }
    }).then((result) => {
        if (result.isConfirmed) {
            console.log("User confirmed reservation without diagnosis. Proceeding to redirect...");
            // Redirect ke halaman reservasi dengan diagnosis default/kosong
            goToReservationPage("Reservasi tanpa diagnosis spesifik."); // Kirim string default
        } else {
            console.log("User cancelled reservation without diagnosis.");
            // Respon Batal HANYA TEKS
            const cancelMsg = 'Baik, permintaan reservasi dibatalkan.';
            addMessageToTranscript('Bot', cancelMsg);
            // speakText(cancelMsg); // Hapus suara
        }
        isProcessingSpeech = false; // Reset flag setelah popup ditutup
    });
}


// --- Fungsi untuk Menampilkan Popup Konfirmasi Reservasi DENGAN Diagnosis ---
function showReservationConfirmationPopup(diagnosisData, penyakitDisplay) {
    console.log("Showing reservation confirmation popup (with diagnosis)...");
     const displayPenyakit = penyakitDisplay || "kondisi ini";

    Swal.fire({
        title: 'Konfirmasi Reservasi',
        html: `
            <p>Apakah Anda yakin ingin melanjutkan ke halaman reservasi untuk <b>${displayPenyakit}</b> berdasarkan analisis gejala?</p>
            <div class="form-check text-start mt-3 mb-2">
                <input class="form-check-input" type="checkbox" value="" id="konfirmasi-reservasi-check">
                <label class="form-check-label" for="konfirmasi-reservasi-check">
                    Saya setuju data hasil analisis ini dikirimkan untuk membantu proses reservasi.
                </label>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Lanjutkan Reservasi',
        cancelButtonText: 'Batal',
        focusConfirm: false,
        allowOutsideClick: false, // Mencegah menutup popup dengan klik di luar
        preConfirm: () => {
            const checkbox = document.getElementById('konfirmasi-reservasi-check');
            if (!checkbox) {
                 console.error("Elemen #konfirmasi-reservasi-check tidak ditemukan dalam HTML popup!");
                 Swal.showValidationMessage('Terjadi kesalahan internal. Elemen persetujuan tidak ditemukan.');
                 return false;
            }
            const isChecked = checkbox.checked;
            if (!isChecked) {
                Swal.showValidationMessage('Anda harus menyetujui pengiriman data untuk melanjutkan.');
                return false;
            }
            return true;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            console.log("User confirmed reservation data sending. Proceeding to redirect...");
            goToReservationPage(diagnosisData);
        } else {
            console.log("User cancelled reservation data sending.");
            // Respon Batal HANYA TEKS
            const cancelMsg = 'Baik, permintaan reservasi dibatalkan.';
            addMessageToTranscript('Bot', cancelMsg);
            // speakText(cancelMsg); // Hapus suara
        }
        isProcessingSpeech = false; // Reset flag setelah popup ditutup
    });
}


// Kirim teks ke server backend untuk diproses
async function sendToServerForDetection(inputText) {
    console.log(`Sending text to /api/process: "${inputText}"`);
    updateStatus('Menganalisis gejala...');
    lastDetectionResult = null;
    lastDetectedDisease = null;

    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
            body: `inputText=${encodeURIComponent(inputText)}`
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} ${response.statusText}. Detail: ${errorText}`);
        }
        const data = await response.json();
        if (data && data.hasOwnProperty('hasilDeteksi')) {
            displayDetectionResults(data.hasilDeteksi);
        } else { throw new Error("Format respon server tidak sesuai ('hasilDeteksi' missing)."); }
    } catch (error) {
        console.error("Error during sendToServerForDetection:", error);
        const errorMsg = `Maaf, gagal menghubungi server analisis: ${error.message}`;
        updateStatus('Gagal menganalisis gejala.', 4000);
        addMessageToTranscript('Bot', errorMsg); // Tampilkan error di chat
        lastDetectionResult = null;
        lastDetectedDisease = null;
        speakText(errorMsg); // Ucapkan error (ini respon error, tetap bersuara)
    } finally {
        console.log("sendToServerForDetection finished.");
        isProcessingSpeech = false; // Reset flag setelah selesai memproses dari backend
    }
}

// --- Fungsi displayDetectionResults ---
function displayDetectionResults(hasilDeteksiString) {
    console.log("Displaying detection results. Raw input:", hasilDeteksiString);
    lastDetectionResult = "NO_VALID_DIAGNOSIS"; // Default
    lastDetectedDisease = null; // Default

    const noDetectionKeywords = ['tidak ada penyakit', 'belum dapat mendeteksi', 'tidak ditemukan', 'tidak terdeteksi', 'gejala tidak cukup'];
    // FIX: Corrected typo hasilDetksiString to hasilDeteksiString
    const isNoDetection = !hasilDeteksiString || hasilDeteksiString.trim() === '' || noDetectionKeywords.some(keyword => hasilDeteksiString.toLowerCase().includes(keyword));

    let speakPenyakit = "Tidak diketahui";
    let speakGejala = "N/A";
    let foundDiagnosis = false;

    if (isNoDetection) {
        console.log("No specific disease detected.");
        const noDetectChatMsg = 'Maaf, berdasarkan gejala Anda, belum dapat dideteksi penyakit spesifik. Silakan coba ulangi dengan gejala yang lebih jelas atau berbeda.';
        const noDetectSpeakMsg = 'Maaf, berdasarkan gejala Anda, belum dapat dideteksi penyakit spesifik. Silakan coba ulangi dengan gejala yang lebih jelas atau berbeda.';

        addMessageToTranscript('Bot', noDetectChatMsg); // Tambah pesan ke chat
        lastDetectionResult = "NO_VALID_DIAGNOSIS";
        lastDetectedDisease = null;
        speakText(noDetectSpeakMsg); // Ucapkan pesan gagal deteksi (ini respon deteksi gagal, tetap bersuara)
        // Tambahkan pesan teks instruksi reservasi meskipun deteksi gagal
        addReservationInstructionText(); // <-- Tambahkan instruksi teks di sini
        return; // Hentikan eksekusi fungsi di sini
    }

    // Jika terdeteksi (lanjutan dari sebelumnya)
    console.log("Potential disease detected.");
    lastDetectionResult = hasilDeteksiString.trim(); // Simpan hasil MENTAH

    const lines = lastDetectionResult.split('\n');
    let formattedHTML = '<span class="sender-label">[Bot]:</span> <strong>Hasil Analisis:</strong><ul class="list-disc list-inside ml-4 mt-1">';
    let currentPenyakit = "Tidak diketahui";
    let currentGejala = "N/A";
    let currentFoundDiagnosis = false;

    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
            const label = parts[0].trim();
            const value = parts.slice(1).join(':').trim();
            const escapedLabel = label.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const escapedValue = value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            formattedHTML += `<li class="mb-1"><strong class="font-medium">${escapedLabel}:</strong> ${escapedValue}</li>`;
            const labelLower = label.toLowerCase();
            if (labelLower.includes('penyakit terdeteksi') || labelLower.includes('kemungkinan penyakit')) {
                currentPenyakit = value; currentFoundDiagnosis = true;
                lastDetectedDisease = value;
            } else if (labelLower.includes('gejala yang muncul') || labelLower.includes('gejala cocok')) {
                currentGejala = value;
            }
        } else if (line.trim()) {
            const escapedLine = line.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
            formattedHTML += `<li class="mb-1">${escapedLine}</li>`;
            if (!currentFoundDiagnosis && (line.trim().toLowerCase().includes('penyakit:') || line.trim().toLowerCase().includes('kemungkinan:'))) {
                const value = line.trim().split(':').slice(1).join(':').trim() || line.trim();
                if(value){
                    currentPenyakit = value; currentFoundDiagnosis = true;
                    lastDetectedDisease = value;
                }
            }
        }
    });
    formattedHTML += '</ul>';

    speakPenyakit = currentPenyakit;
    speakGejala = currentGejala;
    foundDiagnosis = currentFoundDiagnosis;

    // Tampilkan hasil format HTML di transkrip
    let resultDiv = createDiv(formattedHTML);
    resultDiv.addClass('bot-transcript-bubble detection-result');
    if (transcriptArea) {
        transcriptArea.child(resultDiv);
        try { transcriptArea.elt.scrollTo({ top: transcriptArea.elt.scrollHeight, behavior: 'smooth' }); } catch(e){}
    }

    // Ucapkan ringkasan hasil (tetap bersuara)
    speakDetectionSummary(speakPenyakit, speakGejala, foundDiagnosis);

    // Tambahkan pesan teks instruksi untuk reservasi suara (HANYA TEKS)
    addReservationInstructionText();
}

// --- Fungsi speakDetectionSummary (Ringkasan Hasil, Tetap Bersuara) ---
function speakDetectionSummary(penyakit, gejala, diagnosisDitemukan) {
     let textToSpeak = '';
    const validPenyakit = diagnosisDitemukan && penyakit && penyakit !== "Tidak diketahui" && penyakit.trim() !== '';

    if (validPenyakit) {
        textToSpeak = `Baik, berdasarkan analisis, kemungkinan penyakit Anda adalah ${penyakit}. `;
        // Gejala tidak perlu diucapkan lagi di sini, sudah ada di chat bubble
        // if (gejala && gejala !== "N/A" && gejala.toLowerCase() !== 'n/a' && gejala.trim() !== '') {
        //    ;
        // }
        // Instruksi reservasi TIDAK diucapkan di sini
    } else {
        // Ini terjadi jika diagnosis ditemukan tapi tidak valid (misal, nama penyakit kosong)
        textToSpeak = "Analisis selesai. Disarankan untuk konsultasi lebih lanjut dengan dokter.";
        // lastDetectionResult & lastDetectedDisease sudah di set di displayDetectionResults
        // Tidak ada instruksi reservasi jika tidak ada diagnosis valid
    }
    console.log("Bot speaking diagnosis summary:", textToSpeak);
    speakText(textToSpeak); // Ucapkan ringkasan diagnosis
}

// --- Fungsi addReservationInstructionText (Instruksi Reservasi, HANYA TEKS) ---
function addReservationInstructionText() {
     console.log("Adding reservation instruction text to transcript.");
     // Pesan instruksi yang Anda inginkan
     const instructionMsg = 'Jika Anda ingin melanjutkan ke reservasi, silakan katakan "reservasi".';
     addMessageToTranscript('Bot', instructionMsg); // Tambahkan pesan ke chat (teks saja)
}


// --- Fungsi inti untuk Text-to-Speech (TTS) ---
function speakText(textToSpeak) {
    console.log(`Attempting to speak: "${textToSpeak}"`);
     if (!textToSpeak) {
        console.warn("TTS: speakText called with empty text.");
        botFinishedSpeaking(); // Pastikan botFinishedSpeaking dipanggil meskipun teks kosong
        return;
    }
    if (speechSynth && typeof speechSynth.speak === 'function') {
        try {
            speechSynth.speak(textToSpeak);
            console.log("speechSynth.speak() called.");
        } catch (e) {
            console.error("Error triggering speechSynth.speak():", e);
            botFinishedSpeaking(); // Pastikan botFinishedSpeaking dipanggil jika ada error
        }
    } else {
        console.warn("TTS not available. Cannot speak.");
        botFinishedSpeaking(); // Pastikan botFinishedSpeaking dipanggil jika TTS tidak tersedia
    }
}

// --- Fungsi Redirect ke Halaman Reservasi (Dipanggil SETELAH konfirmasi) ---
function goToReservationPage(diagnosisData) {
    console.log("Redirecting function called...");
    let diagnosisParam = "";
    // Jika diagnosisData adalah string default "Reservasi tanpa diagnosis spesifik.", kirim itu.
    // Jika diagnosisData adalah hasil deteksi mentah, encode itu.
    if (diagnosisData && diagnosisData !== "NO_VALID_DIAGNOSIS") {
        diagnosisParam = encodeURIComponent(diagnosisData);
        console.log("Diagnosis data encoded to send:", diagnosisParam);
    } else {
        console.warn("goToReservationPage called with invalid or no diagnosis data.");
        diagnosisParam = encodeURIComponent("Gejala tidak dispesifikasi atau tidak valid.");
    }
    const targetPage = 'reservasi.html';
    const reservationUrl = `${targetPage}?diagnosis=${diagnosisParam}`;
    console.log("Redirecting to:", reservationUrl);
    window.location.href = reservationUrl;
}

// --- Fungsi addMessageToTranscript ---
function addMessageToTranscript(sender, message) {
    if (!sender || !message || !transcriptArea) return;

    let messageDiv = createDiv('');
    let bubbleClass = (sender === 'User') ? 'user-transcript-bubble' : 'bot-transcript-bubble';
    // Basic escaping, pastikan aman untuk konteks Anda
    const safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    messageDiv.html(`${safeMessage}`);
    messageDiv.addClass(bubbleClass);

    // Kelas 'detection-result' ditambahkan secara spesifik di displayDetectionResults saat membuat div

    transcriptArea.child(messageDiv);
    // Scroll ke bawah
    try { transcriptArea.elt.scrollTo({ top: transcriptArea.elt.scrollHeight, behavior: 'smooth' }); }
    catch (scrollError) { transcriptArea.elt.scrollTop = transcriptArea.elt.scrollHeight; }
}


// --- Fungsi speechError & speechEnd ---
function speechError(error) {
    console.error("Speech Recognition Error:", error);
    // isListening = false; // Jangan set false jika continuous = true
    let userMessage = 'Maaf, terjadi kesalahan saat mendengar.';
    if (error && error.error) {
       switch (error.error) {
            case 'no-speech':
                // Ini normal di mode continuous jika tidak ada yang bicara. Jangan tampilkan error.
                console.log("Speech Recognition: No speech detected (normal in continuous mode).");
                // Reset flag pemrosesan jika SpeechRec berhenti karena 'no-speech' setelah memproses sesuatu
                if(isProcessingSpeech) {
                    console.log("Resetting isProcessingSpeech flag after no-speech.");
                    isProcessingSpeech = false;
                }
                return; // Keluar dari fungsi tanpa menampilkan error ke user
            case 'audio-capture': userMessage = 'Gagal menangkap audio. Periksa mikrofon.'; break;
            case 'not-allowed': userMessage = 'Izin mikrofon ditolak. Periksa pengaturan browser.'; break;
            default: userMessage = `Terjadi error pengenal suara (${error.error}).`;
        }
    }
    // Tampilkan error hanya jika bukan 'no-speech'
    updateStatus(userMessage, 5000);
    addMessageToTranscript('System', userMessage);
    // Jangan reset UI tombol listen secara otomatis jika continuous = true
    // resetListenButtonUI(!isSpeaking); // Dihapus

    // Reset hasil deteksi jika terjadi error fatal yang mengganggu alur
    // lastDetectionResult = null; // Mungkin tidak perlu direset untuk setiap error suara
    // lastDetectedDisease = null; // Mungkin tidak perlu direset untuk setiap error suara
    // updateReservationButtonVisibility(); // Dihapus

    isProcessingSpeech = false; // Reset flag jika error fatal
}

function speechEnd() {
    console.log("Speech Recognition session ended. isListening:", isListening, "isSpeaking:", isSpeaking);
    // Di mode continuous, onEnd hanya dipanggil jika speechRec.stop() manual atau error fatal.
    // Logika reset UI tombol listen saat stop manual sudah dipindahkan ke toggleListening.
    // Fungsi ini sekarang lebih fokus pada cleanup state jika STT berhenti total.

    // Pastikan status listening false jika onEnd dipanggil
    if (isListening) {
         console.warn("speechEnd called but isListening is still true. Forcing isListening to false.");
         isListening = false; // Ensure state is correct
    }
     if (isProcessingSpeech) {
         console.warn("speechEnd called but isProcessingSpeech is still true. Forcing to false.");
         isProcessingSpeech = false; // Ensure state is correct
     }

    // Jika bot tidak sedang berbicara dan STT berhenti total (karena error atau stop manual),
    // pastikan tombol listen diaktifkan kembali.
    // Logika ini sudah ditangani di toggleListening (untuk stop manual) dan speechError (untuk fatal error).
    // Tidak perlu memanggil resetListenButtonUI lagi di sini.

    // if (!isSpeaking) {
    //     resetListenButtonUI(true); // Aktifkan kembali tombol listen
    //     console.log("speechEnd: Resetting button UI (bot not speaking).");
    // } else {
    //      // If bot is speaking, biarkan tombol listen disabled, hanya hapus animasi rekam
    //      if (listenButton) listenButton.removeClass('recording-animation');
    //      console.log("speechEnd: Bot is speaking, only removing recording animation.");
    // }
}

// --- Helper UI & Status ---
function resetListenButtonUI(enable = true) {
    if (listenButton) {
        // FIX: Pastikan kedua kelas animasi dan listening dihapus
        listenButton.removeClass('listening');
        listenButton.removeClass('recording-animation');
        listenButton.html('<i class="fas fa-microphone-alt me-2"></i><span>Mulai Bicara</span>');
        if (enable) {
            listenButton.removeAttribute('disabled');
        } else {
            listenButton.attribute('disabled', '');
        }
    }
}

// Fungsi ini tidak lagi diperlukan karena tombol reservasi dihapus/disembunyikan
// function updateReservationButtonVisibility() {
//     if (reservationButton) {
//         if (lastDetectionResult && lastDetectionResult !== "NO_VALID_DIAGNOSIS") {
//              console.log("UI UPDATE: Showing reservation button.");
//             reservationButton.style('display', 'flex');
//             reservationButton.removeAttribute('disabled');
//         } else {
//              console.log("UI UPDATE: Hiding reservation button.");
//             reservationButton.style('display', 'none');
//         }
//     } else {
//          console.warn("UI UPDATE: Reservation button element not found when trying to update visibility.");
//     }
// }

function updateStatus(message, duration = 0) {
    if (!statusDisplay) return;
    clearTimeout(statusTimeout);
    const safeMessage = message ? message.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
    statusDisplay.html(safeMessage);
    if (duration > 0) {
        statusTimeout = setTimeout(() => {
            if (statusDisplay.html() === safeMessage) statusDisplay.html('');
        }, duration);
    }
}

// --- Event Listener DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', (event) => {
    console.log("DOM fully loaded and parsed.");
    // Sembunyikan tombol reservasi saat DOM dimuat
    const resBtn = select('#showMapBtn');
    if(resBtn) resBtn.style('display', 'none');
    console.log("Reservation button (#showMapBtn) hidden on DOM load.");

    if (typeof setup === 'function') { setup(); }
    else {
        console.error("FATAL: p5.js 'setup' function not found! Application cannot start.");
        alert("Kesalahan: Fungsi utama aplikasi tidak ditemukan. Aplikasi tidak dapat dimulai.");
    }
});

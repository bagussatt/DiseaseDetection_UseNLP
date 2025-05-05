// ========================================================
// KODE sketch.js - VERSI DGN 2 POPUP & FIX (V4.5)
// FIX: ReferenceError: formattedHTML is not defined
// FIX: Respons Chat & Suara jika Gagal Deteksi
// FIX: Penambahan log untuk Greeting Awal
// ADD BACK: Popup persetujuan data awal saat klik pertama Mulai Bicara
// CHANGE: Tombol Reservasi muncul SEGERA setelah hasil tampil
// FIX: Data terkirim ke reservasi (encodeURIComponent + param name)
// ADD: Popup konfirmasi SweetAlert2 SAAT KLIK RESERVASI + checkbox
// FIX: removeClass errors
// FIX: Hapus duplikasi fungsi speakDetectionResults
// ========================================================

// Variabel Global
let speechRec;
let speechSynth;
let transcriptArea;
let listenButton;
let statusDisplay;
let speakingIndicator;
let reservationButton;
let doctorImageElement;
let isListening = false;
let isSpeaking = false;
let lastDetectionResult = null;
let lastDetectedDisease = null;
let greetingSpoken = false;
let statusTimeout;
let consentGiven = false;

// --- Fungsi Setup p5.js ---
function setup() {
    noCanvas();
    transcriptArea = select('#transcript-area');
    listenButton = select('#listenButton');
    statusDisplay = select('#status');
    speakingIndicator = select('#speaking-indicator');
    reservationButton = select('#showMapBtn');
    doctorImageElement = select('#doctor-image');

    if (!transcriptArea || !listenButton || !statusDisplay || !speakingIndicator || !reservationButton || !doctorImageElement) {
        console.error("FATAL ERROR: UI element missing! Check HTML IDs.");
        alert("Kesalahan kritis: Komponen antarmuka hilang.");
        return;
    }
    console.log("All essential UI elements selected successfully.");

    // Inisialisasi Text-to-Speech (TTS)
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

    // Listener untuk tombol Reservasi
    if (reservationButton) {
        reservationButton.mousePressed(handleReservationClick);
        reservationButton.html('Lanjut ke Reservasi');
        reservationButton.style('display', 'none');
        console.log("Reservation button (#showMapBtn) listener attached.");
    } else {
        console.warn("Reservation button (#showMapBtn) not found.");
    }

    console.log("Initial message will be added via voiceReady.");
    updateStatus('');
    console.log("p5.js setup complete.");
}

// --- Fungsi Inisialisasi SpeechRec ---
function initializeSpeechRec() {
    console.log("Attempting to initialize Speech Recognition...");
    try {
        speechRec = new p5.SpeechRec('id-ID', gotSpeech);
        speechRec.continuous = false; speechRec.interimResults = false;
        speechRec.onError = speechError; speechRec.onEnd = speechEnd;
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
    if (!greetingSpoken && speechSynth && !isSpeaking) {
        const greetingMsg = 'Halo! Saya siap membantu. Klik tombol "Mulai Bicara" lalu sebutkan gejala Anda.';
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
    if (listenButton) listenButton.attribute('disabled', '');
    if (reservationButton) reservationButton.attribute('disabled', '');
    updateStatus('Bot sedang berbicara...');
    if (doctorImageElement) doctorImageElement.addClass('bot-speaking');
}

function botFinishedSpeaking() {
    console.log("Bot finished speaking (TTS onEnd callback).");
    isSpeaking = false;
    if (speakingIndicator) speakingIndicator.style('display', 'none');
    updateStatus('');
    if (doctorImageElement) doctorImageElement.removeClass('bot-speaking');

    if (listenButton && !isListening) {
        resetListenButtonUI();
        console.log("Listen button re-enabled after TTS finished.");
    } else if (listenButton && isListening) {
        console.log("TTS finished, but STT still marked as listening.");
    }
    if (reservationButton && lastDetectionResult && lastDetectionResult !== "NO_VALID_DIAGNOSIS") {
        console.log("Re-enabling reservation button after bot finished speaking.");
        reservationButton.removeAttribute('disabled');
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
        speechRec.start();
        isListening = true;
        console.log("speechRec.start() called.");
        if (listenButton) {
            listenButton.html('<i class="fas fa-stop text-xl"></i><span class="text-base">Berhenti</span>');
            listenButton.addClass('listening', 'recording-animation');
        }
        updateStatus('Mendengarkan...');
    } catch (err) {
        console.error("Error starting speech recognition:", err);
        updateStatus('Gagal memulai pendengaran.', 3000);
        isListening = false;
        resetListenButtonUI(!isSpeaking);
    }
}

function toggleListening() {
    console.log("toggleListening called...");
    if (isSpeaking) {
        console.warn("toggleListening blocked: Bot is speaking.");
        updateStatus('Harap tunggu bot selesai berbicara.', 2000);
        return;
    }
    if (!speechRec && !isListening) {
        console.error("toggleListening blocked: Speech Recognition not initialized!");
        updateStatus('Error: Fitur rekam suara tidak siap.', 3000);
        return;
    }
    if (reservationButton) reservationButton.style('display', 'none');

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
            if (speechRec) { speechRec.stop(); }
            else {
                console.warn("Attempted to stop, but speechRec is null.");
                isListening = false;
                speechEnd();
                return;
            }
            if (listenButton) listenButton.removeClass('recording-animation');
            updateStatus('Menghentikan pendengaran...');
        } catch (e) {
            console.error("Error stopping speech recognition:", e);
            updateStatus('Gagal menghentikan pendengaran.', 3000);
            isListening = false;
            speechEnd();
        }
    }
}

function gotSpeech() {
    console.log("gotSpeech callback triggered.");
    if (statusDisplay) updateStatus('Memproses ucapan...');

    if (speechRec && speechRec.resultValue && speechRec.resultString) {
        let userInput = speechRec.resultString;
        addMessageToTranscript('User', userInput);
        console.log("Proceeding to symptom analysis.");
        sendToServerForDetection(userInput);
        if (listenButton) listenButton.attribute('disabled', '');
    } else {
        console.warn("gotSpeech callback triggered but no valid result found.");
        updateStatus('Tidak dapat mengenali ucapan dengan jelas. Coba lagi.', 3000);
        isListening = false;
        resetListenButtonUI(!isSpeaking);
    }
}

// Kirim teks ke server backend untuk diproses
async function sendToServerForDetection(inputText) {
    console.log(`Sending text to /api/process: "${inputText}"`);
    updateStatus('Menganalisis gejala...');
    if (listenButton) listenButton.attribute('disabled', '');
    if (reservationButton) reservationButton.style('display', 'none');
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
        updateReservationButtonVisibility(); // Pastikan tombol reservasi tersembunyi
        speakText(errorMsg); // Ucapkan error
    } finally {
        console.log("sendToServerForDetection finished.");
    }
}

// --- Fungsi displayDetectionResults ---
function displayDetectionResults(hasilDeteksiString) {
    console.log("Displaying detection results. Raw input:", hasilDeteksiString);
    lastDetectionResult = "NO_VALID_DIAGNOSIS"; // Default
    lastDetectedDisease = null; // Default

    const noDetectionKeywords = ['tidak ada penyakit', 'belum dapat mendeteksi', 'tidak ditemukan', 'tidak terdeteksi', 'gejala tidak cukup'];
    const isNoDetection = !hasilDeteksiString || hasilDeteksiString.trim() === '' || noDetectionKeywords.some(keyword => hasilDeteksiString.toLowerCase().includes(keyword));

    let speakPenyakit = "Tidak diketahui";
    let speakGejala = "N/A";
    let foundDiagnosis = false;

    if (isNoDetection) {
        // --- PERBAIKAN: Penanganan jika tidak terdeteksi ---
        console.log("No specific disease detected.");
        const noDetectChatMsg = 'Maaf, berdasarkan gejala Anda, belum dapat dideteksi penyakit spesifik. Silakan coba ulangi dengan gejala yang lebih jelas atau berbeda.';
        const noDetectSpeakMsg = 'Maaf, berdasarkan gejala Anda, belum dapat dideteksi penyakit spesifik. Silakan coba ulangi dengan gejala yang lebih jelas atau berbeda.';

        addMessageToTranscript('Bot', noDetectChatMsg); // Tambah pesan ke chat
        lastDetectionResult = "NO_VALID_DIAGNOSIS";
        lastDetectedDisease = null;
        updateReservationButtonVisibility(); // Pastikan tombol reservasi disembunyikan
        speakText(noDetectSpeakMsg); // Ucapkan pesan gagal deteksi
        return; // Hentikan eksekusi fungsi di sini
        // --- AKHIR PERBAIKAN ---
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

    // Update visibilitas tombol SEGERA setelah menampilkan hasil
    updateReservationButtonVisibility();

    // Ucapkan hasil (fungsi ini tidak lagi menangani isNoDetection)
    speakDetectionResults(speakPenyakit, speakGejala, foundDiagnosis);
}


// --- Fungsi speakDetectionResults (Disederhanakan) ---
function speakDetectionResults(penyakit, gejala, diagnosisDitemukan) {
    let textToSpeak = '';
    const validPenyakit = diagnosisDitemukan && penyakit && penyakit !== "Tidak diketahui" && penyakit.trim() !== '';

    // Kasus isNoDetection sudah ditangani di displayDetectionResults
    if (validPenyakit) {
        textToSpeak = `Baik, berdasarkan analisis, kemungkinan penyakit Anda adalah ${penyakit}. `;
        if (gejala && gejala !== "N/A" && gejala.toLowerCase() !== 'n/a' && gejala.trim() !== '') {
            textToSpeak += `Gejala yang cocok: ${gejala}. `;
        }
        textToSpeak += `Jika ingin melanjutkan, silakan klik tombol Reservasi yang sudah muncul.`;
        // lastDetectionResult & lastDetectedDisease sudah di set di displayDetectionResults
    } else {
        // Ini terjadi jika diagnosis ditemukan tapi tidak valid (misal, nama penyakit kosong)
        textToSpeak = "Analisis selesai. Disarankan untuk konsultasi lebih lanjut dengan dokter.";
        lastDetectionResult = "NO_VALID_DIAGNOSIS"; // Reset
        lastDetectedDisease = null;
        // Tombol reservasi seharusnya sudah disembunyikan oleh updateReservationButtonVisibility sebelumnya
    }
    console.log("Bot speaking diagnosis summary:", textToSpeak);
    speakText(textToSpeak);
}


// --- Fungsi inti untuk Text-to-Speech (TTS) ---
function speakText(textToSpeak) {
    console.log(`Attempting to speak: "${textToSpeak}"`);
     if (!textToSpeak) {
        console.warn("TTS: speakText called with empty text.");
        botFinishedSpeaking();
        return;
    }
    if (speechSynth && typeof speechSynth.speak === 'function') {
        try {
            speechSynth.speak(textToSpeak);
            console.log("speechSynth.speak() called.");
        } catch (e) {
            console.error("Error triggering speechSynth.speak():", e);
            botFinishedSpeaking();
        }
    } else {
        console.warn("TTS not available. Cannot speak.");
        botFinishedSpeaking();
    }
}

// --- Fungsi untuk menangani klik tombol reservasi -> Munculkan Popup ---
function handleReservationClick() {
    console.log("Reservation button clicked. Preparing confirmation popup...");
    if (!lastDetectionResult || lastDetectionResult === "NO_VALID_DIAGNOSIS") {
        console.warn("Reservation button clicked, but no valid diagnosis data available.");
         Swal.fire('Tidak Ada Diagnosis', 'Belum ada hasil analisis gejala yang valid.', 'warning');
        return;
    }
    const gejalaDataRaw = lastDetectionResult;
    const penyakitDisplay = lastDetectedDisease || "kemungkinan kondisi ini";

    Swal.fire({
        title: 'Konfirmasi Reservasi',
        html: `
            <p>Apakah Anda yakin ingin melanjutkan ke halaman reservasi untuk <b>${penyakitDisplay}</b> berdasarkan analisis gejala?</p>
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
        preConfirm: () => {
            const isChecked = document.getElementById('konfirmasi-reservasi-check').checked;
            if (!isChecked) {
                Swal.showValidationMessage('Anda harus menyetujui pengiriman data untuk melanjutkan.');
                return false;
            }
            return true;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            console.log("User confirmed reservation data sending. Proceeding to redirect...");
            goToReservationPage(gejalaDataRaw);
        } else {
            console.log("User cancelled reservation data sending.");
        }
    });
}

// --- Fungsi Redirect ke Halaman Reservasi (Dipanggil SETELAH konfirmasi) ---
function goToReservationPage(diagnosisData) {
    console.log("Redirecting function called...");
    let diagnosisParam = "";
    if (diagnosisData && diagnosisData !== "NO_VALID_DIAGNOSIS") {
        diagnosisParam = encodeURIComponent(diagnosisData);
        console.log("Valid symptoms data encoded to send:", diagnosisParam);
    } else {
        console.warn("goToReservationPage called without valid diagnosis data.");
        diagnosisParam = encodeURIComponent("Gejala tidak dispesifikasi atau tidak valid.");
    }
    const targetPage = 'reservasi.html';
    const reservationUrl = `${targetPage}?diagnosis=${diagnosisParam}`;
    console.log("Redirecting to:", reservationUrl);
    window.location.href = reservationUrl;
}

// --- Fungsi addMessageToTranscript ---
function addMessageToTranscript(sender, message) {
    // FIX: Hapus pengecekan formattedHTML yang menyebabkan error
    if (!sender || !message || !transcriptArea) return;
    if (sender === 'Bot' && message.startsWith('<span class="sender-label">[Bot]:</span> <strong>Hasil Analisis:</strong>')) {
         // Jika Anda menambahkan hasil HTML secara manual, skip pesan teks biasa
         // return; // <-- Komentari baris ini jika Anda hanya ingin menambahkan teks biasa
    }

    let messageDiv = createDiv('');
    let bubbleClass = (sender === 'User') ? 'user-transcript-bubble' : 'bot-transcript-bubble';
    // Basic escaping, pastikan aman untuk konteks Anda
    const safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    messageDiv.html(`${safeMessage}`);
    messageDiv.addClass(bubbleClass);

    // Kelas 'detection-result' ditambahkan secara spesifik di displayDetectionResults saat membuat div
    // Tidak perlu ditambahkan lagi di sini

    transcriptArea.child(messageDiv);
    try { transcriptArea.elt.scrollTo({ top: transcriptArea.elt.scrollHeight, behavior: 'smooth' }); }
    catch (scrollError) { transcriptArea.elt.scrollTop = transcriptArea.elt.scrollHeight; }
}


// --- Fungsi speechError & speechEnd ---
function speechError(error) {
    console.error("Speech Recognition Error:", error);
    isListening = false;
    let userMessage = 'Maaf, terjadi kesalahan saat mendengar.';
    if (error && error.error) {
       switch (error.error) {
            case 'no-speech': userMessage = 'Tidak ada suara terdeteksi. Coba lagi.'; break;
            case 'audio-capture': userMessage = 'Gagal menangkap audio. Periksa mikrofon.'; break;
            case 'not-allowed': userMessage = 'Izin mikrofon ditolak. Periksa pengaturan browser.'; break;
            default: userMessage = `Terjadi error (${error.error}).`;
        }
    }
    updateStatus(userMessage, 5000);
    addMessageToTranscript('System', userMessage);
    resetListenButtonUI(!isSpeaking);

    lastDetectionResult = null;
    lastDetectedDisease = null;
    updateReservationButtonVisibility();
}

function speechEnd() {
    console.log("Speech Recognition session ended.");
    if(isListening) isListening = false;

    if (listenButton && !isSpeaking) {
        resetListenButtonUI();
        console.log("speechEnd: Resetting button UI (bot not speaking).");
    } else if (listenButton && isSpeaking) {
        listenButton.removeClass('recording-animation');
        console.log("speechEnd: Bot is speaking, only removing recording animation.");
    }
}

// --- Helper UI & Status ---
function resetListenButtonUI(enable = true) {
    if (listenButton) {
        listenButton.removeClass('listening', 'recording-animation'); // Fix removeClass
        listenButton.html('<i class="fas fa-microphone-alt text-xl"></i><span class="text-base">Mulai Bicara</span>');
        if (enable) {
            listenButton.removeAttribute('disabled');
        } else {
            listenButton.attribute('disabled', '');
        }
    }
}

function updateReservationButtonVisibility() {
    if (reservationButton) {
        if (lastDetectionResult && lastDetectionResult !== "NO_VALID_DIAGNOSIS") {
             console.log("UI UPDATE: Showing reservation button.");
            reservationButton.style('display', 'flex');
            reservationButton.removeAttribute('disabled');
        } else {
             console.log("UI UPDATE: Hiding reservation button.");
            reservationButton.style('display', 'none');
        }
    } else {
         console.warn("UI UPDATE: Reservation button element not found when trying to update visibility.");
    }
}

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
    if (typeof setup === 'function') { setup(); }
    else {
        console.error("FATAL: p5.js 'setup' function not found! Application cannot start.");
        alert("Kesalahan: Fungsi utama aplikasi tidak ditemukan. Aplikasi tidak dapat dimulai.");
    }
});
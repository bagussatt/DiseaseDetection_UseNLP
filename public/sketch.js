// ========================================================
// KODE sketch.js LENGKAP - VERSI DENGAN PERBAIKAN V3.0
// Tombol Reservasi Muncul Setelah Diagnosis (Tanpa Popup Peta)
// Parsing Data Gejala - FIX removeClass Error - FIX API URL
// ========================================================

// Variabel Global
let speechRec;
let speechSynth;
let transcriptArea;
let listenButton;
let statusDisplay; // Status utama di bawah tombol
let speakingIndicator;
let reservationButton; // Mengganti nama variabel untuk kejelasan (merujuk ke #showMapBtn)
let doctorImageElement;
let isListening = false;
let isSpeaking = false;
let lastDetectionResult = null; // Menyimpan hasil deteksi terakhir yang valid
// HAPUS: let currentMapInstance = null; // Tidak perlu peta lagi
let greetingSpoken = false;
let statusTimeout;

// --- Fungsi Setup p5.js ---
function setup() {
    noCanvas();
    transcriptArea = select('#transcript-area');
    listenButton = select('#listenButton');
    statusDisplay = select('#status');
    speakingIndicator = select('#speaking-indicator');
    reservationButton = select('#showMapBtn'); // Tetap gunakan ID lama, tapi variabelnya ganti nama
    doctorImageElement = select('#doctor-image');

    // Pemeriksaan elemen UI
    if (!transcriptArea || !listenButton || !statusDisplay || !speakingIndicator || !reservationButton || !doctorImageElement) {
        console.error("FATAL ERROR: One or more essential UI elements not found! Check HTML IDs (#showMapBtn untuk tombol reservasi).");
        alert("Terjadi kesalahan kritis saat memuat komponen antarmuka. Aplikasi mungkin tidak berfungsi.");
    } else {
        console.log("All essential UI elements selected successfully.");
    }

    // Inisialisasi Text-to-Speech (TTS)
    if (typeof p5 !== 'undefined' && p5.Speech) {
        try {
            speechSynth = new p5.Speech();
            speechSynth.onLoad = voiceReady;
            speechSynth.onStart = botStartedSpeaking;
            speechSynth.onEnd = botFinishedSpeaking; // Penting untuk menampilkan tombol
            speechSynth.setLang('id-ID');
            console.log("p5.Speech (TTS) initialized.");
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
                console.log("Listen button enabled.");
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

    // Listener untuk tombol Reservasi (sebelumnya tombol peta)
    if (reservationButton) {
        reservationButton.mousePressed(goToReservationPage); // Panggil fungsi redirect
        reservationButton.html('Lanjut ke Reservasi'); // Set teks tombol
        reservationButton.style('display', 'none'); // Sembunyikan di awal
        console.log("Reservation button (#showMapBtn) listener attached, button hidden initially.");
    } else {
        console.warn("Reservation button (#showMapBtn) not found.");
    }

    // Pesan sapaan awal
    addMessageToTranscript('Bot', 'Halo! Saya siap membantu. Klik tombol "Mulai Bicara" lalu sebutkan gejala Anda.'); // Hapus info reservasi langsung
    console.log("Initial greeting added.");
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
    console.log("TTS engine is ready.");
    if (!greetingSpoken && speechSynth && !isSpeaking) {
        const greetingMsg = 'Halo! Saya siap membantu. Klik tombol "Mulai Bicara" lalu sebutkan gejala Anda.';
        console.log("Attempting to speak initial greeting...");
        speakText(greetingMsg);
        greetingSpoken = true;
     }
}

function botStartedSpeaking() {
    console.log("Bot started speaking.");
    isSpeaking = true;
    if (speakingIndicator) speakingIndicator.style('display', 'flex');
    if (listenButton) listenButton.attribute('disabled', '');
    if (reservationButton) reservationButton.attribute('disabled', ''); // Nonaktifkan tombol reservasi saat bot bicara
    updateStatus('Bot sedang berbicara...');
    if (doctorImageElement) doctorImageElement.addClass('bot-speaking');
}

// Dipanggil saat bot selesai bicara (MENAMPILKAN TOMBOL RESERVASI)
function botFinishedSpeaking() {
    console.log("Bot finished speaking (TTS onEnd callback).");
    isSpeaking = false;
    if (speakingIndicator) speakingIndicator.style('display', 'none');
    updateStatus('');
    if (doctorImageElement) doctorImageElement.removeClass('bot-speaking');

    // Aktifkan kembali tombol dengar
    if (listenButton && !isListening) {
        listenButton.removeAttribute('disabled');
        listenButton.html('<i class="fas fa-microphone-alt text-xl"></i><span class="text-base">Mulai Bicara</span>');
        listenButton.removeClass('listening');
        listenButton.removeClass('recording-animation');
        console.log("Listen button re-enabled after TTS finished.");
    } else if (listenButton && isListening) {
         console.log("TTS finished, but still listening.");
    }

    // === LOGIKA TAMPILKAN TOMBOL RESERVASI ===
    console.log("--- Checking condition to show Reservation button ---");
    console.log("Value of lastDetectionResult:", lastDetectionResult);

    // Hanya tampilkan tombol jika ADA hasil diagnosis valid
    if (lastDetectionResult && lastDetectionResult !== "NO_VALID_DIAGNOSIS") {
        if (reservationButton) {
            console.log("✅ Valid diagnosis found. Showing Reservation button.");
            // Gunakan display style yang sesuai dengan kelas CSS Anda (flex atau inline-flex)
            // Jika tombol Anda menggunakan 'inline-flex' di kelasnya:
            // reservationButton.style('display', 'inline-flex');
            // Jika tombol Anda menggunakan 'flex' di kelasnya:
            reservationButton.style('display', 'flex');
            reservationButton.removeAttribute('disabled'); // Aktifkan tombol
        } else {
            console.warn("Valid diagnosis, but reservation button element not found!");
        }
    } else {
        if (reservationButton) {
            console.log("❌ No valid diagnosis result. Hiding Reservation button.");
            reservationButton.style('display', 'none'); // Pastikan tombol tersembunyi
        }
    }
    console.log("--- Finished checking Reservation button condition ---");
}

// --- Fungsi Toggle Listening ---
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
    if (reservationButton) reservationButton.style('display', 'none'); // Sembunyikan tombol reservasi saat mendengar

    if (!isListening) {
        // --- MULAI MENDENGARKAN ---
        console.log("Attempting to start listening...");
        try {
            if (!speechRec) { initializeSpeechRec(); if (!speechRec) throw new Error("Re-init failed."); }
            speechRec.start(false, false);
            isListening = true;
            console.log("speechRec.start() called.");
            if (listenButton) {
                listenButton.html('<i class="fas fa-stop text-xl"></i><span class="text-base">Berhenti</span>');
                listenButton.addClass('listening');
                listenButton.addClass('recording-animation');
             }
            updateStatus('Mendengarkan...');
        } catch (err) {
             console.error("Error starting speech recognition:", err);
             updateStatus('Gagal memulai pendengaran.', 3000);
             isListening = false;
             if (listenButton) { // Reset UI
                 listenButton.removeClass('listening');
                 listenButton.removeClass('recording-animation');
                 listenButton.html('<i class="fas fa-microphone-alt text-xl"></i><span class="text-base">Mulai Bicara</span>');
             }
         }
    } else {
        // --- BERHENTI MENDENGARKAN (MANUAL) ---
        console.log("Attempting to stop listening manually...");
        try {
            if (speechRec) { speechRec.stop(); }
            else {
                console.warn("Attempted to stop, but speechRec is null.");
                isListening = false;
                speechEnd(); // Panggil cleanup manual
                return;
             }
            if (listenButton) listenButton.removeClass('recording-animation');
            updateStatus('Menghentikan pendengaran...');
        } catch (e) {
            console.error("Error stopping speech recognition:", e);
            updateStatus('Gagal menghentikan pendengaran.', 3000);
            isListening = false; // Paksa state
            if (listenButton) listenButton.removeClass('recording-animation'); // Pastikan animasi hilang
            speechEnd(); // Coba cleanup
         }
    }
}

// Callback saat ucapan terdeteksi
function gotSpeech() {
    console.log("gotSpeech callback triggered.");
    if (statusDisplay) updateStatus('Memproses ucapan...');

    if (speechRec && speechRec.resultValue) {
        let userInput = speechRec.resultString;
        addMessageToTranscript('User', userInput);
        const userInputLower = userInput.toLowerCase();
        // Hapus keyword reservasi, fokus pada analisis gejala
        // const reservationKeywords = ["reservasi", /*...*/];
        // let isReservationRequest = reservationKeywords.some(keyword => userInputLower.includes(keyword));

        // Selalu anggap sebagai analisis gejala
        console.log("Proceeding to symptom analysis.");
        sendToServerForDetection(userInput); // Kirim untuk analisis

        if (listenButton) listenButton.attribute('disabled', '');

    } else {
        console.warn("gotSpeech callback triggered but no valid result found.");
        updateStatus('Tidak dapat mengenali ucapan dengan jelas. Coba lagi.', 3000);
    }
}

// Kirim teks ke server backend untuk diproses
async function sendToServerForDetection(inputText) {
    console.log(`Sending text to /api/process: "${inputText}"`);
    updateStatus('Menganalisis gejala...');
    if (listenButton) listenButton.attribute('disabled', '');
    if (reservationButton) reservationButton.style('display', 'none'); // Sembunyikan tombol saat analisis

    try {
        const response = await fetch('/api/process', { // Menggunakan /api/process
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
        addMessageToTranscript('Bot', errorMsg);
        speakText(errorMsg);
        lastDetectionResult = null; // Reset jika error
    } finally {
        console.log("sendToServerForDetection finished.");
    }
}

// --- Fungsi displayDetectionResults ---
function displayDetectionResults(hasilDeteksiString) {
    console.log("Displaying detection results. Raw input:", hasilDeteksiString);
    lastDetectionResult = "NO_VALID_DIAGNOSIS"; // Default

    const noDetectionKeywords = ['tidak ada penyakit', 'belum dapat mendeteksi', 'tidak ditemukan', 'tidak terdeteksi', 'gejala tidak cukup']; // Tambahkan keyword lain jika perlu
    const isNoDetection = !hasilDeteksiString || hasilDeteksiString.trim() === '' || noDetectionKeywords.some(keyword => hasilDeteksiString.toLowerCase().includes(keyword));

    if (isNoDetection) {
        console.log("No specific disease detected.");
        addMessageToTranscript('Bot', 'Halo Saya Asisten anda! Saya siap membantu. Klik tombol "Mulai Bicara" lalu sebutkan gejala Anda.'); 
        speakText('Berdasarkan gejala Anda, belum dapat dideteksi penyakit spesifik. silahkan ulang gejala anda');
        lastDetectionResult = "NO_VALID_DIAGNOSIS";
        return;
    }

    console.log("Potential disease detected.");
    lastDetectionResult = hasilDeteksiString; // Simpan hasil MENTAH
    console.log(">>> Set lastDetectionResult to (VALID):", `"${lastDetectionResult}"`);

    // Format untuk transkrip
    const lines = hasilDeteksiString.trim().split('\n');
    let formattedHTML = '<span class="sender-label">[Bot]:</span> <strong>Hasil Analisis:</strong><ul class="list-disc list-inside ml-4 mt-1">';
    let penyakitTerdeteksi = "Tidak diketahui";
    let gejalaCocok = "N/A";
    let foundDiagnosis = false;
    lines.forEach(line => {
         const parts = line.split(':');
         if (parts.length >= 2) {
             const label = parts[0].trim();
             const value = parts.slice(1).join(':').trim();
             formattedHTML += `<li class="mb-1"><strong class="font-medium">${label.replace(/</g, "<").replace(/>/g, ">")}:</strong> ${value.replace(/</g, "<").replace(/>/g, ">")}</li>`;
             const labelLower = label.toLowerCase();
             if (labelLower.includes('penyakit terdeteksi') || labelLower.includes('kemungkinan penyakit')) { penyakitTerdeteksi = value; foundDiagnosis = true; }
             else if (labelLower.includes('gejala yang muncul') || labelLower.includes('gejala cocok')) { gejalaCocok = value; }
         } else if (line.trim()) {
             formattedHTML += `<li class="mb-1">${line.trim().replace(/</g, "<").replace(/>/g, ">")}</li>`;
             if (!foundDiagnosis && (line.trim().toLowerCase().includes('penyakit:') || line.trim().toLowerCase().includes('kemungkinan:'))) { penyakitTerdeteksi = line.trim().split(':').slice(1).join(':').trim() || line.trim(); foundDiagnosis = true;}
         }
     });
    formattedHTML += '</ul>';


    // Tampilkan di transkrip
    let resultDiv = createDiv(formattedHTML);
    resultDiv.addClass('bot-transcript-bubble detection-result');
    if (transcriptArea) {
        transcriptArea.child(resultDiv);
        try { transcriptArea.elt.scrollTo({ top: transcriptArea.elt.scrollHeight, behavior: 'smooth' }); } catch(e){}
     }

    // Ucapkan hasil (Tombol akan muncul setelah bot selesai bicara)
    speakDetectionResults(penyakitTerdeteksi, gejalaCocok, foundDiagnosis);
}

// Ucapkan ringkasan hasil deteksi// --- Fungsi displayDetectionResults ---
function displayDetectionResults(hasilDeteksiString) {
    console.log("Displaying detection results. Raw input:", hasilDeteksiString);
    lastDetectionResult = "NO_VALID_DIAGNOSIS"; // Default

    const noDetectionKeywords = ['tidak ada penyakit', 'belum dapat mendeteksi', 'tidak ditemukan', 'tidak terdeteksi', 'gejala tidak cukup']; // Tambahkan keyword lain jika perlu
    const isNoDetection = !hasilDeteksiString || hasilDeteksiString.trim() === '' || noDetectionKeywords.some(keyword => hasilDeteksiString.toLowerCase().includes(keyword));

    if (isNoDetection) {
        console.log("No specific disease detected.");
        addMessageToTranscript('Bot', 'Berdasarkan gejala Anda, belum dapat dideteksi penyakit spesifik. silahkan ulang gejala anda'); 
        speakText('Berdasarkan gejala Anda, belum dapat dideteksi penyakit spesifik. silahkan ulang gejala anda');
        lastDetectionResult = "NO_VALID_DIAGNOSIS";
        return;
    }

    console.log("Potential disease detected.");
    lastDetectionResult = hasilDeteksiString; // Simpan hasil MENTAH
    console.log(">>> Set lastDetectionResult to (VALID):", `"${lastDetectionResult}"`);

    // Format untuk transkrip
    const lines = hasilDeteksiString.trim().split('\n');
    let formattedHTML = '<span class="sender-label">[Bot]:</span> <strong>Hasil Analisis:</strong><ul class="list-disc list-inside ml-4 mt-1">';
    let penyakitTerdeteksi = "Tidak diketahui";
    let gejalaCocok = "N/A";
    let foundDiagnosis = false;
    lines.forEach(line => {
         const parts = line.split(':');
         if (parts.length >= 2) {
             const label = parts[0].trim();
             const value = parts.slice(1).join(':').trim();
             formattedHTML += `<li class="mb-1"><strong class="font-medium">${label.replace(/</g, "<").replace(/>/g, ">")}:</strong> ${value.replace(/</g, "<").replace(/>/g, ">")}</li>`;
             const labelLower = label.toLowerCase();
             if (labelLower.includes('penyakit terdeteksi') || labelLower.includes('kemungkinan penyakit')) { penyakitTerdeteksi = value; foundDiagnosis = true; }
             else if (labelLower.includes('gejala yang muncul') || labelLower.includes('gejala cocok')) { gejalaCocok = value; }
         } else if (line.trim()) {
             formattedHTML += `<li class="mb-1">${line.trim().replace(/</g, "<").replace(/>/g, ">")}</li>`;
             if (!foundDiagnosis && (line.trim().toLowerCase().includes('penyakit:') || line.trim().toLowerCase().includes('kemungkinan:'))) { penyakitTerdeteksi = line.trim().split(':').slice(1).join(':').trim() || line.trim(); foundDiagnosis = true;}
         }
     });
    formattedHTML += '</ul>';

    // Tampilkan di transkrip
    let resultDiv = createDiv(formattedHTML);
    resultDiv.addClass('bot-transcript-bubble detection-result');
    if (transcriptArea) {
        transcriptArea.child(resultDiv);
        try { transcriptArea.elt.scrollTo({ top: transcriptArea.elt.scrollHeight, behavior: 'smooth' }); } catch(e){}
     }

    // Ucapkan hasil (Tombol akan muncul setelah bot selesai bicara)
    speakDetectionResults(penyakitTerdeteksi, gejalaCocok, foundDiagnosis);
}

// Ucapkan ringkasan hasil deteksi
function speakDetectionResults(penyakit, gejala, diagnosisDitemukan) {
    let textToSpeak = '';
    if (diagnosisDitemukan && penyakit !== "Tidak diketahui") {
         textToSpeak = `Baik, berdasarkan analisis, kemungkinan penyakit Anda adalah ${penyakit}.Jika ingin melanjutkan, silakan klik tombol Reservasi yang akan muncul. `;
         if (gejala && gejala !== "N/A" && gejala.toLowerCase() !== 'n/a') {
             textToSpeak += `Gejala yang cocok: ${gejala}. `;
         } else { textToSpeak += `Disarankan konsultasi lebih lanjut. `; }
    } else {
         textToSpeak = "Analisis selesai. Disarankan untuk konsultasi lebih lanjut dengan dokter.";
    }
    console.log("Bot speaking diagnosis summary:", textToSpeak);
    speakText(textToSpeak);
}
function speakDetectionResults(penyakit, gejala, diagnosisDitemukan) {
    let textToSpeak = '';
    if (diagnosisDitemukan && penyakit !== "Tidak diketahui") {
         textToSpeak = `Baik, berdasarkan analisis, kemungkinan penyakit Anda adalah ${penyakit}.Jika ingin melanjutkan, silakan klik tombol Reservasi yang akan muncul. `;
         if (gejala && gejala !== "N/A" && gejala.toLowerCase() !== 'n/a') {
             textToSpeak += `Gejala yang cocok: ${gejala}. `;
         } else { textToSpeak += `Disarankan konsultasi lebih lanjut. `; }
    } else {
         textToSpeak = "Analisis selesai. Disarankan untuk konsultasi lebih lanjut dengan dokter.";
    }
    console.log("Bot speaking diagnosis summary:", textToSpeak);
    speakText(textToSpeak);
}

// --- Fungsi inti untuk Text-to-Speech (TTS) ---
function speakText(textToSpeak) {
    console.log(`Attempting to speak: "${textToSpeak}"`);
    if (speechSynth && typeof speechSynth.speak === 'function') {
        try {
            updateStatus('Bot sedang berbicara...');
            isSpeaking = true;
            if (speakingIndicator) speakingIndicator.style('display', 'flex');
            if (listenButton) listenButton.attribute('disabled', '');
            if (reservationButton) reservationButton.attribute('disabled', ''); // Nonaktifkan tombol reservasi juga
            if (doctorImageElement) doctorImageElement.addClass('bot-speaking');
            speechSynth.speak(textToSpeak);
            console.log("speechSynth.speak() called.");
        } catch (e) {
            console.error("Error triggering speechSynth.speak():", e);
            botFinishedSpeaking(); // Panggil onEnd manual jika speak gagal
        }
    } else {
        console.warn("TTS not available. Cannot speak.");
        botFinishedSpeaking(); // Panggil onEnd manual jika TTS tidak jalan
    }
}


// --- Fungsi untuk Menampilkan Peta dalam Popup SweetAlert2 (DIHAPUS) ---
// function showMapAndReservationPopup() { ... }


// --- Handler untuk Tombol Reservasi di dalam Popup (DIGANTI) ---
// function handleSwalReservationClick() { ... }


// --- Fungsi Baru: Redirect ke Halaman Reservasi ---
function goToReservationPage() {
    console.log("Reservation button clicked. Preparing redirect...");
    let gejalaData = "";
    // Gunakan lastDetectionResult jika valid
    if (lastDetectionResult && lastDetectionResult !== "NO_VALID_DIAGNOSIS") {
        gejalaData = lastDetectionResult;
        console.log("Valid symptoms data found to send:", gejalaData);
    } else {
        // Seharusnya tombol ini tidak akan bisa diklik jika tidak ada diagnosis valid,
        // tapi tambahkan peringatan untuk jaga-jaga.
        console.warn("Reservation button clicked, but no valid symptoms data found. Proceeding without symptoms.");
    }

    const targetPage = 'reservasi.html'; // Pastikan nama file benar
    const urlParams = new URLSearchParams();
    urlParams.append('gejala', gejalaData); // Tambahkan parameter gejala (bisa kosong)
    const reservationUrl = `${targetPage}?${urlParams.toString()}`;

    console.log("Redirecting to:", reservationUrl);
    window.location.href = reservationUrl; // Arahkan ke halaman reservasi
}


// --- Fungsi fetchAndDisplayHospitalMarkers (DIHAPUS) ---


// --- Fungsi addMessageToTranscript ---
function addMessageToTranscript(sender, message) {
    if (!sender || !message || !transcriptArea) return;
    let messageDiv = createDiv('');
    let bubbleClass = (sender === 'User') ? 'user-transcript-bubble' : 'bot-transcript-bubble';
    if (sender === 'Bot' && message.includes('<ul')) { return; } // Hindari duplikasi format HTML
    const safeMessage = message.replace(/</g, "<").replace(/>/g, ">");
    messageDiv.html(`${safeMessage}`);
    messageDiv.addClass(bubbleClass);
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
     addMessageToTranscript('Bot', userMessage);
     if (listenButton) { // Reset UI tombol
         listenButton.removeClass('listening');
         listenButton.removeClass('recording-animation');
         listenButton.html('<i class="fas fa-microphone-alt text-xl"></i><span class="text-base">Mulai Bicara</span>');
         if (!isSpeaking) listenButton.removeAttribute('disabled');
     }
     lastDetectionResult = null; // Reset hasil jika STT error
}

function speechEnd() {
     console.log("Speech Recognition session ended.");
     isListening = false;
     if (listenButton) { // Hapus animasi
        listenButton.removeClass('recording-animation');
        // Reset UI jika bot tidak bicara
        if(!isSpeaking){
            listenButton.removeClass('listening');
            listenButton.html('<i class="fas fa-microphone-alt text-xl"></i><span class="text-base">Mulai Bicara</span>');
            listenButton.removeAttribute('disabled');
        }
     }
}

// --- Helper updateStatus ---
function updateStatus(message, duration = 0) {
    if (!statusDisplay) return;
    clearTimeout(statusTimeout);
    statusDisplay.html(message);
    if (duration > 0) {
        statusTimeout = setTimeout(() => {
            if (statusDisplay.html() === message) statusDisplay.html('');
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

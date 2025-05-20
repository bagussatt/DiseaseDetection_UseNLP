// Global variables
let speechRec;
let speechSynth;
let transcriptArea;
let listenButton;
let statusDisplay;
let speakingIndicator;
// let reservationButton; // Tombol reservasi fisik telah dihapus
let doctorImageElement;
let isListening = false;
let isSpeaking = false;
let lastDetectionResult = null;
let lastDetectedDisease = null;
let greetingSpoken = false;
let statusTimeout;
let consentGiven = false;

// --- p5.js Setup Function ---
function setup() {
    // Check if p5 is defined before calling p5 functions
    if (typeof p5 !== 'undefined' && typeof noCanvas === 'function') {
        noCanvas();
    } else {
        console.warn("p5 or noCanvas() is not defined. Ensure p5.js is loaded correctly before sketch.js. A default canvas might be created.");
    }

    // Select UI elements
    transcriptArea = select('#transcript-area');
    listenButton = select('#listenButton');
    statusDisplay = select('#status');
    speakingIndicator = select('#speaking-indicator');
    // reservationButton = select('#showMapBtn'); // Tombol reservasi fisik telah dihapus
    doctorImageElement = select('#doctor-image');

    // Check if all essential UI elements are selected
    // Pemeriksaan untuk reservationButton dihilangkan karena tombolnya dihapus
    if (!transcriptArea || !listenButton || !statusDisplay || !speakingIndicator || !doctorImageElement) {
        console.error("FATAL ERROR: UI element missing! Check HTML IDs. Application might not work as expected.");
        if (statusDisplay) {
            updateStatus("Kesalahan kritis: Komponen antarmuka hilang. Aplikasi mungkin tidak berfungsi.", 10000);
        }
        return;
    }
    console.log("All essential UI elements selected successfully.");

    // Initialize Text-to-Speech (TTS)
    if (typeof p5 !== 'undefined' && p5.Speech) {
        try {
            speechSynth = new p5.Speech();
            speechSynth.onLoad = voiceReady; // Callback when TTS is ready
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

    // Initialize Speech-to-Text (STT)
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

    // Listener for Reservation Button - Dihapus karena tombolnya dihilangkan
    // if (reservationButton) {
    //     reservationButton.mousePressed(handleReservationClick);
    //     reservationButton.html('Reservasi');
    //     reservationButton.style('display', 'none');
    //     console.log("Reservation button (#showMapBtn) listener attached.");
    // } else {
    //     console.warn("Reservation button (#showMapBtn) not found as it has been removed.");
    // }

    console.log("Initial message will be added via voiceReady.");
    updateStatus(''); // Clear status initially
    console.log("p5.js setup complete.");
}

// --- Initialize SpeechRec ---
function initializeSpeechRec() {
    console.log("Attempting to initialize Speech Recognition...");
    try {
        speechRec = new p5.SpeechRec('id-ID', gotSpeech);
        speechRec.continuous = false; // Process speech once then stop
        speechRec.interimResults = false; // Only final results
        speechRec.onError = speechError;
        speechRec.onEnd = speechEnd;
        console.log("Speech Recognition configured.");
    } catch (e) {
        console.error("FATAL ERROR during new p5.SpeechRec():", e);
        speechRec = null;
        throw e; // Rethrow to indicate critical failure
    }
}

// --- Callback and Helper Functions ---

function voiceReady() {
    // This function is called AFTER the TTS library is ready
    console.log("TTS engine ready (voiceReady callback).");
    // Try to speak greeting if not already spoken and TTS is ready
    if (!greetingSpoken && speechSynth && !isSpeaking) {
        const greetingMsg = 'Halo! Saya siap membantu. Klik tombol "Mulai Bicara" lalu sebutkan gejala Anda. Jika sudah ada hasil analisis, Anda juga bisa mengatakan "saya ingin reservasi" untuk membuat janji temu.';
        console.log("Attempting to speak initial greeting...");
        addMessageToTranscript('Vira', greetingMsg); // Add to transcript first
        speakText("Halo Saya VIRA! Saya siap membantu. Klik tombol Mulai Bicara lalu sebutkan gejala Anda."); // Then speak
        greetingSpoken = true; // Mark as spoken
    } else {
        console.log("Initial greeting condition not met or already spoken.");
        if (greetingSpoken) console.log("Reason: Greeting already spoken.");
        if (!speechSynth) console.log("Reason: speechSynth is null.");
        if (isSpeaking) console.log("Reason: Vira is currently speaking.");
    }
}

function botStartedSpeaking() {
    isSpeaking = true;
    if (speakingIndicator) speakingIndicator.style('display', 'flex');
    if (listenButton) listenButton.attribute('disabled', '');
    // if (reservationButton) reservationButton.attribute('disabled', ''); // Dihapus
    updateStatus('Vira sedang berbicara...');
    if (doctorImageElement) doctorImageElement.addClass('bot-speaking');
}

function botFinishedSpeaking() {
    console.log("Bot finished speaking (TTS onEnd callback).");
    isSpeaking = false;
    if (speakingIndicator) speakingIndicator.style('display', 'none');
    updateStatus(''); // Clear status
    if (doctorImageElement) doctorImageElement.removeClass('bot-speaking');

    if (listenButton && !isListening) {
        resetListenButtonUI();
        console.log("Listen button re-enabled after TTS finished.");
    } else if (listenButton && isListening) {
        console.log("TTS finished, but STT still marked as listening. STT might have stopped due to silence.");
    }
    // Re-enable reservation button if a valid diagnosis was made - Dihapus
    // if (reservationButton && lastDetectionResult && lastDetectionResult !== "NO_VALID_DIAGNOSIS") {
    //     console.log("Re-enabling reservation button after bot finished speaking.");
    //     reservationButton.removeAttribute('disabled');
    // }
}

// --- Core Speech Recognition Functions ---

function startListeningProcedure() {
    console.log("Attempting to start listening procedure...");
    try {
        if (!speechRec) {
            console.error("Cannot start listening: speechRec not initialized.");
            updateStatus('Error: Pengenal suara belum siap.', 3000);
            return;
        }
        speechRec.start(); // Start listening
        isListening = true;
        console.log("speechRec.start() called.");
        if (listenButton) {
            listenButton.html('<i class="fas fa-stop text-xl"></i><span class="text-base">Berhenti</span>');
            listenButton.addClass('listening');
            listenButton.addClass('recording-animation'); // Ensure this class is defined in CSS
        }
        updateStatus('Mendengarkan...');
    } catch (err) {
        console.error("Error starting speech recognition:", err);
        updateStatus('Gagal memulai pendengaran.', 3000);
        isListening = false;
        resetListenButtonUI(!isSpeaking); // Enable button if bot is not speaking
    }
}

function toggleListening() {
    console.log("toggleListening called...");
    if (isSpeaking) {
        console.warn("toggleListening blocked: Bot is speaking.");
        updateStatus('Harap tunggu bot selesai berbicara.', 2000);
        return;
    }
    if (!speechRec && !isListening) { // Check if speechRec is null AND not currently listening (edge case)
        console.error("toggleListening blocked: Speech Recognition not initialized!");
        updateStatus('Error: Fitur rekam suara tidak siap.', 3000);
        return;
    }
    // if (reservationButton) reservationButton.style('display', 'none'); // Dihapus

    if (!isListening) {
        // CHECK INITIAL DATA CONSENT
        if (consentGiven) {
            console.log("Consent already given. Starting listening procedure.");
            startListeningProcedure();
        } else {
            console.log("Consent not given yet. Showing initial consent popup.");
            Swal.fire({
                title: 'Persetujuan Penggunaan Data Suara',
                html: `<p>Saya mengerti dan menyetujui bahwa suara saya akan direkam dan diproses untuk tujuan analisis.</p>
                       <div class="flex items-center justify-center mt-2">
                         <input type="checkbox" id="persetujuan-data-check" class="form-checkbox h-5 w-5 text-blue-600">
                         <label for="persetujuan-data-check" class="ml-2 text-sm text-gray-700"> Saya Setuju</label>
                       </div>`,
                icon: 'info',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#aaa', // Softer cancel button
                confirmButtonText: 'Setuju & Mulai Bicara',
                cancelButtonText: 'Batal',
                allowOutsideClick: false,
                preConfirm: () => {
                    const checkbox = document.getElementById('persetujuan-data-check');
                    if (!checkbox) {
                        console.error("Element #persetujuan-data-check not found in Swal HTML!");
                        Swal.showValidationMessage('Terjadi kesalahan internal. Elemen persetujuan tidak ditemukan.');
                        return false;
                    }
                    if (!checkbox.checked) {
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
        // --- STOP LISTENING (MANUAL) ---
        console.log("Attempting to stop listening manually...");
        try {
            if (speechRec) {
                speechRec.stop(); // This will trigger speechEnd callback eventually
            } else {
                console.warn("Attempted to stop, but speechRec is null.");
                isListening = false; // Manually set if speechRec is already null
                speechEnd(); // Call speechEnd manually to reset UI if needed
                return;
            }
            if (listenButton) listenButton.removeClass('recording-animation');
            updateStatus('Menghentikan pendengaran...');
            // isListening will be set to false in speechEnd callback
        } catch (e) {
            console.error("Error stopping speech recognition:", e);
            updateStatus('Gagal menghentikan pendengaran.', 3000);
            isListening = false; // Ensure isListening is false on error
            speechEnd(); // Call speechEnd to reset UI
        }
    }
}

function gotSpeech() {
    console.log("gotSpeech callback triggered.");
    if (statusDisplay) updateStatus('Memproses ucapan...');

    if (speechRec && speechRec.resultValue && speechRec.resultString) {
        let userInput = speechRec.resultString;
        addMessageToTranscript('User', userInput);
        console.log("User input:", userInput);

        const lowerUserInput = userInput.toLowerCase().trim();

        if (lowerUserInput.includes("saya ingin reservasi")) {
            console.log("Voice command 'saya ingin reservasi' detected.");
            if (lastDetectionResult && lastDetectionResult !== "NO_VALID_DIAGNOSIS" && lastDetectedDisease) {
                speakText("Baik, saya akan memproses permintaan reservasi Anda.");
                handleReservationClick(); // Fungsi ini tetap ada untuk logika popup konfirmasi
            } else {
                speakText("Maaf, saya belum bisa memproses reservasi. Hasil analisis gejala belum tersedia. Silakan sebutkan gejala Anda terlebih dahulu.");
                addMessageToTranscript('Vira', "Untuk melakukan reservasi, hasil analisis gejala diperlukan. Silakan sebutkan gejala Anda.");
                resetListenButtonUI(!isSpeaking);
            }
        } else {
            console.log("Proceeding to symptom analysis with input:", userInput);
            sendToServerForDetection(userInput);
        }

        if (listenButton && !lowerUserInput.includes("saya ingin reservasi")) {
            listenButton.attribute('disabled', '');
        } else if (listenButton && lowerUserInput.includes("saya ingin reservasi") && !(lastDetectionResult && lastDetectionResult !== "NO_VALID_DIAGNOSIS" && lastDetectedDisease)) {
             resetListenButtonUI(!isSpeaking);
        }
    } else {
        console.warn("gotSpeech callback triggered but no valid result found (resultString or resultValue is missing).");
        updateStatus('Tidak dapat mengenali ucapan dengan jelas. Coba lagi.', 3000);
        isListening = false;
        resetListenButtonUI(!isSpeaking);
    }
}

// Send text to backend server for processing
async function sendToServerForDetection(inputText) {
    console.log(`Sending text to /api/process: "${inputText}"`);
    updateStatus('Menganalisis gejala...');
    if (listenButton) listenButton.attribute('disabled', '');
    // if (reservationButton) reservationButton.style('display', 'none'); // Dihapus
    lastDetectionResult = null;
    lastDetectedDisease = null;

    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: `inputText=${encodeURIComponent(inputText)}`
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} ${response.statusText}. Detail: ${errorText}`);
        }
        const data = await response.json();
        if (data && data.hasOwnProperty('hasilDeteksi')) {
            displayDetectionResults(data.hasilDeteksi);
        } else {
            throw new Error("Format respon server tidak sesuai ('hasilDeteksi' missing).");
        }
    } catch (error) {
        console.error("Error during sendToServerForDetection:", error);
        const errorMsg = `Maaf, gagal menghubungi server analisis. ${error.message}`;
        updateStatus('Gagal menganalisis gejala. Silakan coba lagi nanti.', 5000);
        lastDetectionResult = null;
        lastDetectedDisease = null;
        // updateReservationButtonVisibility(); // Dihapus
        speakText(errorMsg);
    } finally {
        console.log("sendToServerForDetection finished.");
        if (!isSpeaking && !isListening && listenButton) {
             resetListenButtonUI(true);
        }
    }
}


// --- Display Detection Results ---
function displayDetectionResults(hasilDeteksiString) {
    console.log("Displaying detection results. Raw input:", hasilDeteksiString);
    lastDetectionResult = "NO_VALID_DIAGNOSIS";
    lastDetectedDisease = null;

    const noDetectionKeywords = [
        'tidak ada penyakit',
        'belum dapat mendeteksi',
        'tidak ditemukan',
        'tidak terdeteksi',
        'gejala tidak cukup',
        'tidak ada indikasi penyakit spesifik',
        'manchester united'
    ];

    const isNoDetection = !hasilDeteksiString ||
        hasilDeteksiString.trim() === '' ||
        noDetectionKeywords.some(keyword => hasilDeteksiString.toLowerCase().includes(keyword));

    let speakPenyakit = "Tidak diketahui";
    let speakGejala = "N/A";
    let foundDiagnosis = false;

    if (isNoDetection) {
        console.log("No specific disease detected based on keywords or empty/null result.");
        const noDetectChatMsg = 'Gejala Anda belum kami kenali atau tidak terdeteksi adanya penyakit spesifik. Silakan coba ulangi dengan gejala yang lebih jelas atau berbeda.';
        const noDetectSpeakMsg = 'Gejala Anda belum kami kenali. Silakan coba ulangi dengan gejala yang lebih jelas atau berbeda.';

        addMessageToTranscript('Vira', noDetectChatMsg);
        lastDetectionResult = "NO_VALID_DIAGNOSIS";
        lastDetectedDisease = null;
        speakText(noDetectSpeakMsg);
        // updateReservationButtonVisibility(); // Dihapus
        return;
    }

    console.log("Potential disease detected. Processing detailed results.");
    lastDetectionResult = hasilDeteksiString.trim();

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
                currentPenyakit = value;
                currentFoundDiagnosis = true;
                lastDetectedDisease = value;
            } else if (labelLower.includes('gejala yang muncul') || labelLower.includes('gejala cocok')) {
                currentGejala = value;
            }
        } else if (line.trim()) {
            const escapedLine = line.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
            formattedHTML += `<li class="mb-1">${escapedLine}</li>`;
            if (!currentFoundDiagnosis && (line.trim().toLowerCase().includes('penyakit:') || line.trim().toLowerCase().includes('kemungkinan:'))) {
                const value = line.trim().split(':').slice(1).join(':').trim() || line.trim();
                if (value) {
                    currentPenyakit = value;
                    currentFoundDiagnosis = true;
                    lastDetectedDisease = value;
                }
            }
        }
    });
    formattedHTML += '</ul>';

    speakPenyakit = currentPenyakit;
    speakGejala = currentGejala;
    foundDiagnosis = currentFoundDiagnosis;

    let resultDiv = createDiv(formattedHTML);
    resultDiv.addClass('bot-transcript-bubble');
    resultDiv.addClass('detection-result');
    if (transcriptArea) {
        transcriptArea.child(resultDiv);
        try {
            transcriptArea.elt.scrollTo({ top: transcriptArea.elt.scrollHeight, behavior: 'smooth' });
        } catch (e) {
            transcriptArea.elt.scrollTop = transcriptArea.elt.scrollHeight;
        }
    }

    speakDetectionSummary(speakPenyakit, speakGejala, foundDiagnosis);
    // updateReservationButtonVisibility(); // Dihapus
}


// --- Speak Detection Summary ---
function speakDetectionSummary(penyakit, gejala, diagnosisDitemukan) {
    let textToSpeak = '';
    const validPenyakit = diagnosisDitemukan && penyakit && penyakit !== "Tidak diketahui" && penyakit.trim() !== '';

    if (validPenyakit) {
        textToSpeak = `Baik, berdasarkan analisis, kemungkinan penyakit Anda adalah ${penyakit}. `;
        if (gejala && gejala !== "N/A" && gejala.toLowerCase() !== 'n/a' && gejala.trim() !== '') {
        }
        // Mengubah pesan untuk tidak menyebut tombol fisik
        textToSpeak += `Jika Anda ingin membuat janji temu, silakan katakan "saya ingin reservasi".`;
        addMessageToTranscript('Vira', `Jika Anda ingin membuat janji temu, silakan katakan "saya ingin reservasi".`);
    } else {
        textToSpeak = "Analisis selesai. Untuk informasi lebih lanjut atau jika gejala berlanjut, disarankan untuk konsultasi dengan dokter.";
        lastDetectionResult = "NO_VALID_DIAGNOSIS";
        lastDetectedDisease = null;
    }
    console.log("Bot speaking diagnosis summary:", textToSpeak);
    speakText(textToSpeak);
    // updateReservationButtonVisibility(); // Dihapus
}


// --- Core Text-to-Speech (TTS) Function ---
function speakText(textToSpeak) {
    console.log(`Attempting to speak: "${textToSpeak}"`);
    if (!textToSpeak || textToSpeak.trim() === "") {
        console.warn("TTS: speakText called with empty or whitespace-only text. Skipping speech.");
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
        console.warn("TTS not available or speechSynth.speak is not a function. Cannot speak.");
        botFinishedSpeaking();
    }
}

// --- Handle Reservation Button Click -> Show Popup ---
// Fungsi ini tetap ada karena dipanggil oleh perintah suara "saya ingin reservasi"
function handleReservationClick() {
    console.log("Reservation triggered by voice. Preparing confirmation popup...");
    if (!lastDetectionResult || lastDetectionResult === "NO_VALID_DIAGNOSIS" || !lastDetectedDisease) {
        console.warn("Reservation action triggered, but no valid diagnosis data available.");
        if (!isSpeaking) {
            Swal.fire('Tidak Ada Diagnosis', 'Belum ada hasil analisis gejala yang valid untuk reservasi.', 'warning');
        }
        return;
    }
    const gejalaDataRaw = lastDetectionResult;
    const penyakitDisplay = lastDetectedDisease || "kemungkinan kondisi ini";

    Swal.fire({
        title: 'Konfirmasi Reservasi',
        html: `
            <p class="text-sm text-gray-700">Apakah Anda yakin ingin melanjutkan ke halaman reservasi untuk <b>${penyakitDisplay}</b> berdasarkan analisis gejala?</p>
            <div class="form-check text-start mt-3 mb-2 flex items-center justify-center">
                <input class="form-check-input h-5 w-5 text-blue-600 mr-2" type="checkbox" value="" id="konfirmasi-reservasi-check">
                <label class="form-check-label text-sm text-gray-600" for="konfirmasi-reservasi-check">
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
            const checkbox = document.getElementById('konfirmasi-reservasi-check');
            if (!checkbox || !checkbox.checked) {
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
            if (listenButton && !isListening && !isSpeaking) {
                resetListenButtonUI(true);
            }
        }
    });
}

// --- Redirect to Reservation Page (Called AFTER confirmation) ---
function goToReservationPage(diagnosisData) {
    console.log("Redirecting function called...");
    let diagnosisParam = "";
    if (diagnosisData && diagnosisData !== "NO_VALID_DIAGNOSIS") {
        diagnosisParam = encodeURIComponent(diagnosisData);
        console.log("Valid symptoms data (raw server response) encoded to send:", diagnosisParam);
    } else {
        console.warn("goToReservationPage called without valid diagnosis data. Sending generic message.");
        diagnosisParam = encodeURIComponent("Gejala tidak dispesifikasi atau tidak valid dari analisis sebelumnya.");
    }
    const targetPage = 'reservasi.html'; // Make sure this page exists
    const reservationUrl = `${targetPage}?diagnosis=${diagnosisParam}`;
    console.log("Redirecting to:", reservationUrl);
    window.location.href = reservationUrl;
}

// --- Add Message to Transcript ---
function addMessageToTranscript(sender, message) {
    if (!sender || !message || !transcriptArea) {
        console.warn("addMessageToTranscript: sender, message, or transcriptArea is missing.");
        return;
    }

    let messageDiv = createDiv('');
    let bubbleClass = (sender === 'User') ? 'user-transcript-bubble' : 'bot-transcript-bubble';
    const safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    messageDiv.html(`<span class="sender-label">[${sender}]:</span> ${safeMessage}`);
    messageDiv.addClass(bubbleClass);

    transcriptArea.child(messageDiv);
    try {
        transcriptArea.elt.scrollTo({ top: transcriptArea.elt.scrollHeight, behavior: 'smooth' });
    } catch (scrollError) {
        transcriptArea.elt.scrollTop = transcriptArea.elt.scrollHeight;
    }
}


// --- Speech Recognition Error & End Callbacks ---
function speechError(error) {
    console.error("Speech Recognition Error:", error);
    isListening = false;
    let userMessage = 'Maaf, terjadi kesalahan saat mendengar.';
    if (error && error.error) {
        switch (error.error) {
            case 'no-speech':
                userMessage = 'Tidak ada suara terdeteksi. Pastikan mikrofon aktif dan coba lagi.';
                break;
            case 'audio-capture':
                userMessage = 'Gagal menangkap audio. Periksa mikrofon dan izin browser.';
                break;
            case 'not-allowed':
                userMessage = 'Izin mikrofon ditolak. Periksa pengaturan browser Anda.';
                break;
            case 'network':
                userMessage = 'Masalah jaringan saat mencoba mengenali suara. Periksa koneksi Anda.';
                break;
            case 'aborted':
                userMessage = 'Proses pengenalan suara dihentikan.';
                break;
            default:
                userMessage = `Terjadi error pengenal suara (${error.error}). Coba lagi.`;
        }
    }
    updateStatus(userMessage, 5000);
    addMessageToTranscript('System', userMessage);
    resetListenButtonUI(!isSpeaking);

    lastDetectionResult = null;
    lastDetectedDisease = null;
    // updateReservationButtonVisibility(); // Dihapus
}

function speechEnd() {
    console.log("Speech Recognition session ended (speechEnd callback).");
    isListening = false;

    if (listenButton && !isSpeaking) {
        resetListenButtonUI();
        console.log("speechEnd: Resetting button UI (bot not speaking, STT ended).");
    } else if (listenButton && isSpeaking) {
        listenButton.removeClass('recording-animation');
        console.log("speechEnd: Bot is speaking, STT ended (e.g. due to silence). Only removing recording animation.");
    }
}

// --- UI & Status Helpers ---
function resetListenButtonUI(enable = true) {
    if (listenButton) {
        listenButton.removeClass('listening');
        listenButton.removeClass('recording-animation');
        listenButton.html('<i class="fas fa-microphone-alt text-xl"></i><span class="text-base">Mulai Bicara</span>');
        if (enable) {
            listenButton.removeAttribute('disabled');
        } else {
            listenButton.attribute('disabled', '');
        }
    }
}

// function updateReservationButtonVisibility() { // Fungsi ini tidak lagi diperlukan
//     // if (reservationButton) {
//     //     if (lastDetectedDisease && lastDetectionResult && lastDetectionResult !== "NO_VALID_DIAGNOSIS") {
//     //         console.log("UI UPDATE: Showing reservation button for disease:", lastDetectedDisease);
//     //         reservationButton.style('display', 'flex');
//     //         reservationButton.removeAttribute('disabled');
//     //     } else {
//     //         console.log("UI UPDATE: Hiding reservation button (no valid diagnosis or disease not parsed).");
//     //         reservationButton.style('display', 'none');
//     //     }
//     // } else {
//     //     // console.warn("UI UPDATE: Reservation button element not found when trying to update visibility as it has been removed.");
//     // }
// }

function updateStatus(message, duration = 0) {
    if (!statusDisplay) return;
    clearTimeout(statusTimeout);
    const safeMessage = message ? message.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
    statusDisplay.html(safeMessage);
    if (duration > 0) {
        statusTimeout = setTimeout(() => {
            if (statusDisplay.html() === safeMessage) {
                statusDisplay.html('');
            }
        }, duration);
    }
}

// --- DOMContentLoaded Event Listener ---
document.addEventListener('DOMContentLoaded', (event) => {
    console.log("DOM fully loaded and parsed.");
    if (typeof setup === 'function') {
        setup();
    } else {
        console.error("FATAL: p5.js 'setup' function not found! Application cannot start.");
        const body = document.querySelector('body');
        if (body) {
            body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: sans-serif; color: red;"><h1>Kesalahan Kritis</h1><p>Fungsi utama aplikasi (setup) tidak ditemukan. Aplikasi tidak dapat dimulai. Pastikan file JavaScript dimuat dengan benar.</p></div>';
        }
    }
});
// Global variables
let speechRec;
let speechSynth;
let transcriptArea;
let listenButton;
let statusDisplay;
let speakingIndicator;
let doctorImageElement;
let isListening = false;
let isSpeaking = false;
let lastDetectionResult = null;
let lastDetectedDisease = null;
let greetingSpoken = false;
let statusTimeout;
let consentGiven = false;
let fullDetectionDataString = null; // NEW: To store the full raw detection string for reservation page

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
    doctorImageElement = select('#doctor-image');

    // Check if all essential UI elements are selected
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
            // Condition for reservation trigger: lastDetectedDisease must be a valid disease name (not 'Tidak Terdeteksi')
            // AND lastDetectionResult must be "VALID_DIAGNOSIS".
            console.log("DEBUG: lastDetectedDisease before reservation check:", lastDetectedDisease);
            console.log("DEBUG: lastDetectionResult before reservation check:", lastDetectionResult);

            if (lastDetectionResult === "VALID_DIAGNOSIS") {
                speakText("Baik, saya akan memproses permintaan reservasi Anda.");
                handleReservationClick(); // This function handles the confirmation popup
            } else {
                speakText("Maaf, saya belum bisa memproses reservasi. Hasil analisis gejala belum tersedia atau belum cukup. Silakan sebutkan gejala Anda terlebih dahulu.");
                addMessageToTranscript('Vira', "Untuk melakukan reservasi, hasil analisis gejala yang valid dan cukup diperlukan. Silakan sebutkan gejala Anda.");
                resetListenButtonUI(!isSpeaking);
            }
        } else {
            console.log("Proceeding to symptom analysis with input:", userInput);
            sendToServerForDetection(userInput);
        }

        if (listenButton && !lowerUserInput.includes("saya ingin reservasi")) {
            listenButton.attribute('disabled', '');
        } else if (listenButton && lowerUserInput.includes("saya ingin reservasi") && !(lastDetectionResult && lastDetectionResult !== "NO_VALID_DIAGNOSIS" && lastDetectionResult !== "INSUFFICIENT_SYMPTOMS" && lastDetectedDisease)) {
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
    lastDetectionResult = null;
    lastDetectedDisease = null; // Reset this before new detection

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
    lastDetectionResult = "NO_VALID_DIAGNOSIS"; // Default to no valid diagnosis
    lastDetectedDisease = null; // Ensure this is reset at the start of new detection
    fullDetectionDataString = hasilDeteksiString; // Store the full raw string for potential reservation page

    const noDetectionKeywords = [
        'tidak ada penyakit',
        'belum dapat mendeteksi',
        'tidak ditemukan',
        'gejala tidak cukup',
        'tidak ada indikasi penyakit spesifik',
        'manchester united' // Example of an irrelevant keyword
    ];

    // Check if the string explicitly indicates a "no detection" scenario,
    // but allow for the "Tidak Terdeteksi" from NLP if it contains symptoms.
    const isNoDetection = !hasilDeteksiString ||
        hasilDeteksiString.trim() === '' ||
        (noDetectionKeywords.some(keyword => hasilDeteksiString.toLowerCase().includes(keyword)) &&
         !hasilDeteksiString.toLowerCase().includes('gejala yang muncul:')); // Add condition to not trigger if symptoms are present

    let currentPenyakit = "Tidak diketahui";
    let currentGejala = "N/A";
    let currentFoundDiagnosis = false;
    let symptomCount = 0; // Initialize symptom count

    // --- Step 1: Parse the incoming string to extract data ---
    const lines = hasilDeteksiString.split('\n');
    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
            const label = parts[0].trim();
            const value = parts.slice(1).join(':').trim();
            const labelLower = label.toLowerCase();

            if (labelLower.includes('penyakit terdeteksi') || labelLower.includes('kemungkinan penyakit')) {
                currentPenyakit = value;
                if (value.toLowerCase() !== 'tidak terdeteksi') {
                    currentFoundDiagnosis = true;
                }
                lastDetectedDisease = value; // Ensure lastDetectedDisease is set here
            } else if (labelLower.includes('gejala yang muncul') || labelLower.includes('gejala cocok')) {
                currentGejala = value;
            }
        }
    });

    // --- Step 2: Calculate symptom count, filtering out "Tidak ada gejala spesifik" ---
    if (currentGejala && currentGejala !== "N/A" && currentGejala.trim() !== '') {
        const symptomsArray = currentGejala.split(',').map(s => s.trim()).filter(s => s !== '');
        // Filter out the specific phrase "Tidak ada gejala spesifik" from counting as a symptom
        const actualSymptoms = symptomsArray.filter(s => s.toLowerCase() !== 'tidak ada gejala spesifik');
        symptomCount = actualSymptoms.length;
    }

    let formattedHTML = ''; // Initialize formattedHTML here
    let bubbleClass = 'bot-transcript-bubble'; // Default class

    // --- Step 3: Determine the response logic based on parsed data and symptom count ---

    // Case A: No actual symptoms detected (symptomCount is 0)
    if (symptomCount === 0) {
        formattedHTML = `<span class="sender-label">[Bot]:</span> Gejala yang Anda sampaikan belum kami mengerti.`; // Plain text response
        lastDetectionResult = "NO_VALID_DIAGNOSIS"; // Explicitly set to NO_VALID_DIAGNOSIS
        bubbleClass += ' error-border'; // Add error border class (red)
        lastDetectedDisease = null; // Ensure it's null for no detection
    }
    // Case B: Symptoms detected, but less than 3 AND no confident diagnosis
    else if (symptomCount > 0 && symptomCount < 3 && !currentFoundDiagnosis) {
        formattedHTML = `<span class="sender-label">[Bot]:</span> Gejala yang terdeteksi adalah: <strong>${currentGejala}</strong>. <br>
                         Gejala Anda masih belum cukup untuk kami Analisis.`;
        lastDetectionResult = "INSUFFICIENT_SYMPTOMS"; // Set this status
        bubbleClass += ' warning-border'; // Add warning border class (orange)
        // lastDetectedDisease remains as parsed (e.g., 'Tidak Terdeteksi' from NLP), which is fine here.
    }
    // Case C: Confident diagnosis (currentFoundDiagnosis is true)
    else if (currentFoundDiagnosis) {
        formattedHTML = '<span class="sender-label">[Bot]:</span> <strong>Hasil Analisis:</strong><ul class="list-disc list-inside ml-4 mt-1">';
        lines.forEach(line => { // Re-iterate lines to build full HTML for valid diagnosis
            const parts = line.split(':');
            if (parts.length >= 2) {
                const label = parts[0].trim();
                const value = parts.slice(1).join(':').trim();
                const escapedLabel = label.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const escapedValue = value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                formattedHTML += `<li class="mb-1"><strong class="font-medium">${escapedLabel}:</strong> ${escapedValue}</li>`;
            } else if (line.trim()) {
                const escapedLine = line.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
                formattedHTML += `<li class="mb-1">${escapedLine}</li>`;
            }
        });
        formattedHTML += '</ul>';
        lastDetectionResult = "VALID_DIAGNOSIS"; // Explicitly set for valid diagnosis
        // No specific border class for success
    }
    // Fallback for any other unexpected cases (should be rare with refined NLP and logic)
    else {
        // This case should ideally not be reached if NLP and parsing are robust.
        // It's a safety net, treated like NO_VALID_DIAGNOSIS.
        formattedHTML = `<span class="sender-label">[Bot]:</span> Gejala yang Anda sampaikan belum kami mengerti.`;
        lastDetectionResult = "NO_VALID_DIAGNOSIS";
        bubbleClass += ' error-border';
        lastDetectedDisease = null;
    }

    // --- Step 4: Append the HTML to the transcript ---
    let resultDiv = createDiv(formattedHTML);
    resultDiv.addClass(bubbleClass); // Apply the determined class
    resultDiv.addClass('detection-result'); // Keep this for general styling
    if (transcriptArea) {
        transcriptArea.child(resultDiv);
        try {
            transcriptArea.elt.scrollTo({ top: transcriptArea.elt.scrollHeight, behavior: 'smooth' });
        } catch (e) {
            transcriptArea.elt.scrollTop = transcriptArea.elt.scrollHeight;
        }
    }

    // --- Step 5: Call speakDetectionSummary for voice response and reservation prompt ---
    speakDetectionSummary(currentPenyakit, currentGejala, currentFoundDiagnosis);
}


// --- Speak Detection Summary ---
function speakDetectionSummary(penyakit, gejala, diagnosisDitemukan) {
    let textToSpeak = '';

    // Condition to add reservation prompt: only if it's a VALID_DIAGNOSIS
    const shouldPromptReservation = (lastDetectionResult === "VALID_DIAGNOSIS");

    if (lastDetectionResult === "INSUFFICIENT_SYMPTOMS") {
        textToSpeak = `Gejala yang terdeteksi adalah ${gejala}. Gejala Anda masih belum cukup untuk kami Analisis.`;
    } else if (lastDetectionResult === "VALID_DIAGNOSIS") { // Explicitly check for VALID_DIAGNOSIS
        textToSpeak = `Baik, berdasarkan analisis, kemungkinan penyakit Anda adalah ${penyakit}. `;
    } else { // This is NO_VALID_DIAGNOSIS
        textToSpeak = "Gejala yang Anda sampaikan belum kami mengerti.";
    }

    // Add reservation prompt if applicable
    if (shouldPromptReservation) {
        textToSpeak += ` Jika Anda ingin membuat janji temu, silakan katakan "saya ingin reservasi".`;
        addMessageToTranscript('Vira', `Jika Anda ingin membuat janji temu, silakan katakan "saya ingin reservasi".`); // Add to transcript
    }

    console.log("Bot speaking diagnosis summary:", textToSpeak);
    speakText(textToSpeak);
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
    // Condition for reservation trigger: lastDetectedDisease must be a valid disease name (not 'Tidak Terdeteksi')
    // AND lastDetectionResult must be "VALID_DIAGNOSIS".
    if (lastDetectedDisease && lastDetectedDisease.toLowerCase() !== 'tidak terdeteksi' && lastDetectionResult === "VALID_DIAGNOSIS") {
        console.log("Valid diagnosis found for reservation:", lastDetectedDisease);
        const gejalaDataRaw = fullDetectionDataString; // Use fullDetectionDataString here
        const penyakitDisplay = lastDetectedDisease;

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
    } else {
        console.warn("Reservation action triggered, but no valid or sufficient diagnosis data available.");
        if (!isSpeaking) {
            Swal.fire('Tidak Ada Diagnosis', 'Belum ada hasil analisis gejala yang valid atau cukup untuk reservasi.', 'warning');
        }
    }
}

// --- Redirect to Reservation Page (Called AFTER confirmation) ---
function goToReservationPage(diagnosisData) {
    console.log("Redirecting function called...");
    let diagnosisParam = "";
    // Ensure that 'Tidak Terdeteksi' is not considered a valid diagnosis for direct reservation
    if (diagnosisData && diagnosisData !== "NO_VALID_DIAGNOSIS" && diagnosisData !== "INSUFFICIENT_SYMPTOMS" && !diagnosisData.toLowerCase().includes('penyakit terdeteksi: tidak terdeteksi')) {
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
        resetRecording(); // Reset rekaman setelah pengiriman
    } catch (error) {
        console.error('Error:', error);
        viewer.innerHTML = "Terjadi kesalahan saat mengirim data.";
    }
}

function resetRecording() {
    recording = ""; // Reset rekaman
    uniqueTexts.clear(); // Kosongkan Set setelah pengiriman
}
});

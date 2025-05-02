
let speechRec;
let speechSynth;
let transcriptArea;
let listenButton;
let statusDisplay;
let speakingIndicator;
let showMapButton;
let doctorImageElement; // Referensi ke elemen gambar dokter
let isListening = false;
let isSpeaking = false;
let lastDetectionResult = null;
let currentMapInstance = null;
let greetingSpoken = false;

// --- Fungsi Setup p5.js ---
function setup() {
    noCanvas();
    console.log("Setup started (No Canvas).");

    transcriptArea = select('#transcript-area');
    listenButton = select('#listenButton');
    statusDisplay = select('#status');
    speakingIndicator = select('#speaking-indicator');
    showMapButton = select('#showMapBtn');
    doctorImageElement = select('#doctor-image');

    if (!transcriptArea || !listenButton || !statusDisplay || !speakingIndicator || !showMapButton || !doctorImageElement) {
        console.error("Fatal Error: One or more essential UI elements not found! Check HTML IDs.");
        alert("Terjadi kesalahan saat memuat antarmuka. Silakan refresh halaman.");
        return;
    }
    console.log("UI elements selected.");

    if (typeof p5.Speech !== 'undefined') {
        speechSynth = new p5.Speech();
        speechSynth.onLoad = voiceReady;
        speechSynth.onStart = botStartedSpeaking;
        speechSynth.onEnd = botFinishedSpeaking;
        speechSynth.setLang('id-ID');
        console.log("p5.Speech (TTS) initialized.");
    } else { /* ... error handling TTS ... */ }

    if (typeof p5.SpeechRec !== 'undefined') {
        try {
            initializeSpeechRec();
            console.log("p5.SpeechRec initialized.");
            if (listenButton) {
                 listenButton.removeAttribute('disabled');
                 listenButton.mousePressed(toggleListening);
                 console.log("Listen button enabled and listener attached.");
            }
        } catch (e) { /* ... error handling STT ... */ }
    } else { /* ... error handling STT library not loaded ... */ }

     if (showMapButton) {
         showMapButton.mousePressed(showMapAndReservationPopup);
     }

    addMessageToTranscript('Bot', 'Halo! Saya siap membantu. Klik tombol "Mulai Bicara" lalu sebutkan gejala Anda, atau katakan "Saya ingin reservasi".');
    console.log("Initial greeting added to transcript.");
    updateStatus('');
    console.log("Setup complete.");
}

// --- Fungsi Inisialisasi SpeechRec ---
function initializeSpeechRec() {
    try {
        speechRec = new p5.SpeechRec('id-ID', gotSpeech);
        speechRec.continuous = false;
        speechRec.interimResults = false;
        speechRec.onError = speechError;
        speechRec.onEnd = speechEnd;
        console.log("Speech Recognition engine configured.");
    } catch (e) { /* ... error handling ... */ throw e; }
}

// --- Fungsi Callback dan Helper ---

function voiceReady() {
    console.log("Speech Synthesis engine ready.");
    if (!greetingSpoken && speechSynth && !isSpeaking) {
         const greetingMsg = "Halo! Selamat datang di layanan konsultasi gejala.";
         console.log("Attempting to speak greeting...");
         speakText(greetingMsg);
         greetingSpoken = true;
    }
}

function botStartedSpeaking() {
    console.log("Bot started speaking.");
    isSpeaking = true;
    if (speakingIndicator) speakingIndicator.style('display', 'flex');
    if (listenButton) listenButton.attribute('disabled', '');
    if (showMapButton) showMapButton.attribute('disabled', '');
    updateStatus('Bot sedang berbicara...');
    if (doctorImageElement) doctorImageElement.addClass('bot-speaking');
}

function botFinishedSpeaking() {
    console.log("Bot finished speaking.");
    isSpeaking = false;
    if (speakingIndicator) speakingIndicator.style('display', 'none');
    updateStatus('');
    if (doctorImageElement) doctorImageElement.removeClass('bot-speaking');

    if (listenButton && !isListening) {
        listenButton.removeAttribute('disabled');
         listenButton.html('<i class="fas fa-microphone-alt text-xl"></i><span class="text-base">Mulai Bicara</span>');
         listenButton.removeClass('listening');
        console.log("Listen button re-enabled after bot finished speaking.");
    }

    if (lastDetectionResult && lastDetectionResult !== "NO_VALID_DIAGNOSIS") {
         if (showMapButton) {
             showMapButton.style('display', 'flex');
             showMapButton.removeAttribute('disabled');
             console.log("Show Map button displayed and enabled.");
         }
         // Jangan reset lastDetectionResult di sini
    } else {
         if (showMapButton) showMapButton.style('display', 'none');
         lastDetectionResult = null;
    }
}

function toggleListening() {
    if (isSpeaking) { /* ... handling ... */ return; }
    if (!speechRec) { /* ... handling ... */ return; }
    if (showMapButton) showMapButton.style('display', 'none');

    if (!isListening) {
        try {
            if (!speechRec) initializeSpeechRec();
            speechRec.start(false, false);
            isListening = true;
            if (listenButton) {
                listenButton.html('<i class="fas fa-stop text-xl"></i><span class="text-base">Berhenti</span>');
                listenButton.addClass('listening');
            }
            updateStatus('Mendengarkan...');
            console.log("Listening started...");
        } catch (err) { /* ... error handling ... */ }
    } else {
        try {
            if(speechRec) speechRec.stop();
            console.log("Requested speech recognition stop.");
            updateStatus('Berhenti mendengarkan...');
        } catch(e) { /* ... error handling ... */ }
    }
}


function gotSpeech() {
     if (statusDisplay) statusDisplay.html('Memproses ucapan...');
     console.log("Speech recognized (final result expected)!");

     if (speechRec && speechRec.resultValue) {
         let confidence = speechRec.resultConfidence;
         let userInput = speechRec.resultString;
         console.log(`Speech recognized: "${userInput}" (Confidence: ${confidence.toFixed(2)})`);
         addMessageToTranscript('User', userInput); // Panggil fungsi yang sudah diperbarui

         const userInputLower = userInput.toLowerCase();
         const reservationKeywords = ["reservasi", "pesan rumah sakit", "booking rs", "daftar rumah sakit", "cari rumah sakit"];
         let isReservationRequest = reservationKeywords.some(keyword => userInputLower.includes(keyword));

         if (isReservationRequest) {
             console.log("Reservation keyword detected.");
             updateStatus('Memproses permintaan reservasi...');
             addMessageToTranscript('Bot', 'Baik, saya akan menampilkan peta rumah sakit terdekat.'); // Panggil fungsi yang sudah diperbarui
             speakText('Baik, saya akan menampilkan peta rumah sakit terdekat.');
             showMapAndReservationPopup();
         } else {
             updateStatus('Memproses ucapan untuk analisis gejala...');
             sendToServerForDetection(userInput);
         }
         if (listenButton) listenButton.attribute('disabled', '');

     } else {
         console.log("gotSpeech called but no valid result found.");
         updateStatus('Tidak dapat mengenali ucapan.', 3000);
         speechEnd();
     }
}

async function sendToServerForDetection(inputText) {
    updateStatus('Menganalisis gejala...');
    if (listenButton) listenButton.attribute('disabled', '');

    try {
        const response = await fetch('/api/process', { // Pastikan endpoint API ini benar
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
            body: `inputText=${encodeURIComponent(inputText)}`
        });
        if (!response.ok) { /* ... error handling ... */ }
        const data = await response.json();
        if (data && data.hasOwnProperty('hasilDeteksi')) {
            displayDetectionResults(data.hasilDeteksi); // Panggil fungsi yang sudah diperbarui
        } else { /* ... error handling ... */ }
    } catch (error) { /* ... error handling ... */ }
}

// --- Fungsi displayDetectionResults (PASTIKAN PAKAI CLASS BARU) ---
function displayDetectionResults(hasilDeteksiString) {
    console.log("Raw detection result string:", hasilDeteksiString);
    lastDetectionResult = "NO_VALID_DIAGNOSIS";
    diagnosisAvailable = false;
    if (showMapButton) showMapButton.style('display', 'none');

    let noDetectionKeywords = ['tidak ada penyakit', 'belum dapat mendeteksi', 'tidak ditemukan', 'tidak terdeteksi'];
    let isNoDetection = !hasilDeteksiString || noDetectionKeywords.some(keyword => hasilDeteksiString.toLowerCase().includes(keyword));

    if (isNoDetection) {
        const noDetectionMsg = 'Berdasarkan gejala Anda, saya belum dapat mendeteksi penyakit spesifik.';
        addMessageToTranscript('Bot', noDetectionMsg); // Gunakan fungsi addMessage yang benar
        speakText(noDetectionMsg);
        return;
    }

    diagnosisAvailable = true;
    lastDetectionResult = hasilDeteksiString;

    const lines = hasilDeteksiString.trim().split('\n');
    let formattedHTML = '<span class="sender-label">[Bot]:</span> Hasil Analisis:<ul class="list-disc list-inside ml-4 mt-1">';
    let penyakitTerdeteksi = "Tidak diketahui";
    let gejalaCocok = "N/A";

    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
            const label = parts[0].trim();
            const value = parts.slice(1).join(':').trim();
            const safeLabel = label.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeValue = value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            formattedHTML += `<li class="mb-1"><strong class="font-medium">${safeLabel}:</strong> ${safeValue}</li>`;
            const labelLower = label.toLowerCase();
            if (labelLower.includes('penyakit terdeteksi') || labelLower.includes('kemungkinan penyakit')) { penyakitTerdeteksi = value; }
            else if (labelLower.includes('gejala yang muncul') || labelLower.includes('gejala cocok')) { gejalaCocok = value; }
        } else if (line.trim()) {
            const safeLine = line.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
            formattedHTML += `<li class="mb-1">${safeLine}</li>`;
        }
    });
    formattedHTML += '</ul>';

    let resultDiv = createDiv(formattedHTML);
    // Terapkan class CSS yang benar untuk hasil deteksi
    resultDiv.addClass('bot-transcript-bubble detection-result'); // <<<--- PERBAIKAN UTAMA
    if (transcriptArea) {
        transcriptArea.child(resultDiv);
        transcriptArea.elt.scrollTo({ top: transcriptArea.elt.scrollHeight, behavior: 'smooth' });
    }

    speakDetectionResults(penyakitTerdeteksi, gejalaCocok);
}


function speakDetectionResults(penyakit, gejala) {
    let textToSpeak = `Baik, kemungkinan penyakitnya adalah ${penyakit}. `;
    if (gejala !== "N/A" && gejala.toLowerCase() !== 'n/a') {
        textToSpeak += `Gejala yang cocok: ${gejala}.`;
    }
    console.log("Bot will speak diagnosis summary:", textToSpeak);
    speakText(textToSpeak);
}

function speakText(textToSpeak) {
    if (speechSynth && typeof speechSynth.speak === 'function') {
        try {
            updateStatus('Bot sedang berbicara...');
            speechSynth.speak(textToSpeak);
        } catch (e) {
            console.error("Error triggering speechSynth.speak:", e);
            botFinishedSpeaking();
        }
    } else {
        console.warn("TTS not available or not ready.");
        botFinishedSpeaking();
    }
}


async function showMapAndReservationPopup() {
    console.log("showMapAndReservationPopup triggered.");
    if (typeof Swal === 'undefined') { console.error("SweetAlert2 is not loaded!"); return; }

    let petaHTML = '<div id="leaflet-map-hasil" class="rounded-md border border-slate-300"></div>'; // ID peta di popup
    let userMarker;
    const defaultLocation = { lat: -7.8127, lng: 110.3651 }; // UMY
    let currentUserLocation = null;

    await Swal.fire({
        title: '<i class="fas fa-map-location-dot mr-2"></i> Lokasi Rumah Sakit Terdekat',
        html: petaHTML + '<p id="swal-map-status" class="text-sm text-slate-600 mt-2 text-center"></p>',
        width: '80%',
        allowOutsideClick: false,
        showConfirmButton: true,
        confirmButtonText: '<i class="fas fa-calendar-check mr-2"></i> Reservasi Rumah Sakit',
        confirmButtonColor: '#10B981',
        showCancelButton: true,
        cancelButtonText: 'Tutup',
        customClass: { popup: 'rounded-xl' },

        didOpen: (popupElement) => {
            const mapElement = popupElement.querySelector('#leaflet-map-hasil');
            const mapStatusEl = popupElement.querySelector('#swal-map-status');
            if (!mapElement) { console.error("Map element not found!"); return; }
            mapStatusEl.innerHTML = '<i>Memuat peta...</i>';

            try {
                if (typeof L === 'undefined') { throw new Error("Leaflet library not loaded!"); }
                if (currentMapInstance) { currentMapInstance.remove(); currentMapInstance = null; }

                currentMapInstance = L.map(mapElement).setView(defaultLocation, 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 18,
                }).addTo(currentMapInstance);

                setTimeout(() => {
                    if (currentMapInstance) currentMapInstance.invalidateSize();
                    mapStatusEl.innerHTML = '<i>Mencari lokasi Anda...</i>';

                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            async (position) => {
                                currentUserLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                                if (currentMapInstance) {
                                    mapStatusEl.innerHTML = '<i>Mencari rumah sakit terdekat...</i>';
                                    currentMapInstance.setView(currentUserLocation, 14);
                                    userMarker = L.marker(currentUserLocation).addTo(currentMapInstance).bindPopup('Lokasi Anda').openPopup();
                                    await fetchAndDisplayHospitalMarkers(currentUserLocation.lat, currentUserLocation.lng, currentMapInstance, mapStatusEl);
                                }
                            },
                            async (error) => { /* ... error handling geolocation ... */ },
                            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
                        );
                    } else { /* ... handle no geolocation support ... */ }
                }, 150);

            } catch (e) { /* ... error handling map init ... */ }
        }, // end didOpen

        willClose: () => { /* ... cleanup map ... */ },
        didClose: () => { /* ... enable button ... */ }

    }).then((result) => { /* ... handle popup result ... */ });
}


// Fungsi fetchAndDisplayHospitalMarkers (Hanya Tambah Marker)
async function fetchAndDisplayHospitalMarkers(lat, lng, mapInstance, statusElement) {
    if (!mapInstance) { console.error("Missing map instance for fetching hospitals."); return; }
    if (statusElement) statusElement.innerHTML = '<i>Mencari RS terdekat...</i>';

    try {
        const response = await fetch(`/api/nearby-hospitals?lat=${lat}&lng=${lng}`); // Pastikan endpoint benar
        if (!response.ok) { throw new Error(`Failed to fetch hospitals (${response.status})`); }
        const hospitals = await response.json();

        if (!hospitals || !Array.isArray(hospitals) || hospitals.length === 0) { /* ... handling no hospitals ... */ return; }

        const bounds = L.latLngBounds();
         if (mapInstance.getCenter()) { try { bounds.extend(mapInstance.getCenter()); } catch(e){} }

        let markersAdded = 0;
        hospitals.slice(0, 5).forEach(hospital => { /* ... add markers ... */ });

        if (statusElement) statusElement.innerHTML = `Menampilkan ${markersAdded} RS terdekat.`;
        if (bounds.isValid()) { try { mapInstance.fitBounds(bounds, { padding: [40, 40] }); } catch (e) {} }
        setTimeout(() => { if (mapInstance) mapInstance.invalidateSize(); }, 50);

    } catch (error) { /* ... error handling fetch hospitals ... */ }
}


// Fungsi handleReservation (Placeholder)
function handleReservation() {
     console.log("Triggering reservation action...");
     showMapAndReservationPopup();
}

// Fungsi saveAsPDF
function saveAsPDF(diagnosaContent) {
     if (typeof jsPDF === 'undefined' || typeof window.jspdf?.jsPDF === 'undefined') { /* ... error handling ... */ return; }
     const { jsPDF } = window.jspdf;
     try { /* ... (Implementasi PDF sama) ... */ } catch (e) { /* ... error handling ... */ }
}


// --- Fungsi addMessageToTranscript (PASTIKAN PAKAI CLASS BARU) ---
function addMessageToTranscript(sender, message) {
    if (!transcriptArea) { console.error("Transcript area not found."); return; }
    let messageDiv = createDiv('');
    // Tentukan class bubble utama berdasarkan sender
    let bubbleClass = (sender === 'User') ? 'user-transcript-bubble' : 'bot-transcript-bubble';
    // Tambahkan class hasil deteksi jika perlu
    // (Logika ini mungkin perlu disempurnakan tergantung bagaimana Anda menandai hasil)
    if (sender === 'Bot' && message.toLowerCase().includes('hasil analisis:')) {
         bubbleClass += ' detection-result';
    }
    messageDiv.addClass(bubbleClass); // <<<--- INI YANG PENTING

    const safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    messageDiv.html(`<span class="sender-label">[${sender}]:</span> ${safeMessage}`);
    transcriptArea.child(messageDiv);
    transcriptArea.elt.scrollTo({ top: transcriptArea.elt.scrollHeight, behavior: 'smooth' });
}


// Fungsi speechError
function speechError(error) {
    console.error("Speech Recognition Error:", error);
    let errorMessage = 'Terjadi error saat mendengar.';
    if (error && error.error) { /* ... (switch case error handling) ... */ }
    else if (error) { errorMessage = `Error: ${error}`; }
    updateStatus(errorMessage, 4000);
    isListening = false;
    if (listenButton && !isSpeaking) { /* ... (reset button state) ... */ }
     if (showMapButton) showMapButton.style('display', 'none');
}

// Fungsi speechEnd
function speechEnd() {
    console.log("Speech Recognition session ended.");
    isListening = false;

    if (!isSpeaking && !lastDetectionResult) { /* ... (reset UI) ... */ }
    else { /* ... (defer UI reset) ... */ }
}


// Helper updateStatus
let statusTimeout;
function updateStatus(message, duration = 0) {
    if (statusDisplay) {
        clearTimeout(statusTimeout);
        statusDisplay.html(message);
        if (duration > 0) {
            statusTimeout = setTimeout(() => {
                if (statusDisplay.html() === message) { statusDisplay.html(''); }
            }, duration);
        }
    } else { console.warn("statusDisplay element not found."); }
}

// --- Event Listener DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', (event) => {
    console.log("DOM fully loaded and parsed");
    if (typeof setup === 'function') { setup(); }
    else { console.error("p5.js setup function not found!"); }
});


// ========================================================
// KODE sketch.js - VERSI DENGAN KONFIRMASI RESERVASI (V4.0)
// FIX: Data terkirim ke reservasi (encodeURIComponent + param name)
// ADD: Popup konfirmasi SweetAlert2 dengan checkbox
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
let lastDetectionResult = null; // Menyimpan hasil deteksi MENTAH terakhir yang valid
let lastDetectedDisease = null; // Menyimpan NAMA PENYAKIT terakhir yang valid
let greetingSpoken = false;
let statusTimeout;

// --- Fungsi Setup p5.js ---
function setup() {
    noCanvas();
    transcriptArea = select('#transcript-area');
    listenButton = select('#listenButton');
    statusDisplay = select('#status');
    speakingIndicator = select('#speaking-indicator');
    reservationButton = select('#showMapBtn');
    doctorImageElement = select('#doctor-image');

    // Pemeriksaan elemen UI
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
            speechSynth.onLoad = voiceReady;
            speechSynth.onStart = botStartedSpeaking;
            speechSynth.onEnd = botFinishedSpeaking;
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

    // Listener untuk tombol Reservasi
    if (reservationButton) {
        // Hapus event listener lama jika ada (untuk safety)
        // reservationButton.elt.removeEventListener('click', goToReservationPage); // Jika sebelumnya pakai addEventListener
        reservationButton.mousePressed(handleReservationClick); // Panggil fungsi baru yang menampilkan popup
        reservationButton.html('Lanjut ke Reservasi');
        reservationButton.style('display', 'none');
        console.log("Reservation button (#showMapBtn) listener attached (calls handleReservationClick).");
    } else {
        console.warn("Reservation button (#showMapBtn) not found.");
    }

    // Pesan sapaan awal (dipindahkan ke voiceReady agar konsisten)
    // addMessageToTranscript('Bot', 'Halo! Saya Asisten anda siap membantu. Klik tombol "Mulai Bicara" lalu sebutkan gejala Anda.');
    console.log("Initial greeting will be added via voiceReady.");
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
        const greetingMsg = 'Halo! Saya Asisten anda siap membantu. Klik tombol "Mulai Bicara" lalu sebutkan gejala Anda.';
        console.log("Attempting to speak initial greeting...");
        addMessageToTranscript('Bot', greetingMsg); // Tambah ke transkrip
        speakText(greetingMsg); // Ucapkan
        greetingSpoken = true;
    }
}

function botStartedSpeaking() {
    console.log("Bot started speaking.");
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

    // Aktifkan kembali tombol dengar jika tidak sedang mendengarkan
    if (listenButton && !isListening) {
        listenButton.removeAttribute('disabled');
        listenButton.html('<i class="fas fa-microphone-alt text-xl"></i><span class="text-base">Mulai Bicara</span>');
        // FIX removeClass Error: Gunakan argumen terpisah
        listenButton.removeClass('listening', 'recording-animation');
        console.log("Listen button re-enabled after TTS finished.");
    } else if (listenButton && isListening) {
        console.log("TTS finished, but STT still marked as listening (possible state issue). Button remains as is.");
         // Seharusnya STT sudah berhenti sebelum TTS selesai, tapi jika tidak, biarkan state listening
    }

    // Update visibilitas tombol reservasi berdasarkan hasil terakhir
    updateReservationButtonVisibility();
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
    if (reservationButton) reservationButton.style('display', 'none'); // Sembunyikan tombol saat mendengar

    if (!isListening) {
        // --- MULAI MENDENGARKAN ---
        console.log("Attempting to start listening...");
        try {
            // Tidak perlu re-init speechRec di sini
            speechRec.start(); // continuous & interim sudah diset
            isListening = true;
            console.log("speechRec.start() called.");
            if (listenButton) {
                listenButton.html('<i class="fas fa-stop text-xl"></i><span class="text-base">Berhenti</span>');
                listenButton.addClass('listening', 'recording-animation'); // Pisahkan argumen
            }
            updateStatus('Mendengarkan...');
        } catch (err) {
            console.error("Error starting speech recognition:", err);
            updateStatus('Gagal memulai pendengaran.', 3000);
            isListening = false;
            resetListenButtonUI(!isSpeaking); // Reset UI, enable jika bot tidak bicara
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
            if (listenButton) listenButton.removeClass('recording-animation'); // Hapus animasi segera
            updateStatus('Menghentikan pendengaran...');
            // State isListening akan direset oleh speechEnd
        } catch (e) {
            console.error("Error stopping speech recognition:", e);
            updateStatus('Gagal menghentikan pendengaran.', 3000);
            isListening = false; // Paksa state
            speechEnd(); // Coba cleanup
        }
    }
}

// Callback saat ucapan terdeteksi
function gotSpeech() {
    console.log("gotSpeech callback triggered.");
    if (statusDisplay) updateStatus('Memproses ucapan...');

    if (speechRec && speechRec.resultValue && speechRec.resultString) {
        let userInput = speechRec.resultString;
        addMessageToTranscript('User', userInput);
        console.log("Proceeding to symptom analysis.");
        sendToServerForDetection(userInput); // Kirim untuk analisis
        if (listenButton) listenButton.attribute('disabled', ''); // Nonaktifkan tombol selama proses
    } else {
        console.warn("gotSpeech callback triggered but no valid result found.");
        updateStatus('Tidak dapat mengenali ucapan dengan jelas. Coba lagi.', 3000);
        isListening = false; // Pastikan state reset jika tidak ada hasil
        resetListenButtonUI(!isSpeaking); // Reset tombol jika tidak ada hasil & bot tidak bicara
    }
}

// Kirim teks ke server backend untuk diproses
async function sendToServerForDetection(inputText) {
    console.log(`Sending text to /api/process: "${inputText}"`);
    updateStatus('Menganalisis gejala...');
    if (listenButton) listenButton.attribute('disabled', '');
    if (reservationButton) reservationButton.style('display', 'none');
    // Reset hasil sebelumnya
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
        addMessageToTranscript('Bot', errorMsg);
        speakText(errorMsg);
        // lastDetectionResult & lastDetectedDisease sudah null
    } finally {
        console.log("sendToServerForDetection finished.");
        // Tombol akan di-handle oleh botFinishedSpeaking setelah TTS (hasil/error) selesai
    }
}

// --- Fungsi displayDetectionResults ---
function displayDetectionResults(hasilDeteksiString) {
    console.log("Displaying detection results. Raw input:", hasilDeteksiString);
    lastDetectionResult = "NO_VALID_DIAGNOSIS"; // Default
    lastDetectedDisease = null; // Default

    const noDetectionKeywords = ['tidak ada penyakit', 'belum dapat mendeteksi', 'tidak ditemukan', 'tidak terdeteksi', 'gejala tidak cukup'];
    const isNoDetection = !hasilDeteksiString || hasilDeteksiString.trim() === '' || noDetectionKeywords.some(keyword => hasilDeteksiString.toLowerCase().includes(keyword));

    let botMessage = '';
    let speakPenyakit = "Tidak diketahui"; // Untuk dikirim ke fungsi speak
    let speakGejala = "N/A"; // Untuk dikirim ke fungsi speak
    let foundDiagnosis = false; // Untuk dikirim ke fungsi speak

    if (isNoDetection) {
        console.log("No specific disease detected.");
        botMessage = 'Halo Saya Asisten anda! Saya siap membantu. Klik tombol "Mulai Bicara" lalu sebutkan gejala Anda.'; // Pesan jika tidak terdeteksi
        lastDetectionResult = "NO_VALID_DIAGNOSIS"; // Pastikan ini
        lastDetectedDisease = null;
        addMessageToTranscript('Bot', botMessage); // Tampilkan pesan ini
    } else {
        console.log("Potential disease detected.");
        lastDetectionResult = hasilDeteksiString.trim(); // Simpan hasil MENTAH yang valid
        console.log(">>> Set lastDetectionResult to (VALID):", `"${lastDetectionResult}"`);

        const lines = lastDetectionResult.split('\n'); // Gunakan hasil yg sudah di-trim
        let formattedHTML = '<span class="sender-label">[Bot]:</span> <strong>Hasil Analisis:</strong><ul class="list-disc list-inside ml-4 mt-1">';
        // Variabel lokal untuk loop, tidak perlu global
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
                    currentPenyakit = value; // Simpan nama penyakit non-escaped
                    currentFoundDiagnosis = true;
                    lastDetectedDisease = value; // <<< SIMPAN NAMA PENYAKIT GLOBAL
                } else if (labelLower.includes('gejala yang muncul') || labelLower.includes('gejala cocok')) {
                    currentGejala = value;
                }
            } else if (line.trim()) {
                const escapedLine = line.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
                formattedHTML += `<li class="mb-1">${escapedLine}</li>`;
                if (!currentFoundDiagnosis && (line.trim().toLowerCase().includes('penyakit:') || line.trim().toLowerCase().includes('kemungkinan:'))) {
                    const value = line.trim().split(':').slice(1).join(':').trim() || line.trim();
                    currentPenyakit = value;
                    currentFoundDiagnosis = true;
                    lastDetectedDisease = value; // <<< SIMPAN NAMA PENYAKIT GLOBAL
                }
            }
        });
        formattedHTML += '</ul>';

        // Update variabel untuk dikirim ke fungsi speak
        speakPenyakit = currentPenyakit;
        speakGejala = currentGejala;
        foundDiagnosis = currentFoundDiagnosis;

        // Tampilkan di transkrip
        let resultDiv = createDiv(formattedHTML);
        resultDiv.addClass('bot-transcript-bubble detection-result');
        if (transcriptArea) {
            transcriptArea.child(resultDiv);
            try { transcriptArea.elt.scrollTo({ top: transcriptArea.elt.scrollHeight, behavior: 'smooth' }); } catch(e){}
        }
    }

    // Ucapkan hasil (atau pesan 'tidak terdeteksi')
    // Fungsi ini akan mereset lastDetectedDisease jika diagnosis tidak valid
    speakDetectionResults(speakPenyakit, speakGejala, foundDiagnosis, isNoDetection, botMessage);
}

// --- Fungsi speakDetectionResults (HANYA SATU VERSI) ---
function speakDetectionResults(penyakit, gejala, diagnosisDitemukan, isNoDetection, noDetectionMsg) {
    let textToSpeak = '';
    const validPenyakit = diagnosisDitemukan && penyakit && penyakit !== "Tidak diketahui" && penyakit.trim() !== '';

    if (isNoDetection) {
        textToSpeak = 'Berdasarkan gejala Anda, belum dapat dideteksi penyakit spesifik. silahkan ulang gejala anda'; // Pesan suara jika tidak terdeteksi
        // lastDetectionResult & lastDetectedDisease sudah direset sebelumnya
    } else if (validPenyakit) {
        textToSpeak = `Baik, berdasarkan analisis, kemungkinan penyakit Anda adalah ${penyakit}. `;
        if (gejala && gejala !== "N/A" && gejala.toLowerCase() !== 'n/a' && gejala.trim() !== '') {
            textToSpeak += `Gejala yang cocok: ${gejala}. `;
        }
        textToSpeak += `Jika ingin melanjutkan, silakan klik tombol Reservasi yang akan muncul.`;
        // lastDetectionResult & lastDetectedDisease sudah berisi data valid
    } else {
        textToSpeak = "Analisis selesai. Disarankan untuk konsultasi lebih lanjut dengan dokter.";
        // Reset karena diagnosis tidak valid (misal "Tidak diketahui")
        lastDetectionResult = "NO_VALID_DIAGNOSIS";
        lastDetectedDisease = null;
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
            // Update UI dipindah ke onStart/onEnd
            // updateStatus('Bot sedang berbicara...');
            // isSpeaking = true; // Di handle onStart
            // ... (UI lainnya di handle onStart/onEnd) ...
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


// --- Fungsi untuk menangani klik tombol reservasi -> Munculkan Popup ---
function handleReservationClick() {
    console.log("Reservation button clicked. Preparing confirmation popup...");

    // Ambil data yang akan dikirim (jika valid)
    let gejalaDataRaw = "";
    if (lastDetectionResult && lastDetectionResult !== "NO_VALID_DIAGNOSIS") {
        gejalaDataRaw = lastDetectionResult;
    }

    // Ambil nama penyakit untuk pesan popup
    const penyakitDisplay = lastDetectedDisease || "kemungkinan kondisi ini"; // Fallback text

    // Tampilkan SweetAlert2
    Swal.fire({
        title: 'Konfirmasi Reservasi',
        html: `
            <p>Apakah Anda yakin ingin melanjutkan ke halaman reservasi untuk ${penyakitDisplay}?</p>
            <div class="form-check text-start mt-3 mb-2">
                <input class="form-check-input" type="checkbox" value="" id="konfirmasi-reservasi-check">
                <label class="form-check-label" for="konfirmasi-reservasi-check">
                    Saya memahami bahwa ini hanya analisis awal berdasarkan gejala yang saya sebutkan dan bukan merupakan diagnosis medis final.
                </label>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Lanjutkan Reservasi',
        cancelButtonText: 'Batal',
        focusConfirm: false, // Agar fokus tidak langsung ke tombol confirm
        preConfirm: () => {
            // Validasi checkbox sebelum konfirmasi
            const isChecked = document.getElementById('konfirmasi-reservasi-check').checked;
            if (!isChecked) {
                Swal.showValidationMessage('Anda harus menyetujui pernyataan di atas untuk melanjutkan.');
                return false; // Menghentikan konfirmasi
            }
            return true; // Lanjutkan jika dicentang
        }
    }).then((result) => {
        // Jika user mengklik "Ya, Lanjutkan" DAN checkbox tercentang (validasi preConfirm lolos)
        if (result.isConfirmed) {
            console.log("User confirmed reservation. Proceeding to redirect...");
            goToReservationPage(gejalaDataRaw); // Panggil fungsi redirect dengan data
        } else {
            console.log("User cancelled reservation.");
        }
    });
}


// --- Fungsi Baru: Redirect ke Halaman Reservasi (Dipanggil SETELAH konfirmasi) ---
function goToReservationPage(diagnosisData) {
    console.log("Redirecting function called...");
    let diagnosisParam = "";
    if (diagnosisData) {
        // FIX: Encode data mentah sebelum dimasukkan ke URL
        diagnosisParam = encodeURIComponent(diagnosisData);
        console.log("Valid symptoms data encoded to send:", diagnosisParam);
    } else {
        console.warn("Redirecting without valid symptoms data (should not happen if button logic is correct).");
        diagnosisParam = encodeURIComponent("Gejala tidak dispesifikasi dari analisis awal.");
    }

    const targetPage = 'reservasi.html'; // Pastikan nama file benar
    // FIX: Gunakan nama parameter 'diagnosis' dan data yang sudah di-encode
    const reservationUrl = `${targetPage}?diagnosis=${diagnosisParam}`;

    console.log("Redirecting to:", reservationUrl);
    window.location.href = reservationUrl; // Arahkan ke halaman reservasi
}


// --- Fungsi addMessageToTranscript ---
function addMessageToTranscript(sender, message) {
    if (!sender || !message || !transcriptArea) return;

    // Cek untuk menghindari duplikasi hasil analisis format HTML
    if (sender === 'Bot' && message.startsWith('<span class="sender-label">[Bot]:</span> <strong>Hasil Analisis:</strong>')) {
         console.log("Skipping duplicate HTML formatted message.");
         return;
    }

    let messageDiv = createDiv('');
    // Gunakan styling yang lebih sederhana atau sesuaikan dengan CSS Anda
    let bubbleClass = (sender === 'User') ? 'user-transcript-bubble' : 'bot-transcript-bubble';
    const safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;"); // Basic escaping

    messageDiv.html(`${safeMessage}`);
    messageDiv.addClass(bubbleClass);
    // Tambahkan kelas styling dasar dari CSS jika perlu
    // messageDiv.addClass('p-3 my-2 rounded-lg max-w-xs md:max-w-md');
    if(sender === 'Bot' && message.includes('Hasil Analisis')){
         messageDiv.addClass('detection-result'); // Tambahkan kelas khusus jika ini hasil deteksi
    }

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
    addMessageToTranscript('System', userMessage); // Tampilkan error sebagai pesan sistem
    resetListenButtonUI(!isSpeaking); // Reset tombol, aktifkan jika bot tidak bicara

    lastDetectionResult = null; // Reset hasil jika STT error
    lastDetectedDisease = null;
    updateReservationButtonVisibility(); // Sembunyikan tombol reservasi
}

function speechEnd() {
    console.log("Speech Recognition session ended.");
    if(isListening) isListening = false; // Pastikan reset

    // Reset UI jika bot tidak bicara, jika bicara hanya hilangkan animasi
    if (listenButton && !isSpeaking) {
         // FIX removeClass error: Gunakan argumen terpisah
         resetListenButtonUI(); // Reset penuh karena bot tidak bicara
         console.log("speechEnd: Resetting button UI (bot not speaking).");
    } else if (listenButton && isSpeaking) {
        listenButton.removeClass('recording-animation'); // Hanya hapus animasi
        console.log("speechEnd: Bot is speaking, only removing recording animation.");
    }
}

// --- Helper untuk mereset Tombol Dengar ---
function resetListenButtonUI(enable = true) {
    if (listenButton) {
        // FIX removeClass error: Gunakan argumen terpisah
        listenButton.removeClass('listening', 'recording-animation');
        listenButton.html('<i class="fas fa-microphone-alt text-xl"></i><span class="text-base">Mulai Bicara</span>');
        if (enable) {
            listenButton.removeAttribute('disabled');
        } else {
            listenButton.attribute('disabled', '');
        }
    }
}


// --- Helper updateStatus ---
function updateStatus(message, duration = 0) {
    if (!statusDisplay) return;
    clearTimeout(statusTimeout);
    // Basic escaping untuk keamanan
    const safeMessage = message ? message.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
    statusDisplay.html(safeMessage);
    if (duration > 0) {
        statusTimeout = setTimeout(() => {
            if (statusDisplay.html() === safeMessage) statusDisplay.html('');
        }, duration);
    }
}

// --- Helper Update Visibilitas Tombol Reservasi ---
function updateReservationButtonVisibility() {
    if (reservationButton) {
        if (lastDetectionResult && lastDetectionResult !== "NO_VALID_DIAGNOSIS") {
            console.log("UI UPDATE: Showing reservation button.");
            reservationButton.style('display', 'flex'); // Sesuaikan dgn CSS jika perlu
            reservationButton.removeAttribute('disabled');
        } else {
             console.log("UI UPDATE: Hiding reservation button.");
            reservationButton.style('display', 'none');
        }
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
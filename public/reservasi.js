// File: reservasi.js

// Firebase config should be fetched from an API endpoint
// Replace with your actual API endpoint
const firebaseConfigApi = '/api/firebase-config';

// --- Global Variables ---
let firebaseApp;
let firebaseDb;
let allHospitals = {}; // To store fetched hospitals
let allDoctors = {}; // To store fetched doctors
let selectedDoctorSchedule = null; // To store the schedule of the currently selected doctor
let existingReservationsForSelectedDoctorDate = []; // To store reservations for the selected doctor and date

// --- Utility Functions ---

/**
 * Fetches Firebase config from the backend API.
 * @returns {Promise<object|null>} Firebase config object or null if fetching fails.
 */
async function fetchFirebaseConfig() {
    try {
        const response = await fetch(firebaseConfigApi);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }
        console.log("Firebase config fetched successfully.");
        return await response.json();
    } catch (error) {
        console.error("Error fetching Firebase config:", error);
        Swal.fire('Error', 'Gagal memuat konfigurasi Firebase. Pastikan API backend berjalan.', 'error');
        return null;
    }
}

/**
 * Initializes Firebase app.
 * @param {object} config Firebase config object.
 * @returns {boolean} True if initialization is successful, false otherwise.
 */
function initializeFirebase(config) {
    if (!config) {
        console.error("Firebase config is invalid.");
        return false;
    }
    try {
        if (typeof firebase === 'undefined' || typeof firebase.initializeApp === 'undefined') {
             console.error("Firebase SDK not loaded.");
             Swal.fire('Error', 'Firebase SDK belum dimuat. Periksa koneksi internet atau konfigurasi.', 'error');
             return false;
        }
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(config);
            console.log("Firebase App initialized.");
        } else {
            firebaseApp = firebase.app();
            console.log("Using existing Firebase App instance.");
        }

        // We still need the DB instance for fetching hospitals and doctors
        firebaseDb = firebase.database();
        console.log("Firebase Realtime Database instance obtained for data fetching.");
        return true;
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        Swal.fire('Error', `Gagal inisialisasi layanan Firebase: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} unsafe String to escape.
 * @returns {string} Escaped string.
 */
function escapeHtml(unsafe) {
    if (unsafe === null || typeof unsafe === 'undefined') return "";
    return unsafe.toString()
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
}

/**
 * Formats a time string (HH:mm) into a Date object (using a dummy date).
 * Useful for time comparisons.
 * @param {string} timeString Time in HH:mm format.
 * @returns {Date} Date object with the specified time.
 */
function timeStringToDate(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(); // Use current date as base
    date.setHours(hours, minutes, 0, 0);
    return date;
}

/**
 * Formats a Date object into a time string (HH:mm).
 * @param {Date} date Date object.
 * @returns {string} Time in HH:mm format.
 */
function dateToTimeString(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Adds minutes to a time string (HH:mm).
 * @param {string} timeString Start time in HH:mm format.
 * @param {number} minutesToAdd Minutes to add.
 * @returns {string} New time in HH:mm format.
 */
function addMinutesToTime(timeString, minutesToAdd) {
    const date = timeStringToDate(timeString);
    date.setMinutes(date.getMinutes() + minutesToAdd);
    return dateToTimeString(date);
}

/**
 * Checks if a given time slot (start to end) overlaps with existing reservations.
 * Assumes existing reservations are also 1-hour slots.
 * @param {string} checkStartTime Time to check (HH:mm).
 * @param {string} checkEndTime Time to check (HH:mm).
 * @param {Array<object>} existingReservations List of existing reservation objects { waktu: "HH:mm" }.
 * @returns {boolean} True if overlaps, false otherwise.
 */
function isTimeSlotBooked(checkStartTime, checkEndTime, existingReservations) {
    const checkStart = timeStringToDate(checkStartTime);
    const checkEnd = timeStringToDate(checkEndTime); // Assuming checkEndTime is checkStartTime + 1 hour

    for (const res of existingReservations) {
        if (res.waktu) {
            const resStart = timeStringToDate(res.waktu);
            const resEnd = addMinutesToTime(res.waktu, 60); // Assuming existing slots are 1 hour

            // Check for overlap: (StartA < EndB) and (EndA > StartB)
            if (checkStart < resEnd && checkEnd > resStart) {
                return true; // Overlap found
            }
        }
    }
    return false; // No overlap
}


// --- Data Fetching Functions ---

/**
 * Fetches list of hospitals from Firebase.
 */
async function fetchHospitals() {
    if (!firebaseDb) {
        console.error("Firebase DB not initialized for fetching hospitals.");
        return;
    }
    try {
        const snapshot = await firebaseDb.ref('daftar_rumah_sakit').once('value');
        allHospitals = snapshot.val() || {};
        console.log("Hospitals data fetched:", Object.keys(allHospitals).length);
        populateHospitalSelect(allHospitals);
    } catch (error) {
        console.error("Error fetching hospitals:", error);
        Swal.fire('Error', 'Gagal memuat daftar rumah sakit.', 'error');
        populateHospitalSelect({}); // Populate with empty options on error
    }
}

/**
 * Fetches list of doctors from Firebase.
 */
async function fetchDoctors() {
    if (!firebaseDb) {
        console.error("Firebase DB not initialized for fetching doctors.");
        return;
    }
    try {
        const snapshot = await firebaseDb.ref('daftar_dokter').once('value');
        allDoctors = snapshot.val() || {};
        console.log("Doctors data fetched:", Object.keys(allDoctors).length);
        // Doctors dropdown will be populated based on selected hospital
    } catch (error) {
        console.error("Error fetching doctors:", error);
        Swal.fire('Error', 'Gagal memuat daftar dokter.', 'error');
        allDoctors = {};
    }
}

/**
 * Fetches existing reservations for a specific doctor on a specific date.
 * @param {string} doctorId The ID of the doctor.
 * @param {string} date The date in 'DD/MM/YYYY' format.
 * @returns {Promise<Array<object>>} A promise resolving to an array of reservation objects.
 */
async function fetchReservationsForDoctorAndDate(doctorId, date) {
    if (!firebaseDb) {
        console.error("Firebase DB not initialized for fetching reservations.");
        return [];
    }
    try {
        // Firebase query to filter by doctorId and date
        const reservationsRef = firebaseDb.ref('reservasi');
        const snapshot = await reservationsRef
            .orderByChild('dokter_id')
            .equalTo(doctorId)
            .once('value');

        const reservations = [];
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const res = childSnapshot.val();
                // Manually filter by date after getting data for the doctor
                if (res.tanggal === date) {
                     // Only include 'registrasi' and 'checkin' statuses as booked
                     if (res.status === 'registrasi' || res.status === 'checkin') {
                        reservations.push(res);
                     }
                }
            });
        }
        console.log(`Fetched ${reservations.length} relevant reservations for doctor ${doctorId} on ${date}.`);
        return reservations;
    } catch (error) {
        console.error(`Error fetching reservations for doctor ${doctorId} on ${date}:`, error);
        Swal.fire('Error', 'Gagal memuat data reservasi yang ada.', 'error');
        return [];
    }
}


// --- UI Population Functions ---

/**
 * Populates the hospital select dropdown.
 * @param {object} hospitalsData Object containing hospital data from Firebase.
 */
function populateHospitalSelect(hospitalsData) {
    const hospitalSelect = document.getElementById('rumah_sakit');
    if (!hospitalSelect) {
        console.error("Elemen <select id='rumah_sakit'> tidak ditemukan.");
        return;
    }

    hospitalSelect.innerHTML = '<option value="" selected disabled>-- Pilih Rumah Sakit --</option>';
    const hospitalIds = Object.keys(hospitalsData);

    if (hospitalIds.length > 0) {
        hospitalIds.forEach(id => {
            const hospital = hospitalsData[id];
            const option = document.createElement('option');
            option.value = id; // Use ID as value
            option.textContent = hospital.nama || hospital.singkatan || `RS ID: ${id}`; // Display name or abbreviation
            // Store full name in a data attribute
            option.dataset.fullName = hospital.nama || hospital.singkatan || `RS ID: ${id}`;
            hospitalSelect.appendChild(option);
        });
        hospitalSelect.disabled = false; // Enable if data is available
    } else {
        hospitalSelect.innerHTML = '<option value="" selected disabled>-- Tidak ada RS tersedia --</option>';
        hospitalSelect.disabled = true; // Disable if no data
    }
}

/**
 * Populates the doctor select dropdown based on the selected hospital.
 * @param {string} selectedHospitalId The ID of the selected hospital.
 */
function populateDoctorSelect(selectedHospitalId) {
    const doctorSelect = document.getElementById('dokter');
    const doctorSelectionSection = document.getElementById('doctor-selection-section');
    const tanggalInput = document.getElementById('tanggal');
    const waktuInput = document.getElementById('waktu');
    const submitButton = document.getElementById('submitButton');
    const doctorScheduleDisplay = document.getElementById('doctor-schedule-display');

    if (!doctorSelect || !doctorSelectionSection || !tanggalInput || !waktuInput || !submitButton || !doctorScheduleDisplay) {
        console.error("One or more doctor-related UI elements not found.");
        return;
    }

    doctorSelect.innerHTML = '<option value="" selected disabled>-- Pilih Dokter --</option>';
    // doctorSelect.disabled = true; // REMOVED: Do not disable initially
    tanggalInput.disabled = true; // Disable date until doctor is selected
    waktuInput.disabled = true; // Disable time until doctor is selected
    submitButton.disabled = true; // Disable submit until time is validated
    doctorScheduleDisplay.classList.add('hidden'); // Hide schedule display
     // Hide availability message
     const availabilityMessage = document.getElementById('availability-message');
     if(availabilityMessage) {
         availabilityMessage.classList.add('hidden');
         availabilityMessage.textContent = ''; // Clear message text
     }


    const doctorsInHospital = Object.entries(allDoctors).filter(([id, doctor]) => doctor.rumah_sakit_id === selectedHospitalId);

    if (doctorsInHospital.length > 0) {
        doctorsInHospital.forEach(([id, doctor]) => {
            const option = document.createElement('option');
            option.value = id; // Use doctor ID as value
            option.textContent = `${doctor.nama || 'Tanpa Nama'} (${doctor.spesialisasi || 'Umum'})`;
            // Store schedule data as data attributes
            option.dataset.hariPraktik = doctor.hari_praktik || '';
            option.dataset.jamMulai = doctor.jam_mulai || '';
            option.dataset.jamSelesai = doctor.jam_selesai || '';
            option.dataset.doctorName = doctor.nama || 'Tanpa Nama'; // Store doctor name
            doctorSelect.appendChild(option);
        });
        doctorSelect.disabled = false; // ENABLE: Enable doctor select if doctors are found
        doctorSelectionSection.classList.remove('hidden'); // Show doctor selection section
    } else {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "-- Tidak ada Dokter tersedia di RS ini --";
        doctorSelect.appendChild(option);
        doctorSelect.disabled = false; // ENABLE: Keep doctor select enabled even if no doctors found for this hospital
        doctorSelectionSection.classList.remove('hidden'); // Still show the section to indicate no doctors
    }
}

/**
 * Displays the selected doctor's schedule and enables date/time selection.
 */
function displayDoctorScheduleAndEnableDateTime() {
    const doctorSelect = document.getElementById('dokter');
    const tanggalInput = document.getElementById('tanggal');
    const waktuInput = document.getElementById('waktu');
    const doctorScheduleDisplay = document.getElementById('doctor-schedule-display');
    const submitButton = document.getElementById('submitButton');
    const availabilityMessage = document.getElementById('availability-message');
    const selectedDoctorNameInput = document.getElementById('selected-doctor-name');


    if (!doctorSelect || !tanggalInput || !waktuInput || !doctorScheduleDisplay || !submitButton || !availabilityMessage || !selectedDoctorNameInput) {
        console.error("One or more doctor-related UI elements not found for schedule display.");
        return;
    }

    const selectedOption = doctorSelect.options[doctorSelect.selectedIndex];
    // Check if a valid doctor option (not the disabled placeholder) is selected
    if (selectedOption && selectedOption.value !== "" && selectedOption.disabled !== true) {
        selectedDoctorSchedule = {
            hari_praktik: selectedOption.dataset.hariPraktik,
            jam_mulai: selectedOption.dataset.jamMulai,
            jam_selesai: selectedOption.dataset.jamSelesai
        };
        // Store selected doctor name in the hidden input
        selectedDoctorNameInput.value = selectedOption.dataset.doctorName || selectedOption.textContent;


        const scheduleText = `Jadwal Praktik: ${escapeHtml(selectedDoctorSchedule.hari_praktik)}, ${escapeHtml(selectedDoctorSchedule.jam_mulai)} - ${escapeHtml(selectedDoctorSchedule.jam_selesai)}`;
        doctorScheduleDisplay.textContent = scheduleText;
        doctorScheduleDisplay.classList.remove('hidden');

        tanggalInput.disabled = false; // Enable date input
        waktuInput.disabled = false; // Enable time input
        submitButton.disabled = true; // Keep submit disabled until time is validated
        availabilityMessage.classList.add('hidden'); // Hide previous availability messages
        availabilityMessage.textContent = ''; // Clear message text


        // Set min date for the date picker to today
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        tanggalInput.min = todayString;

        // Clear date and time inputs when doctor changes
        tanggalInput.value = '';
        waktuInput.value = '';

    } else {
        selectedDoctorSchedule = null;
        doctorScheduleDisplay.classList.add('hidden');
        tanggalInput.disabled = true;
        waktuInput.disabled = true;
        submitButton.disabled = true;
        availabilityMessage.classList.add('hidden');
        availabilityMessage.textContent = ''; // Clear message text
        selectedDoctorNameInput.value = ''; // Clear doctor name hidden input

         // Clear date and time inputs if no valid doctor is selected
         tanggalInput.value = '';
         waktuInput.value = '';
    }
}

/**
 * Checks availability for the selected doctor, date, and time.
 * Updates the availability message and submit button state.
 */
async function checkAvailability() {
    const doctorSelect = document.getElementById('dokter');
    const tanggalInput = document.getElementById('tanggal');
    const waktuInput = document.getElementById('waktu');
    const submitButton = document.getElementById('submitButton');
    const availabilityMessage = document.getElementById('availability-message');
    const selectedDoctorNameInput = document.getElementById('selected-doctor-name');


    if (!doctorSelect || !tanggalInput || !waktuInput || !submitButton || !availabilityMessage || !selectedDoctorSchedule || !selectedDoctorNameInput) {
        console.warn("Missing elements or doctor schedule for availability check.");
        submitButton.disabled = true;
        availabilityMessage.classList.add('hidden');
        availabilityMessage.textContent = '';
        return;
    }

    const doctorId = doctorSelect.value;
    const selectedDate = tanggalInput.value; // FormatYYYY-MM-DD
    const preferredTime = waktuInput.value; // Format HH:mm

    // Ensure all required fields for availability check are filled
    if (!doctorId || doctorId === "" || doctorSelect.options[doctorSelect.selectedIndex].disabled === true || !selectedDate || !preferredTime) {
        submitButton.disabled = true;
        availabilityMessage.classList.add('hidden');
        availabilityMessage.textContent = '';
        return;
    }


    // Convert selectedDate to DD/MM/YYYY for Firebase query
    const [year, month, day] = selectedDate.split('-');
    const dateForFirebase = `${day}/${month}/${year}`;

    // Store selected doctor name (already handled in displayDoctorScheduleAndEnableDateTime)
    // selectedDoctorNameInput.value = doctorSelect.options[doctorSelect.selectedIndex].text;


    // Check if the selected date is within the doctor's practice days (simple check)
    const selectedDateObj = new Date(selectedDate + 'T00:00:00'); // Use T00:00:00 to avoid timezone issues
    const dayOfWeek = selectedDateObj.toLocaleDateString('id-ID', { weekday: 'long' }); // Get day name in Indonesian

    if (!selectedDoctorSchedule.hari_praktik.toLowerCase().includes(dayOfWeek.toLowerCase())) {
         availabilityMessage.className = 'mt-4 p-3 text-sm rounded-md bg-red-100 border border-red-400 text-red-700';
         availabilityMessage.textContent = `Dokter tidak praktik pada hari ${dayOfWeek}.`;
         submitButton.disabled = true;
         availabilityMessage.classList.remove('hidden');
         return;
    }


    // Check if the preferred time is within the doctor's practice hours
    const preferredTimeDate = timeStringToDate(preferredTime);
    const startTimeDate = timeStringToDate(selectedDoctorSchedule.jam_mulai);
    const endTimeDate = timeStringToDate(selectedDoctorSchedule.jam_selesai);

    // Adjust end time date if it's on the next day (e.g., ends after midnight)
    if (endTimeDate < startTimeDate) {
        endTimeDate.setDate(endTimeDate.getDate() + 1);
        if (preferredTimeDate < startTimeDate) {
             preferredTimeDate.setDate(preferredTimeDate.getDate() + 1);
         }
    }


    if (preferredTimeDate < startTimeDate || preferredTimeDate >= endTimeDate) {
         availabilityMessage.className = 'mt-4 p-3 text-sm rounded-md bg-red-100 border border-red-400 text-red-700';
         availabilityMessage.textContent = `Waktu yang dipilih (${preferredTime}) di luar jam praktik dokter (${selectedDoctorSchedule.jam_mulai} - ${selectedDoctorSchedule.jam_selesai}).`;
         submitButton.disabled = true;
         availabilityMessage.classList.remove('hidden');
         return;
    }

    // Display loading message while checking availability
    availabilityMessage.className = 'mt-4 p-3 text-sm rounded-md bg-blue-100 border border-blue-400 text-blue-700';
    availabilityMessage.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Memeriksa ketersediaan...`;
    availabilityMessage.classList.remove('hidden');
    submitButton.disabled = true;


    // Fetch existing reservations for this doctor on this date
    existingReservationsForSelectedDoctorDate = await fetchReservationsForDoctorAndDate(doctorId, dateForFirebase);

    let suggestedTime = preferredTime;
    let isBooked = isTimeSlotBooked(suggestedTime, addMinutesToTime(suggestedTime, 60), existingReservationsForSelectedDoctorDate);
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loop

    // Find the next available slot if the preferred time is booked
    // This loop implements the 1-hour slot booking rule
    while (isBooked && attempts < maxAttempts) {
        suggestedTime = addMinutesToTime(suggestedTime, 60); // Suggest next hour (assuming 1-hour slots)

        // Check if suggested time is still within practice hours
        const suggestedTimeDate = timeStringToDate(suggestedTime);
         if (endTimeDate < startTimeDate) { // Handle overnight shifts
             if (suggestedTimeDate < startTimeDate) suggestedTimeDate.setDate(suggestedTimeDate.getDate() + 1);
         }

        if (suggestedTimeDate >= endTimeDate) {
            // No more available slots within practice hours
            availabilityMessage.className = 'mt-4 p-3 text-sm rounded-md bg-red-100 border border-red-400 text-red-700';
            availabilityMessage.textContent = `Tidak ada slot tersedia mulai dari waktu yang Anda pilih pada tanggal tersebut.`;
            submitButton.disabled = true;
            availabilityMessage.classList.remove('hidden');
            return;
        }

        isBooked = isTimeSlotBooked(suggestedTime, addMinutesToTime(suggestedTime, 60), existingReservationsForSelectedDoctorDate);
        attempts++;
    }

    if (isBooked) {
         // Should not happen with maxAttempts, but as a fallback
         availabilityMessage.className = 'mt-4 p-3 text-sm rounded-md bg-red-100 border border-red-400 text-red-700';
         availabilityMessage.textContent = `Gagal menemukan slot tersedia setelah beberapa percobaan. Silakan coba waktu lain.`;
         submitButton.disabled = true;
         availabilityMessage.classList.remove('hidden');
    } else {
        // Slot is available
        if (suggestedTime === preferredTime) {
            availabilityMessage.className = 'mt-4 p-3 text-sm rounded-md bg-green-100 border border-green-400 text-green-700';
            availabilityMessage.textContent = `Waktu ${preferredTime} tersedia.`;
        } else {
            availabilityMessage.className = 'mt-4 p-3 text-sm rounded-md bg-yellow-100 border border-yellow-400 text-yellow-700';
            availabilityMessage.innerHTML = `Waktu ${preferredTime} sudah terisi. Slot tersedia berikutnya adalah <strong>${suggestedTime}</strong>.`;
            // Optionally update the time input to the suggested time
            waktuInput.value = suggestedTime;
        }
        availabilityMessage.classList.remove('hidden');
        submitButton.disabled = false; // Enable submit button
    }
}


// --- Event Handlers ---

/**
 * Handles mobile menu toggle click.
 */
function handleMobileMenuToggle() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('hidden');
    }
}

/**
 * Handles hospital select change event.
 */
function handleHospitalChange() {
    const hospitalSelect = document.getElementById('rumah_sakit');
    const selectedHospitalId = hospitalSelect.value;
    populateDoctorSelect(selectedHospitalId);
    // Reset doctor, date, time, and availability message when hospital changes
    const doctorSelect = document.getElementById('dokter');
    const tanggalInput = document.getElementById('tanggal');
    const waktuInput = document.getElementById('waktu');
    const submitButton = document.getElementById('submitButton');
    const availabilityMessage = document.getElementById('availability-message');
    const doctorScheduleDisplay = document.getElementById('doctor-schedule-display');

    if (doctorSelect) {
        doctorSelect.value = ""; // Reset doctor dropdown
        // doctorSelect.disabled = true; // REMOVED: Do not disable here
    }
    if (tanggalInput) tanggalInput.value = ""; // Reset date input
    if (waktuInput) waktuInput.value = ""; // Reset time input
    if (tanggalInput) tanggalInput.disabled = true; // Keep date disabled until doctor is selected
    if (waktuInput) waktuInput.disabled = true; // Keep time disabled until doctor is selected
    if (submitButton) submitButton.disabled = true;
    if (availabilityMessage) {
        availabilityMessage.classList.add('hidden');
        availabilityMessage.textContent = '';
    }
    if (doctorScheduleDisplay) doctorScheduleDisplay.classList.add('hidden');
    selectedDoctorSchedule = null;
    existingReservationsForSelectedDoctorDate = [];
}

/**
 * Handles doctor select change event.
 */
function handleDoctorChange() {
    displayDoctorScheduleAndEnableDateTime();
     // Reset date, time, and availability message when doctor changes
     const tanggalInput = document.getElementById('tanggal');
     const waktuInput = document.getElementById('waktu');
     const submitButton = document.getElementById('submitButton');
     const availabilityMessage = document.getElementById('availability-message');

     if (tanggalInput) tanggalInput.value = ""; // Reset date input
     if (waktuInput) waktuInput.value = ""; // Reset time input
     if (submitButton) submitButton.disabled = true;
     if (availabilityMessage) {
         availabilityMessage.classList.add('hidden');
         availabilityMessage.textContent = '';
     }
     existingReservationsForSelectedDoctorDate = []; // Clear cached reservations
}

/**
 * Handles date or time input change event.
 */
function handleDateTimeChange() {
    // Re-check availability when date or time changes
    checkAvailability();
}


/**
 * Handles form submission.
 * @param {Event} event The form submit event.
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    const submitButton = document.getElementById('submitButton');
    submitButton.disabled = true;
    submitButton.innerHTML = `
        <i class="fas fa-spinner fa-spin mr-2"></i>
        Mengirim...
    `; // Show loading state

    const form = event.target;
    const formData = new FormData(form);
    const dataToSend = Object.fromEntries(formData.entries()); // Use dataToSend for the object being sent

    // Add current timestamp and status
    dataToSend.timestamp = Date.now();
    dataToSend.status = 'registrasi'; // Default status

    // Add selected doctor's name (already stored in hidden input)
    dataToSend.dokter_nama = document.getElementById('selected-doctor-name').value;

    // Get selected doctor's ID from the dropdown
    dataToSend.dokter_id = document.getElementById('dokter').value;

    // MODIFICATION: Get selected hospital's full name from data attribute
    const hospitalSelect = document.getElementById('rumah_sakit');
    const selectedHospitalOption = hospitalSelect.options[hospitalSelect.selectedIndex];
    dataToSend.rumah_sakit_nama = selectedHospitalOption.dataset.fullName || selectedHospitalOption.textContent;


    // Add telegram_id explicitly to data object for clarity before sending
    dataToSend.telegram_id = document.getElementById('telegram_id').value.trim();
    console.log("Data to be sent to /api/reservasi:", dataToSend);

    // Convert date format fromYYYY-MM-DD to DD/MM/YYYY if needed by backend
    // Assuming backend expectsYYYY-MM-DD based on input type="date"
    // If backend expects DD/MM/YYYY, uncomment the following block:
    /*
    if (dataToSend.tanggal) {
        const [year, month, day] = dataToSend.tanggal.split('-');
        dataToSend.tanggal = `${day}/${month}/${year}`;
    }
    */

    // Ensure the final allocated time is used, which might be different from preferred time if adjusted
    // Assuming backend expects HH:mm based on input type="time"
    dataToSend.waktu = document.getElementById('waktu').value;


    // Get diagnosis data from the hidden input populated by the previous page
    const gejalaDataInput = document.getElementById('gejala-data');
    dataToSend.diagnosis = gejalaDataInput ? gejalaDataInput.value : 'Tidak ada data gejala.';

    // --- FINAL FRONTEND VALIDATION BEFORE SENDING ---
    // Re-check availability quickly before submitting to prevent race conditions or bypassing
    // This relies on selectedDoctorSchedule and existingReservationsForSelectedDoctorDate being up-to-date
    // A more robust solution requires backend validation.
    // Check if selectedDoctorSchedule is available
    if (!selectedDoctorSchedule) {
         console.warn("Validation failed: Doctor schedule not loaded.");
         Swal.fire({
             icon: 'error',
             title: 'Kesalahan Validasi',
             text: 'Jadwal dokter belum dimuat. Silakan coba lagi.',
             confirmButtonColor: '#d33'
         });
         submitButton.disabled = false;
         submitButton.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> Kirim Permintaan';
         return;
    }

    // Re-run the core availability check logic
    const preferredTime = dataToSend.waktu;
    const preferredTimeDate = timeStringToDate(preferredTime);
    const startTimeDate = timeStringToDate(selectedDoctorSchedule.jam_mulai);
    const endTimeDate = timeStringToDate(selectedDoctorSchedule.jam_selesai);

    // Adjust end time date if it's on the next day (e.g., ends after midnight)
    if (endTimeDate < startTimeDate) {
        endTimeDate.setDate(endTimeDate.getDate() + 1);
        if (preferredTimeDate < startTimeDate) {
             preferredTimeDate.setDate(preferredTimeDate.getDate() + 1);
        }
    }

    // Check if the selected time is still within practice hours
    if (preferredTimeDate < startTimeDate || preferredTimeDate >= endTimeDate) {
         console.warn("Validation failed: Time outside practice hours.");
         Swal.fire({
             icon: 'error',
             title: 'Waktu Tidak Valid',
             text: `Waktu yang dipilih (${preferredTime}) di luar jam praktik dokter.`,
             confirmButtonColor: '#d33'
         });
         submitButton.disabled = false;
         submitButton.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> Kirim Permintaan';
         return;
    }


    // Check if the time slot is booked based on the latest fetched reservations
    const isCurrentTimeSlotBooked = isTimeSlotBooked(dataToSend.waktu, addMinutesToTime(dataToSend.waktu, 60), existingReservationsForSelectedDoctorDate);

    if (isCurrentTimeSlotBooked) {
        // If the exact time is now booked (due to race condition or timing),
        // prevent submission and show an error.
        console.warn("Validation failed: Time slot is now booked.");
        Swal.fire({
            icon: 'error',
            title: 'Slot Tidak Tersedia',
            text: 'Maaf, slot waktu yang Anda pilih baru saja terisi. Silakan pilih slot waktu lain atau coba lagi.',
            confirmButtonColor: '#d33'
        });
        submitButton.disabled = false; // Re-enable button
        submitButton.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> Kirim Permintaan';
        // Optionally trigger checkAvailability again to update the message and suggest next slot
        checkAvailability(); // This will update the message and suggest the next slot
        return; // Stop the submission process
    }
    // --- END FINAL FRONTEND VALIDATION ---


    // --- Send data to /api/reservasi endpoint ---
    try {
        const response = await fetch('/api/reservasi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log('Sukses dari backend /api/reservasi:', result);

            // The backend /api/reservasi is expected to handle saving to Firebase
            // and sending the Telegram notification using the received data (including telegram_id).

            // Using SweetAlert for success notification
            const nama = escapeHtml(dataToSend.nama);

            Swal.fire({
                icon: 'success',
                title: 'Permintaan Terkirim!',
                html: `Terima kasih, <strong>${nama}</strong>. Permintaan reservasi Anda telah berhasil dikirim. Tim kami akan segera menghubungi Anda Melalui Telegram Anda.`,
                confirmButtonText: 'Kembali ke Beranda',
                confirmButtonColor: '#3498db',
                allowOutsideClick: false,
                allowEscapeKey: false
            }).then(() => {
                 // Redirect to homepage after user clicks the button
                 window.location.href = 'index.html';
            });

        } else {
            console.error('Gagal dari backend /api/reservasi:', result);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Mengirim Reservasi',
                text: result.message || 'Terjadi kesalahan saat memproses reservasi di server. Silakan coba lagi.',
                confirmButtonColor: '#d33'
            });
        }

    } catch (error) {
        console.error('Error Fetch ke /api/reservasi:', error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal Mengirim Reservasi',
            text: 'Tidak dapat terhubung ke server API reservasi. Periksa koneksi internet Anda dan coba lagi.',
            confirmButtonColor: '#d33'
        });
    } finally {
        // Button state is handled within the try/catch blocks and the final validation check
        // No need to re-enable here if submission was prevented
        // submitButton.disabled = false;
        // submitButton.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> Kirim Permintaan';
    }
}


// --- Initialization ---

/**
 * Main function to initialize the page.
 */
async function main() {
    // Fetch Firebase config and initialize
    const firebaseConfig = await fetchFirebaseConfig();
    if (!firebaseConfig || !initializeFirebase(firebaseConfig)) {
        // Error message already shown in fetchFirebaseConfig or initializeFirebase
        return;
    }

    // Fetch initial data (hospitals and doctors)
    await fetchHospitals(); // Populates hospital select
    await fetchDoctors(); // Loads doctors into allDoctors variable

    // Get diagnosis data from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const diagnosis = urlParams.get('diagnosis');
    const gejalaContentDiv = document.getElementById('gejala-content');
    const gejalaDataInput = document.getElementById('gejala-data');

    if (gejalaContentDiv) {
        if (diagnosis) {
            try {
                const diagnosisResult = decodeURIComponent(diagnosis);
                console.log("Diagnosis received (decoded):", diagnosisResult);
                const preElement = document.createElement('pre');
                preElement.classList.add('whitespace-pre-wrap');
                preElement.textContent = diagnosisResult;
                gejalaContentDiv.innerHTML = ''; // Clear placeholder
                gejalaContentDiv.appendChild(preElement);
                if (gejalaDataInput) gejalaDataInput.value = diagnosisResult; // Store in hidden input
                console.log("Hidden input #gejala-data value set.");
            } catch (e) {
                 console.error("Failed to decode diagnosis data:", e);
                 gejalaContentDiv.innerHTML = '<p class="text-red-500 italic text-sm">Failed to load symptom summary data from URL.</p>';
                 if (gealaDataInput) gejalaDataInput.value = "Error: Failed to decode data";
            }
        } else {
            console.log("No 'diagnosis' data in URL parameters.");
            gejalaContentDiv.innerHTML = '<p class="text-yellow-600 italic text-sm">No symptom summary received from the previous page. Please perform symptom analysis first.</p>';
             if (gejalaDataInput) gejalaDataInput.value = "No diagnosis data from URL";
        }
    } else {
        console.error("Element #gejala-content not found!");
    }


    // Set min date for the date picker to today
    const tanggalInput = document.getElementById('tanggal');
    if (tanggalInput) {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        tanggalInput.min = todayString;
        console.log("Min date for #tanggal set to:", todayString);
    } else {
        console.warn("Element #tanggal not found.");
    }


    // Add event listeners
    const reservationForm = document.getElementById('reservation-form');
    if (reservationForm) {
        reservationForm.addEventListener('submit', handleFormSubmit);
    } else {
         console.error("#reservation-form not found.");
    }

    const hospitalSelect = document.getElementById('rumah_sakit');
    if (hospitalSelect) {
        hospitalSelect.addEventListener('change', handleHospitalChange);
    } else {
        console.error("#rumah_sakit select not found.");
    }

    const doctorSelect = document.getElementById('dokter');
    if (doctorSelect) {
        doctorSelect.addEventListener('change', handleDoctorChange);
    } else {
         console.error("#dokter select not found.");
    }

    const tanggalInputListener = document.getElementById('tanggal'); // Use a different variable name
    const waktuInputListener = document.getElementById('waktu'); // Use a different variable name
    if (tanggalInputListener) {
        tanggalInputListener.addEventListener('change', handleDateTimeChange);
    } else {
        console.error("#tanggal input not found for listener.");
    }
     if (waktuInputListener) {
        waktuInputListener.addEventListener('change', handleDateTimeChange);
    } else {
        console.error("#waktu input not found for listener.");
    }


    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', handleMobileMenuToggle);
    } else {
        console.warn("#mobileMenuToggle not found.");
    }

    // Initial state setup after data is loaded
    // Hospital select is populated, doctor select is enabled (unless no hospitals), etc.
    // The change listeners will handle subsequent interactions.
     const doctorSelectInitial = document.getElementById('dokter');
     if (doctorSelectInitial) {
         // Initially enable doctor select if hospitals were loaded, even if no hospital is selected yet.
         // It will be populated/updated when a hospital is chosen.
         if(Object.keys(allHospitals).length > 0) {
             doctorSelectInitial.disabled = false;
         } else {
             doctorSelectInitial.disabled = true; // Keep disabled if no hospitals at all
         }
     }
}

// Run the main function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', main);

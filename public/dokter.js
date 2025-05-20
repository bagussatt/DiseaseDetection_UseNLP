  let firebaseApp;
        let firebaseAuth;
        let firebaseDb;
        let allAppointments = []; // Array to store all fetched appointments
        let currentFilter = 'today'; // Default filter for the queue view
        let doctorSchedule = null; // To store doctor's schedule data
        let scheduleCountdownInterval = null; // To store the interval ID for the schedule countdown
        let customTimerInterval = null; // To store the interval ID for the custom timer
        let customTimerEndTime = null; // To store the end time for the custom timer
        let customTimerDescription = ''; // To store the description for the custom timer

        // --- DOM References ---
        const loadingState = document.getElementById('loadingState');
        const doctorContent = document.getElementById('doctorContent');
        const errorState = document.getElementById('errorState');
        const errorMessageElement = document.getElementById('errorMessage');
        const doctorNameSpan = document.getElementById('doctorName');
        const greetingNameSpan = document.getElementById('greetingName');

        // Schedule & Prayer DOM References
        const schedulePrayerSection = document.getElementById('schedulePrayerSection');
        const scheduleInfoP = document.getElementById('scheduleInfo');
        const countdownTimerDiv = document.getElementById('countdownTimer');
        const countdownTextSpan = document.getElementById('countdownText');
        const customTimerSection = document.getElementById('customTimerSection');
        const targetTimeInput = document.getElementById('targetTimeInput');
        const timerDescriptionInput = document.getElementById('timerDescription');
        const startTimerBtn = document.getElementById('startTimerBtn');
        const customTimerDisplay = document.getElementById('customTimerDisplay');
        const timerCountdownTextSpan = document.getElementById('timerCountdownText');
        const timerDescriptionDisplaySpan = document.getElementById('timerDescriptionDisplay');
        const prayerTimesSection = document.getElementById('prayerTimesSection');
        const prayerTimesListUl = document.getElementById('prayerTimesList');
        const editScheduleBtn = document.getElementById('editScheduleBtn'); // Button to edit schedule

        // Today's Queue DOM References
        const todayQueueSection = document.getElementById('todayQueueSection');
        const appointmentListUl = document.getElementById('appointmentList');
        const noAppointmentsMsgP = document.getElementById('noAppointmentsMsg');
        const filterTodayButton = document.getElementById('filterToday'); // Re-added filter buttons
        const filterAllButton = document.getElementById('filterAll'); // Re-added filter buttons


        // Sidebar DOM References
        const mainSidebar = document.getElementById('mainSidebar');
        const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const navButtons = document.querySelectorAll('.nav-button');


        // --- Utility Functions ---

        /**
         * Shows an error message using SweetAlert2 and logs to console.
         * @param {string} message - The error message to display.
         */
        function showNotificationError(message) {
            console.error("Error:", message);
            Swal.fire('Error', message, 'error');
        }

         /**
         * Shows a success message using SweetAlert2.
         * @param {string} message - The success message to display.
         */
        function showNotificationSuccess(message) {
            console.log("Success:", message);
            Swal.fire('Berhasil!', message, 'success');
        }


        /**
         * Displays the specified main section (loading, doctor content, or error) and hides others.
         * @param {'loading'|'content'|'error'} state - The state to display.
         * @param {string} [message] - Optional message for the error state.
         */
        function displayState(state, message = '') {
            // Hide all state sections first
            loadingState.classList.add('hidden');
            doctorContent.classList.add('hidden');
            errorState.classList.add('hidden');

            // Remove active class from all content sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });

            // Show the target state section and add active class
            if (state === 'loading') {
                loadingState.classList.remove('hidden');
                loadingState.classList.add('active');
            } else if (state === 'content') {
                doctorContent.classList.remove('hidden');
                doctorContent.classList.add('active');
                // Initial view is set in main()
            } else if (state === 'error') {
                errorState.classList.remove('hidden');
                errorState.classList.add('active');
                if (errorMessageElement) {
                    errorMessageElement.textContent = message || 'Terjadi kesalahan yang tidak diketahui.';
                }
            }
        }

        /**
         * Shows a specific content view section within the main content area.
         * @param {string} viewId - The ID of the content view section to show.
         */
        function showContentView(viewId) {
             const views = document.querySelectorAll('.content-view');
             views.forEach(view => {
                 view.classList.remove('active');
                 // Hide all content views explicitly when switching
                 view.style.display = 'none';
             });

             const activeView = document.getElementById(viewId);
             if (activeView) {
                 activeView.classList.add('active');
                 activeView.style.display = 'block'; // Show the active view

                 // Perform actions specific to the view being shown
                 if (viewId === 'todayQueueSection') {
                     // When showing the queue section, ensure only the queue card is visible
                     if(schedulePrayerSection) schedulePrayerSection.style.display = 'none';
                     if(customTimerSection) customTimerSection.style.display = 'none';
                     if(prayerTimesSection) prayerTimesSection.style.display = 'none';
                     // Also, ensure the Antrian card itself is displayed
                     if(todayQueueSection.querySelector('.card')) todayQueueSection.querySelector('.card').style.display = 'block';

                     // Load and display appointments based on the current filter for the queue section
                     displayAppointments(currentFilter); // Use the current filter state


                 } else if (viewId === 'schedulePrayerSection') {
                     // When showing the schedule/prayer section, ensure its cards are visible
                     if(schedulePrayerSection) schedulePrayerSection.style.display = 'block';
                     if(customTimerSection) customTimerSection.style.display = 'block';
                     if(prayerTimesSection) prayerTimesSection.style.display = 'block';
                     // Hide the queue section card
                     if(todayQueueSection.querySelector('.card')) todayQueueSection.querySelector('.card').style.display = 'none';
                 }
             }

             // Update active state for sidebar navigation buttons
             navButtons.forEach(button => {
                 if (button.getAttribute('data-target') === viewId) {
                     button.classList.add('active');
                 } else {
                     button.classList.remove('active');
                 }
             });
        }


        /**
         * Formats a Date object into Paribas-MM-DD string.
         * @param {Date} date - The Date object.
         * @returns {string} Formatted date string.
         */
        function formatDate(date) {
            const year = date.getFullYear();
            const month = ('0' + (date.getMonth() + 1)).slice(-2);
            const day = ('0' + date.getDate()).slice(-2);
            return `${year}-${month}-${day}`;
        }

         /**
         * Formats a Date object into a readable time string (HH:MM).
         * @param {Date} date - The Date object.
         * @returns {string} Formatted time string.
         */
        function formatTime(date) {
            const hours = ('0' + date.getHours()).slice(-2);
            const minutes = ('0' + date.getMinutes()).slice(-2);
            return `${hours}:${minutes}`;
        }

         /**
         * Calculates the time difference between two dates and formats it as H jam M menit S detik.
         * @param {Date} startDate - The starting date.
         * @param {Date} endDate - The ending date.
         * @returns {string} Formatted time difference string.
         */
        function formatTimeDifference(startDate, endDate) {
            let diff = (endDate.getTime() - startDate.getTime()) / 1000; // Difference in seconds

            if (diff < 0) {
                return "Waktu telah berlalu.";
            }

            const days = Math.floor(diff / (24 * 3600));
            diff -= days * 24 * 3600;
            const hours = Math.floor(diff / 3600);
            diff -= hours * 3600;
            const minutes = Math.floor(diff / 60);
            diff -= minutes * 60;
            const seconds = Math.floor(diff);

            let parts = [];
            if (days > 0) parts.push(`${days} hari`);
            if (hours > 0) parts.push(`${hours} jam`);
            if (minutes > 0) parts.push(`${minutes} menit`);
            if (seconds > 0 || parts.length === 0) parts.push(`${seconds} detik`); // Show seconds if difference is less than a minute

            return parts.join(' ');
        }

        /**
         * Converts day names in Indonesian to numbers (0 for Minggu, 1 for Senin, etc.)
         * @param {string} dayName - The name of the day in Indonesian.
         * @returns {number|null} The day number (0-6) or null if invalid.
         */
        function getDayNumber(dayName) {
            const dayMap = {
                'Minggu': 0,
                'Senin': 1,
                'Selasa': 2,
                'Rabu': 3,
                'Kamis': 4,
                'Jumat': 5,
                'Sabtu': 6
            };
            return dayMap[dayName];
        }


        // --- Firebase Initialization and Config Fetch ---

        /**
         * Fetches Firebase configuration from the backend API.
         * @returns {Promise<object|null>} Promise resolving with config object or null on failure.
         */
        async function fetchFirebaseConfig() {
            try {
                console.log("Mengambil konfigurasi Firebase dari backend...");
                // Endpoint ini harus tersedia di server.js Anda
                const response = await fetch('/api/firebase-config');
                if (!response.ok) {
                    let errorDetail = `Status ${response.status}`;
                    try { const errJson = await response.json(); errorDetail = errJson.data?.message || errorDetail; } catch(e) {}
                    throw new Error(`Network response was not ok: ${errorDetail}`);
                }
                const config = await response.json();
                if (!config || !config.apiKey || !config.authDomain || !config.projectId) {
                    throw new Error("Konfigurasi Firebase yang diterima dari API tidak lengkap/valid.");
                }
                console.log("Konfigurasi Firebase berhasil diambil dari API.");
                return config;
            } catch (error) {
                console.error("Error fetching Firebase config:", error);
                displayState('error', `Gagal memuat konfigurasi layanan: ${error.message}.`);
                return null;
            }
        }

        /**
         * Initializes Firebase App, Auth, and Database instances.
         * @param {object} config - Firebase configuration object.
         * @returns {boolean} True if initialization was successful, false otherwise.
         */
        function initializeFirebase(config) {
            if (!config) {
                console.error("Inisialisasi dibatalkan: Konfigurasi Firebase tidak valid.");
                displayState('error', 'Gagal menginisialisasi Firebase: Konfigurasi tidak valid.');
                return false;
            }
            try {
                // Check if Firebase SDK is loaded (compat versions)
                if (typeof firebase === 'undefined' || typeof firebase.initializeApp === 'undefined' || typeof firebase.auth === 'undefined' || typeof firebase.database === 'undefined') {
                    throw new Error("Firebase SDK (compat) belum dimuat dengan benar di HTML. Periksa tag <script>.");
                }

                // Initialize Firebase App if not already initialized
                if (!firebase.apps.length) {
                    firebaseApp = firebase.initializeApp(config);
                    console.log("Firebase App diinisialisasi.");
                } else {
                    firebaseApp = firebase.app();
                    console.log("Menggunakan instance Firebase App yang sudah ada.");
                }

                // Get Auth and Database instances
                firebaseAuth = firebase.auth();
                firebaseDb = firebase.database();
                console.log("Firebase Auth dan Database instance didapatkan.");
                return true; // Initialization successful

            } catch (error) {
                console.error("Gagal inisialisasi Firebase:", error);
                displayState('error', `Gagal menginisialisasi Firebase: ${error.message}`);
                return false; // Initialization failed
            }
        }

        /**
         * Logs out the current user.
         */
        window.logoutUser = function() {
            console.log("Fungsi logoutUser dipanggil.");
            if (firebaseAuth && firebaseAuth.currentUser) {
                firebaseAuth.signOut().then(() => {
                    console.log("Logout berhasil.");
                    // Redirect to login page after successful logout
                    window.location.href = 'login.html';
                }).catch((error) => {
                    console.error("Error logout:", error);
                    showNotificationError('Gagal logout: ' + error.message);
                });
            } else {
                console.log("Tidak ada pengguna yang login atau Firebase Auth belum siap. Mengarahkan langsung ke login.");
                window.location.href = 'login.html';
            }
        }

        // --- Data Loading and Display Functions for Doctor Dashboard ---

        /**
         * Loads doctor's specific data and appointments from Realtime Database.
         * Stores all appointments in `allAppointments` array.
         * @param {string} doctorUid - The UID of the logged-in doctor.
         */
        async function loadDoctorData(doctorUid) {
            if (!firebaseDb) {
                console.error("Database belum siap untuk memuat data dokter.");
                if (scheduleInfoP) scheduleInfoP.innerHTML = "Gagal memuat jadwal.";
                if (appointmentListUl) appointmentListUl.innerHTML = '<li>Gagal memuat antrian.</li>';
                if (noAppointmentsMsgP) noAppointmentsMsgP.classList.add('hidden');
                displayState('error', 'Koneksi database belum siap.');
                return;
            }

            console.log(`Memuat data untuk dokter UID: ${doctorUid}`);

            try {
                // 1. Load doctor's profile data (like name, specialization, schedule)
                const doctorProfileRef = firebaseDb.ref(`daftar_dokter/${doctorUid}`);
                const profileSnapshot = await doctorProfileRef.once('value');

                let doctorName = 'Dokter'; // Default name
                doctorSchedule = null; // Reset schedule data

                if (profileSnapshot.exists()) {
                    const profileData = profileSnapshot.val();
                    console.log("Data profil dokter dimuat:", profileData);

                    doctorName = profileData.nama || 'Dokter';
                    doctorSchedule = profileData; // Store the entire schedule data

                    // Update UI with doctor's name and schedule
                    if (doctorNameSpan) doctorNameSpan.textContent = `Login sebagai ${doctorName}`;
                    if (greetingNameSpan) greetingNameSpan.textContent = doctorName;
                    if (scheduleInfoP) {
                         // Make day and time more visible
                         scheduleInfoP.innerHTML = `Jadwal: <strong>${profileData.hari_praktik || '-'}</strong>, Pukul: <strong>${profileData.jam_mulai || '-'} - ${profileData.jam_selesai || '-'}</strong>`;
                    }

                    // Start schedule countdown if schedule data is available
                    startScheduleCountdown();


                } else {
                    console.warn(`Data profil dokter untuk UID ${doctorUid} tidak ditemukan di database.`);
                    if (doctorNameSpan) doctorNameSpan.textContent = 'Login sebagai Dokter (Data Profil Tidak Ditemukan)';
                    if (greetingNameSpan) greetingNameSpan.textContent = 'Dokter';
                    if (scheduleInfoP) scheduleInfoP.innerHTML = "Data jadwal tidak ditemukan.";
                    if (countdownTimerDiv) countdownTimerDiv.classList.add('hidden'); // Hide countdown if no schedule
                }

                // 2. Load all appointments related to this doctor
                // We load all first, then filter for display
                const appointmentsRef = firebaseDb.ref('reservasi');
                const appointmentsSnapshot = await appointmentsRef.orderByChild('dokter_id').equalTo(doctorUid).once('value');

                allAppointments = []; // Clear previous data

                if (appointmentsSnapshot.exists()) {
                    console.log("Data antrian pasien dimuat.");
                    appointmentsSnapshot.forEach(appointmentSnapshot => {
                        const reservationId = appointmentSnapshot.key;
                        const appointmentData = appointmentSnapshot.val();
                        allAppointments.push({
                            id: reservationId,
                            ...appointmentData
                        });
                    });
                     console.log(`Total ${allAppointments.length} reservasi dimuat.`);
                } else {
                     console.log("Tidak ada antrian pasien mendatang untuk dokter ini.");
                }

                // Display initial content view (Schedule & Prayer)
                displayState('content'); // Show the main content wrapper
                showContentView('schedulePrayerSection'); // Set initial view here

                // Load prayer times
                loadPrayerTimes();


            } catch (error) {
                console.error("Error saat memuat data dokter atau antrian:", error);
                displayState('error', `Gagal memuat data dashboard: ${error.message}.`);
            }
        }

        /**
         * Filters and displays appointments based on the selected filter.
         * This function is now primarily used by the "Antrian Pasien" card.
         * @param {'today'|'all'} filter - The filter to apply.
         */
        function displayAppointments(filter) {
            if (!appointmentListUl || !noAppointmentsMsgP) {
                 console.error("Elemen daftar antrian atau pesan 'no data' tidak ditemukan.");
                 return;
            }

            currentFilter = filter; // Update current filter state

            appointmentListUl.innerHTML = ''; // Clear current list

            const today = formatDate(new Date());
            let filteredAppointments = allAppointments;

            if (filter === 'today') {
                // Filter for appointments scheduled for TODAY and not completed
                filteredAppointments = allAppointments.filter(appt => {
                    // Check if the appointment date is exactly today's date string
                    return (appt.tanggal === today) && (appt.status !== 'Selesai');
                });
                 console.log(`Menampilkan ${filteredAppointments.length} antrian untuk Hari Ini.`);
            } else if (filter === 'all') {
                 // Show all appointments, including past and completed ones
                 filteredAppointments = allAppointments;
                 console.log(`Menampilkan semua (${filteredAppointments.length}) antrian.`);
            }

             // Sort appointments by date and time for 'today' filter
             if (filter === 'today') {
                 filteredAppointments.sort((a, b) => {
                     const dateTimeA = new Date(`${a.tanggal}T${a.waktu}`);
                     const dateTimeB = new Date(`${b.tanggal}T${b.waktu}`);
                     return dateTimeA - dateTimeB;
                     // Handle potential invalid dates from data
                 }).filter(appt => {
                     const dateTime = new Date(`${appt.tanggal}T${appt.waktu}`);
                     return !isNaN(dateTime.getTime()); // Filter out invalid date/time entries
                 });
             }


            if (filteredAppointments.length > 0) {
                filteredAppointments.forEach(appointment => {
                    const li = document.createElement('li');
                    // Use flexbox for layout within the list item
                    li.innerHTML = `
                        <div class='appointment-details'>
                            <strong>${appointment.nama || 'Pasien Tidak Dikenal'}</strong>
                            <span>${appointment.tanggal} ${appointment.waktu || ''}</span>
                            <span class='text-gray-500 text-sm'>RS: ${appointment.rumah_sakit || '-'}</span>
                            <div class='text-gray-500 text-sm mt-1'>Catatan: ${appointment.diagnosis || '-'}</div>
                        </div>
                        ${appointment.status === 'Selesai'
                            ? `<span class="status-completed">Selesai</span>`
                            : `<button onclick="markAppointmentComplete('${appointment.id}')">Selesai</button>`
                        }
                    `;
                    appointmentListUl.appendChild(li);
                });
                noAppointmentsMsgP.classList.add('hidden'); // Hide "no data" message
            } else {
                // No appointments match the filter
                noAppointmentsMsgP.classList.remove('hidden'); // Show "no data" message
            }

            // Update active state of filter buttons
            if (filterTodayButton && filterAllButton) {
                filterTodayButton.classList.remove('bg-blue-500', 'hover:bg-blue-600', 'dark:bg-blue-600', 'dark:hover:bg-blue-700', 'bg-gray-200', 'text-gray-800', 'shadow-sm', 'hover:bg-gray-300', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:hover:bg-gray-600');
                 filterAllButton.classList.remove('bg-blue-500', 'hover:bg-blue-600', 'dark:bg-blue-600', 'dark:hover:bg-blue-700', 'bg-gray-200', 'text-gray-800', 'shadow-sm', 'hover:bg-gray-300', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:hover:bg-gray-600');


                if (filter === 'today') {
                    filterTodayButton.classList.add('bg-blue-500', 'text-white', 'shadow-md', 'hover:bg-blue-600', 'dark:bg-blue-600', 'dark:hover:bg-blue-700');
                    filterAllButton.classList.add('bg-gray-200', 'text-gray-800', 'shadow-sm', 'hover:bg-gray-300', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:hover:bg-gray-600');
                } else { // filter === 'all'
                    filterTodayButton.classList.add('bg-gray-200', 'text-gray-800', 'shadow-sm', 'hover:bg-gray-300', 'dark:bg-gray-700', 'dark:text-gray-200', 'dark:hover:bg-gray-600');
                    filterAllButton.classList.add('bg-blue-500', 'text-white', 'shadow-md', 'hover:bg-blue-600', 'dark:bg-blue-600', 'dark:hover:bg-blue-700');
                }
            }
        }


        /**
         * Marks a specific appointment as 'Selesai' in the database.
         * @param {string} reservationId - The ID of the reservation to mark complete.
         */
        window.markAppointmentComplete = async (reservationId) => {
             if (!firebaseDb) {
                 showNotificationError('Koneksi database belum siap.');
                 return;
             }

             console.log(`Menandai reservasi ${reservationId} sebagai Selesai.`);

             // Optional: Show confirmation dialog before marking complete
             const confirmResult = await Swal.fire({
                 title: 'Tandai Selesai?',
                 text: "Anda yakin ingin menandai reservasi ini sebagai selesai?",
                 icon: 'question',
                 showCancelButton: true,
                 confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--success-color').trim(),
                 cancelButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
                 confirmButtonText: 'Ya, Selesai!',
                 cancelButtonText: 'Batal'
             });

             if (!confirmResult.isConfirmed) {
                 return; // User cancelled
             }


             try {
                 // Update the status field in the database
                 await firebaseDb.ref(`reservasi/${reservationId}`).update({
                     status: 'Selesai',
                     // Optional: Add a completion timestamp
                     completed_at: new Date().toISOString()
                 });

                 console.log(`Reservasi ${reservationId} berhasil ditandai Selesai.`);
                 showNotificationSuccess('Reservasi berhasil ditandai selesai.');

                 // Update the local `allAppointments` array and re-display the list
                 const appointmentIndex = allAppointments.findIndex(appt => appt.id === reservationId);
                 if (appointmentIndex > -1) {
                     allAppointments[appointmentIndex].status = 'Selesai';
                     allAppointments[appointmentIndex].completed_at = new Date().toISOString(); // Update local timestamp
                 }
                 // Re-display the list based on the current filter
                 displayAppointments(currentFilter);

             } catch (error) {
                 console.error(`Gagal menandai reservasi ${reservationId} sebagai Selesai:`, error);
                 showNotificationError(`Gagal menandai reservasi selesai: ${error.message}`);
             }
        }

        // --- Schedule Countdown Timer Functions ---

        /**
         * Starts the countdown timer to the next practice schedule.
         */
        function startScheduleCountdown() {
            if (!doctorSchedule || !doctorSchedule.hari_praktik || !doctorSchedule.jam_mulai || !countdownTimerDiv || !countdownTextSpan) {
                console.warn("Data jadwal tidak lengkap untuk memulai countdown jadwal.");
                if (countdownTimerDiv) countdownTimerDiv.classList.add('hidden');
                return;
            }

            // Clear any existing schedule interval
            if (scheduleCountdownInterval) {
                clearInterval(scheduleCountdownInterval);
            }

            countdownTimerDiv.classList.remove('hidden'); // Show the schedule countdown div

            // Function to update the schedule timer text
            const updateScheduleTimer = () => {
                const now = new Date();
                const daysOfWeek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                // Split and trim day names, convert to day numbers
                const practiceDayNumbers = doctorSchedule.hari_praktik.split(',').map(day => getDayNumber(day.trim())).filter(dayNum => dayNum !== null);

                if (practiceDayNumbers.length === 0) {
                    countdownTextSpan.textContent = "Jadwal praktik tidak valid.";
                    if (scheduleCountdownInterval) clearInterval(scheduleCountdownInterval);
                    return;
                }

                const [startHour, startMinute] = doctorSchedule.jam_mulai.split(':').map(Number);

                let nextPracticeTime = null;

                // Find the next upcoming practice day and time
                for (let i = 0; i < 7; i++) {
                    const nextDate = new Date(now);
                    nextDate.setDate(now.getDate() + i);
                    const nextDayNumber = nextDate.getDay();

                    if (practiceDayNumbers.includes(nextDayNumber)) {
                        const potentialPracticeTime = new Date(nextDate);
                        potentialPracticeTime.setHours(startHour, startMinute, 0, 0);

                        // If the potential practice time is in the future
                        if (potentialPracticeTime > now) {
                            nextPracticeTime = potentialPracticeTime;
                            break; // Found the next upcoming time
                        }
                    }
                }

                if (nextPracticeTime) {
                    const timeRemaining = formatTimeDifference(now, nextPracticeTime);
                    const nextDayName = daysOfWeek[nextPracticeTime.getDay()];
                    const startTime = formatTime(nextPracticeTime);

                    // Display countdown to the next specific practice time
                    countdownTextSpan.textContent = `Praktik berikutnya: ${nextDayName}, Pukul ${startTime} (dalam ${timeRemaining})`;

                } else {
                     // This might happen if the last practice time of the week just passed
                     countdownTextSpan.textContent = "Tidak ada jadwal praktik mendatang dalam 7 hari ke depan.";
                     if (scheduleCountdownInterval) clearInterval(scheduleCountdownInterval); // Stop interval if no next schedule found
                }
            };

            // Initial call and then update every second
            updateScheduleTimer();
            scheduleCountdownInterval = setInterval(updateScheduleTimer, 1000);
        }

        // --- Custom Reminder Timer Functions ---

        /**
         * Starts a custom timer based on user input (target time).
         * Can optionally take a target time and description to pre-fill (e.g., from prayer times).
         * @param {string} [prefillTime] - Optional time string (HH:MM) to pre-fill.
         * @param {string} [prefillDescription] - Optional description string to pre-fill.
         */
        function startCustomTimer(prefillTime = null, prefillDescription = null) {
            // Pre-fill inputs if values are provided
            if (prefillTime) targetTimeInput.value = prefillTime;
            if (prefillDescription) timerDescriptionInput.value = prefillDescription;

            const targetTimeString = targetTimeInput.value; // Get time string from input
            const description = timerDescriptionInput.value.trim(); // Get description

            if (!targetTimeString) {
                Swal.fire('Input Tidak Valid', 'Harap masukkan waktu target untuk pengingat.', 'warning');
                return;
            }

            if (!description) {
                 Swal.fire('Keterangan Kosong', 'Harap masukkan keterangan untuk pengingat ini.', 'warning');
                 return;
            }

            const now = new Date();
            const [targetHour, targetMinute] = targetTimeString.split(':').map(Number);

            // Create a Date object for the target time today
            let targetDateTime = new Date(now);
            targetDateTime.setHours(targetHour, targetMinute, 0, 0);

            // If the target time today is in the past, set it for tomorrow
            if (targetDateTime <= now) {
                targetDateTime.setDate(targetDateTime.getDate() + 1);
            }

            customTimerEndTime = targetDateTime; // Store the calculated end time
            customTimerDescription = description; // Store description

            console.log(`Memulai timer kustom untuk waktu target: ${targetTimeString} (${customTimerDescription}). Berakhir pada: ${customTimerEndTime}`);

            // Show the custom timer display
            customTimerDisplay.classList.remove('hidden');
            timerDescriptionDisplaySpan.textContent = `(${customTimerDescription})`; // Display description

            // Clear any existing custom timer interval
            if (customTimerInterval) {
                clearInterval(customTimerInterval);
            }

            // Function to update the custom timer display
            const updateCustomTimer = () => {
                const now = new Date();
                const timeRemaining = formatTimeDifference(now, customTimerEndTime);

                if (customTimerEndTime > now) {
                    timerCountdownTextSpan.textContent = timeRemaining;
                } else {
                    // Timer finished
                    timerCountdownTextSpan.textContent = "Waktu habis!";
                    clearInterval(customTimerInterval); // Stop the interval
                    customTimerInterval = null; // Reset interval ID
                    customTimerEndTime = null; // Reset end time
                    // Show notification regardless of current view
                    Swal.fire({
                        title: 'Pengingat Selesai!',
                        text: `Waktu untuk "${customTimerDescription}" telah tiba.`,
                        icon: 'info', // Using info icon for a reminder
                        confirmButtonText: 'OK'
                    });
                    console.log(`Pengingat "${customTimerDescription}" selesai!`);
                    customTimerDescription = ''; // Clear description

                    // Optional: Hide the timer display after a delay
                    setTimeout(() => {
                        customTimerDisplay.classList.add('hidden');
                         targetTimeInput.value = ''; // Reset time input
                         timerDescriptionInput.value = ''; // Reset description input
                         timerDescriptionDisplaySpan.textContent = ''; // Clear displayed description
                    }, 5000); // Hide after 5 seconds
                }
            };

            // Initial call and then update every second
            updateCustomTimer();
            customTimerInterval = setInterval(updateCustomTimer, 1000);
        }

        // --- Prayer Times Functions ---

        /**
         * Loads prayer times for the current date and a specific location using an API.
         * Displays the prayer times in the dedicated section with 'Set Alarm' buttons.
         */
        async function loadPrayerTimes() {
            if (!prayerTimesListUl) {
                 console.error("Elemen daftar waktu sholat tidak ditemukan.");
                 return;
            }

            prayerTimesListUl.innerHTML = '<li class="loading-prayer-times">Memuat waktu sholat...</li>'; // Show loading state

            // *** IMPORTANT: Replace with actual location (latitude, longitude) or city/country
            // You might need to store the doctor's hospital location or ask the user for location.
            // For this example, using a placeholder location (e.g., Yogyakarta, Indonesia).
            const latitude = -7.7956; // Example: Yogyakarta latitude
            const longitude = 110.3695; // Example: Yogyakarta longitude
            const method = 11; // Example: Kemenag (Indonesia) calculation method
            const date = formatDate(new Date()); // Today's date

            // Using Aladhan API as an example
            const apiUrl = `https://api.aladhan.com/v1/timings/${date}?latitude=${latitude}&longitude=${longitude}&method=${method}`;

            try {
                console.log(`Mengambil waktu sholat dari API: ${apiUrl}`);
                const response = await fetch(apiUrl);

                if (!response.ok) {
                    let errorDetail = `Status ${response.status}`;
                    try { const errJson = await response.json(); errorDetail = errJson.data?.message || errorDetail; } catch(e) {}
                    throw new Error(`Network response was not ok: ${errorDetail}`);
                }

                const data = await response.json();

                if (data.status !== 'OK' || !data.data || !data.data.timings) {
                    throw new Error(`API response indicates an error: ${data.status} - ${data.data?.message || 'Unknown error'}`);
                }

                const timings = data.data.timings;
                console.log("Waktu sholat dimuat:", timings);

                // Clear loading/error message
                prayerTimesListUl.innerHTML = '';

                // Display relevant prayer times with Set Alarm buttons
                const prayerNames = {
                    Fajr: 'Subuh',
                    Sunrise: 'Terbit',
                    Dhuhr: 'Dzuhur',
                    Asr: 'Ashar',
                    Sunset: 'Maghrib',
                    Isha: 'Isya',
                    Imsak: 'Imsak', // Optional
                    Midnight: 'Tengah Malam' // Optional
                };

                // Create list items for each prayer time
                for (const [key, value] of Object.entries(timings)) {
                    // Only display known prayer times
                    if (prayerNames[key]) {
                         const li = document.createElement('li');
                         const prayerTime = value; // e.g., "04:30"
                         const prayerName = prayerNames[key]; // e.g., "Subuh"

                         li.innerHTML = `
                             <span>${prayerName}</span>
                             <strong>${prayerTime}</strong>
                             <button onclick="startCustomTimer('${prayerTime}', 'Pengingat ${prayerName}')">Set Alarm</button>
                         `;
                         prayerTimesListUl.appendChild(li);
                    }
                }

            } catch (error) {
                console.error("Gagal memuat waktu sholat:", error);
                prayerTimesListUl.innerHTML = `<li class="error-prayer-times">Gagal memuat waktu sholat: ${error.message}</li>`;
                // Show notification error as well
                showNotificationError(`Gagal memuat waktu sholat: ${error.message}`);
            }
        }


        // --- Main Initialization Logic ---

        /**
         * Main asynchronous initialization function for the doctor dashboard.
         * Fetches config, initializes Firebase, checks auth state and doctor claim, and loads data.
         */
        async function main() {
            console.log("DOM Content Loaded. Memulai proses inisialisasi halaman dokter...");
            displayState('loading'); // Show loading state initially

            // Fetch Firebase config from backend
            const firebaseConfig = await fetchFirebaseConfig();

            // If config is successfully fetched, initialize Firebase
            if (firebaseConfig && initializeFirebase(firebaseConfig)) {
                console.log("Firebase berhasil diinisialisasi. Memeriksa status autentikasi...");

                // Check authentication state
                firebaseAuth.onAuthStateChanged(async (user) => {
                    if (user) {
                        console.log("Pengguna terautentikasi:", user.email, "UID:", user.uid);
                        try {
                            // Get ID token result to check custom claims
                            // Passing true forces a token refresh to get latest claims
                            const idTokenResult = await user.getIdTokenResult(true);
                            console.log("Custom Claims:", idTokenResult.claims);

                            // Check if user has 'doctor: true' claim
                            if (idTokenResult.claims.doctor === true) {
                                console.log("Pengguna terverifikasi sebagai dokter.");

                                // Load doctor's specific data and appointments, and prayer times
                                await loadDoctorData(user.uid);

                                // Set initial view after data is loaded
                                showContentView('schedulePrayerSection');


                            } else {
                                console.warn("Akses ditolak: Pengguna", user.uid, "bukan dokter.");
                                displayState('error', "Anda tidak memiliki hak akses sebagai dokter untuk halaman ini. Anda akan diarahkan ke halaman login.");
                                // Redirect non-doctor users to login after a delay
                                setTimeout(logoutUser, 4000);
                            }
                        } catch (error) {
                            console.error("Error saat memeriksa custom claims dokter:", error);
                            displayState('error', `Gagal melakukan verifikasi status dokter: ${error.message}. Silakan coba login kembali.`);
                            // Redirect on error during claim check
                            setTimeout(logoutUser, 4000);
                        }
                    } else {
                        console.log("Tidak ada pengguna yang login. Mengarahkan ke halaman login.");
                        // Redirect unauthenticated users to login page
                        window.location.href = 'login.html';
                    }
                });
            } else {
                console.error("Inisialisasi Firebase gagal. Halaman tidak dapat dimuat.");
                // Error message already shown in fetchFirebaseConfig or initializeFirebase
                displayState('error', 'Gagal memuat halaman karena masalah inisialisasi.');
            }
        }

        // --- Event Listeners ---

        // Sidebar navigation button listeners
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-target');
                if (targetId) {
                    showContentView(targetId);
                     // Close mobile sidebar if open
                     if (window.innerWidth < 768 && mainSidebar.classList.contains('open-mobile')) {
                        mainSidebar.classList.remove('open-mobile');
                        sidebarOverlay.classList.add('hidden');
                        document.body.classList.remove('overflow-hidden-custom');
                     }
                }
            });
        });

        // Sidebar toggle button listener
         if (sidebarToggleBtn && mainSidebar && mainContent && sidebarOverlay) {
            sidebarToggleBtn.addEventListener('click', () => {
                const isMobile = window.innerWidth < 768;

                if (isMobile) {
                    mainSidebar.classList.toggle('open-mobile');
                    sidebarOverlay.classList.toggle('hidden');
                    document.body.classList.toggle('overflow-hidden-custom');
                } else {
                    mainSidebar.classList.toggle('collapsed');
                    mainContent.classList.toggle('sidebar-collapsed');
                }
                console.log("Sidebar toggled. Collapsed:", mainSidebar.classList.contains('collapsed'), "Mobile Open:", mainSidebar.classList.contains('open-mobile'));
            });

            // Sidebar overlay click listener (closes mobile sidebar)
            sidebarOverlay.addEventListener('click', () => {
                 if (window.innerWidth < 768) {
                     mainSidebar.classList.remove('open-mobile');
                     sidebarOverlay.classList.add('hidden');
                     document.body.classList.remove('overflow-hidden-custom');
                     console.log("Mobile sidebar closed via overlay click.");
                 }
            });
        } else {
             console.warn("Elemen sidebar atau toggle button tidak ditemukan sepenuhnya.");
        }

        // Filter button listeners (for Antrian Pasien card)
        if (filterTodayButton) {
             filterTodayButton.addEventListener('click', () => displayAppointments('today'));
        }
        if (filterAllButton) {
             filterAllButton.addEventListener('click', () => displayAppointments('all'));
        }


        // Edit Schedule button listener (Placeholder functionality)
        if (editScheduleBtn) {
            editScheduleBtn.addEventListener('click', () => {
                // Show message to contact admin
                Swal.fire({
                    title: 'Ubah Jadwal Praktik',
                    html: 'Untuk mengubah jadwal praktik Anda, silakan hubungi administrator sistem.<br><br>Admin akan membantu Anda melakukan perubahan yang diperlukan.',
                    icon: 'info',
                    confirmButtonText: 'OK'
                });
            });
        }

        // Start Custom Timer button listener
        if (startTimerBtn) {
            startTimerBtn.addEventListener('click', () => startCustomTimer()); // Call without prefill args
        }


        // Start the main initialization process when the DOM is ready
        document.addEventListener('DOMContentLoaded', main);

        // Clean up intervals when leaving the page
        window.addEventListener('beforeunload', () => {
            if (scheduleCountdownInterval) {
                clearInterval(scheduleCountdownInterval);
            }
            if (customTimerInterval) {
                clearInterval(customTimerInterval);
            }
        });

        // Handle window resize for sidebar behavior
        window.addEventListener('resize', () => {
             const isMobile = window.innerWidth < 768;
             if (!isMobile) {
                 // On desktop, ensure sidebar is not in mobile 'open-mobile' state
                 mainSidebar.classList.remove('open-mobile');
                 sidebarOverlay.classList.add('hidden');
                 document.body.classList.remove('overflow-hidden-custom');
                 // Apply desktop margin based on collapsed state
                 if (!mainSidebar.classList.contains('collapsed')) {
                      mainContent.style.marginLeft = 'var(--sidebar-width)';
                 } else {
                      mainContent.style.marginLeft = '0';
                 }
             } else {
                 // On mobile, remove desktop margin
                 mainContent.style.marginLeft = '0';
             }
        });

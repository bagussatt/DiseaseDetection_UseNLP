// ========================================================
// JavaScript untuk Halaman Kelola Dokter (dokter-script.js)
// ========================================================

// --- Variabel Global ---
let firebaseApp;
let firebaseAuth;
let firebaseDb;

// Elemen UI Tema
const themeToggleButton = document.getElementById('theme-toggle');
const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

// Elemen UI Form Dokter
const doctorFormContainer = document.getElementById('doctorFormContainer');
const openAddDoctorFormBtn = document.getElementById('openAddDoctorFormBtn');
const doctorCrudForm = document.getElementById('doctorCrudForm');
const doctorFormTitle = document.getElementById('doctorFormTitle');
const doctorEditIdInput = document.getElementById('doctorEditId');
const doctorNameInput = document.getElementById('doctorNameInput');
const doctorPoliInput = document.getElementById('doctorPoliInput');
const doctorSpecialistInput = document.getElementById('doctorSpecialistInput');
const doctorHospitalInput = document.getElementById('doctorHospitalInput');
const doctorPracticeHoursInput = document.getElementById('doctorPracticeHoursInput');
const doctorSubmitBtn = document.getElementById('doctorSubmitBtn');
const cancelDoctorEditBtn = document.getElementById('cancelDoctorEditBtn');

// Elemen UI Tabel Dokter
const doctorListTableBody = document.getElementById('doctorListTableBody');
const noDoctorMessage = document.getElementById('noDoctorMessage');

// --- Fungsi Utilitas UI ---
function escapeHtml(unsafe) {
    if (unsafe === null || typeof unsafe === 'undefined') return "";
    return unsafe.toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function showLoadingMessageInTable(tableBody, colspan, message = "Memuat data...") {
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-10 text-slate-500 dark:text-slate-400 italic">
                                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i><br>${escapeHtml(message)}
                              </td></tr>`;
    }
}

function showNoDataMessage(messageElement, show, message = "Belum ada data.") {
    if (messageElement) {
        messageElement.textContent = escapeHtml(message);
        messageElement.classList.toggle('hidden', !show);
    }
}

// --- Fungsi Tema ---
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        if(themeToggleLightIcon) themeToggleLightIcon.classList.remove('hidden');
        if(themeToggleDarkIcon) themeToggleDarkIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        if(themeToggleLightIcon) themeToggleLightIcon.classList.add('hidden');
        if(themeToggleDarkIcon) themeToggleDarkIcon.classList.remove('hidden');
    }
    console.log("Theme applied:", theme);
}

function toggleTheme() {
    const currentTheme = localStorage.getItem('theme');
    // Jika tema saat ini 'dark' ATAU (belum ada tema di localStorage DAN sistem prefer dark)
    let newTheme;
    if (currentTheme === 'dark') {
        newTheme = 'light';
    } else if (currentTheme === 'light') {
        newTheme = 'dark';
    } else { // Jika localStorage kosong, cek preferensi sistem
        newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
    }
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    console.log(`Tema diubah ke: ${newTheme}`);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (systemPrefersDark) {
        applyTheme('dark');
    } else {
        applyTheme('light'); // Default ke light jika tidak ada preferensi atau simpanan
    }
    console.log("Theme initialized.");
}

// --- Fungsi Firebase ---
async function fetchFirebaseConfig() {
    try {
        // GANTI DENGAN URL API BACKEND ANDA UNTUK MENGAMBIL KONFIGURASI FIREBASE
        // ATAU HARDCODE KONFIGURASI DI SINI (KURANG AMAN UNTUK PRODUCTION)
        // const response = await fetch('/api/firebase-config');
        // if (!response.ok) throw new Error(`Network response was not ok`);
        // const config = await response.json();
        // if (!config.apiKey) throw new Error("Firebase config from API is incomplete.");
        // console.log("Konfigurasi Firebase berhasil diambil dari API.");
        // return config;

        // Untuk sekarang, gunakan placeholder. GANTI INI!
        console.warn("Menggunakan konfigurasi Firebase placeholder. Harap ganti dengan konfigurasi Anda yang sebenarnya!");
        return {
            apiKey: "YOUR_API_KEY",
            authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
            databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app", // Sesuaikan region
            projectId: "YOUR_PROJECT_ID",
            storageBucket: "YOUR_PROJECT_ID.appspot.com",
            messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
            appId: "YOUR_APP_ID"
        };
    } catch (error) {
        console.error("Error fetching Firebase config:", error);
        Swal.fire('Error Konfigurasi', `Gagal memuat konfigurasi Firebase: ${error.message}. Pastikan backend berjalan atau konfigurasi benar.`, 'error');
        return null;
    }
}

function initializeFirebase(config) {
    if (!config || !config.apiKey) {
        console.error("Konfigurasi Firebase tidak valid atau tidak lengkap.");
        Swal.fire('Error Inisialisasi', 'Konfigurasi Firebase tidak ditemukan atau tidak valid.', 'error');
        return false;
    }
    try {
        if (typeof firebase === 'undefined' || typeof firebase.initializeApp === 'undefined') {
            throw new Error("Firebase SDK belum dimuat. Pastikan script Firebase SDK ada di HTML.");
        }
        // Inisialisasi Firebase hanya jika belum ada instance
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(config);
            console.log("Firebase App diinisialisasi.");
        } else {
            firebaseApp = firebase.app(); // Gunakan instance yang sudah ada
            console.log("Menggunakan instance Firebase App yang sudah ada.");
        }
        // firebaseAuth = firebase.auth(); // Mungkin tidak diperlukan jika halaman ini tidak butuh auth khusus
        firebaseDb = firebase.database();
        console.log("Firebase Database instance didapatkan.");
        return true;
    } catch (error) {
        console.error("Gagal inisialisasi Firebase:", error);
        Swal.fire('Error Inisialisasi', `Gagal inisialisasi Firebase: ${error.message}`, 'error');
        return false;
    }
}

// --- Fungsi CRUD Rumah Sakit (untuk mengisi dropdown) ---
async function loadHospitalsForDropdown() {
    if (!firebaseDb) { console.error("Database belum siap untuk memuat RS."); return; }
    if (!doctorHospitalInput) { console.error("Elemen dropdown RS tidak ditemukan."); return; }

    const hospitalRef = firebaseDb.ref('daftar_rumah_sakit'); // Sesuaikan path jika berbeda

    try {
        const snapshot = await hospitalRef.once('value');
        doctorHospitalInput.querySelectorAll('option:not([value=""])').forEach(opt => opt.remove());

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const hospitalData = childSnapshot.val();
                if (hospitalData && hospitalData.nama) {
                    const option = document.createElement('option');
                    option.value = hospitalData.nama; // Atau childSnapshot.key jika itu ID unik
                    option.textContent = escapeHtml(hospitalData.nama);
                    doctorHospitalInput.appendChild(option);
                }
            });
            console.log("Dropdown Rumah Sakit diisi.");
        } else {
            console.log("Tidak ada data rumah sakit untuk dropdown.");
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "-- Tidak ada RS terdaftar --";
            doctorHospitalInput.appendChild(option);
        }
    } catch (error) {
        console.error("Gagal memuat daftar rumah sakit untuk dropdown:", error);
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "Gagal memuat RS";
        doctorHospitalInput.appendChild(option);
    }
}


// --- Fungsi CRUD Dokter ---
function toggleDoctorForm(show = true) {
    if (doctorFormContainer) {
        doctorFormContainer.classList.toggle('hidden', !show);
        if (show) {
            doctorFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Reset form hanya jika bukan mode edit yang sedang dibuka
            if (!doctorEditIdInput.value) { // Jika ID edit kosong, berarti mode tambah
                resetDoctorForm();
            }
        }
    }
}

function resetDoctorForm() {
    console.log("Mereset form Dokter ke mode tambah.");
    if (doctorCrudForm) doctorCrudForm.reset();
    if (doctorEditIdInput) doctorEditIdInput.value = '';
    if (doctorFormTitle) doctorFormTitle.textContent = "Tambah Dokter Baru";
    if (doctorSubmitBtn) {
        doctorSubmitBtn.innerHTML = `<i class="fas fa-plus mr-2"></i> Tambah Dokter`;
        doctorSubmitBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600', 'dark:bg-yellow-600', 'dark:hover:bg-yellow-700');
        doctorSubmitBtn.classList.add('bg-green-500', 'hover:bg-green-600', 'dark:bg-green-600', 'dark:hover:bg-green-700');
    }
    if (cancelDoctorEditBtn) cancelDoctorEditBtn.classList.add('hidden');
    if (doctorNameInput) doctorNameInput.focus();
}

window.editDoctor = (id, doctorDataString) => {
    try {
        const doctorData = JSON.parse(doctorDataString);
        console.log(`Menyiapkan edit untuk Dokter ID: ${id}`, doctorData);
        if (!doctorData) { console.error("Data dokter tidak valid untuk diedit."); return; }

        toggleDoctorForm(true); // Tampilkan form

        doctorEditIdInput.value = id;
        doctorNameInput.value = doctorData.nama || '';
        doctorPoliInput.value = doctorData.poli || '';
        doctorSpecialistInput.value = doctorData.spesialis || '';
        doctorHospitalInput.value = doctorData.rumahSakit || '';
        doctorPracticeHoursInput.value = doctorData.jamPraktik || '';

        doctorFormTitle.textContent = "Edit Data Dokter";
        doctorSubmitBtn.innerHTML = `<i class="fas fa-save mr-2"></i> Simpan Perubahan`;
        doctorSubmitBtn.classList.remove('bg-green-500', 'hover:bg-green-600', 'dark:bg-green-600', 'dark:hover:bg-green-700');
        doctorSubmitBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600', 'dark:bg-yellow-600', 'dark:hover:bg-yellow-700');
        cancelDoctorEditBtn.classList.remove('hidden');
        doctorNameInput.focus();
    } catch (e) {
        console.error("Error parsing doctor data for edit:", e);
        Swal.fire('Error Data', 'Gagal memuat data dokter untuk diedit.', 'error');
    }
}


async function loadAndDisplayDoctorsTable() {
    if (!firebaseDb) { console.error("Database belum siap."); showNoDataMessage(noDoctorMessage, true, "Koneksi database gagal."); return; }
    if (!doctorListTableBody || !noDoctorMessage) { console.error("Elemen tabel Dokter tidak ditemukan."); return; }

    showLoadingMessageInTable(doctorListTableBody, 6, "Memuat data dokter...");
    showNoDataMessage(noDoctorMessage, false);

    const doctorsRef = firebaseDb.ref('daftar_dokter');

    try {
        const snapshot = await doctorsRef.once('value');
        doctorListTableBody.innerHTML = '';

        let doctorsExist = false;
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                doctorsExist = true;
                const doctorId = childSnapshot.key;
                const doctorData = childSnapshot.val();

                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors";
                const safeName = escapeHtml(doctorData.nama);
                const safePoli = escapeHtml(doctorData.poli);
                const safeSpecialist = escapeHtml(doctorData.spesialis);
                const safeHospital = escapeHtml(doctorData.rumahSakit);
                const safePractice = escapeHtml(doctorData.jamPraktik);
                // Escape string JSON untuk atribut HTML
                const doctorDataString = escapeHtml(JSON.stringify(doctorData));

                tr.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">${safeName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">${safePoli}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">${safeSpecialist}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">${safeHospital}</td>
                    <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-300"><pre class="whitespace-pre-wrap !p-0 !border-none !bg-transparent !text-inherit">${safePractice}</pre></td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button onclick="editDoctor('${doctorId}', '${doctorDataString}')" class="action-btn-table edit" title="Edit">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button onclick="confirmDeleteDoctor('${doctorId}', '${safeName}')" class="action-btn-table delete" title="Hapus">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                doctorListTableBody.appendChild(tr);
            });
        }
        showNoDataMessage(noDoctorMessage, !doctorsExist, "Belum ada data dokter.");
    } catch (error) {
        console.error("Gagal memuat daftar dokter:", error);
        showLoadingMessageInTable(doctorListTableBody, 6, "Gagal memuat data. Coba lagi nanti.");
        showNoDataMessage(noDoctorMessage, false);
        Swal.fire('Error Muat Data', 'Gagal memuat daftar dokter dari database.', 'error');
    }
}

async function handleDoctorFormSubmit(event) {
    event.preventDefault();
    const doctorId = doctorEditIdInput.value;
    const doctorName = doctorNameInput.value.trim();
    const doctorPoli = doctorPoliInput.value.trim();
    const doctorSpecialist = doctorSpecialistInput.value.trim();
    const doctorHospital = doctorHospitalInput.value;
    const doctorPracticeHours = doctorPracticeHoursInput.value.trim();

    if (!doctorName || !doctorPoli || !doctorSpecialist || !doctorHospital || !doctorPracticeHours) {
        Swal.fire('Input Tidak Lengkap', 'Harap isi semua field yang ditandai bintang.', 'warning'); return;
    }
    if (!firebaseDb) { Swal.fire('Error Koneksi', 'Koneksi database belum siap.', 'error'); return; }

    doctorSubmitBtn.disabled = true;
    doctorSubmitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Menyimpan...`;

    const doctorData = {
        nama: doctorName, poli: doctorPoli, spesialis: doctorSpecialist,
        rumahSakit: doctorHospital, jamPraktik: doctorPracticeHours,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    try {
        let operationPromise;
        let successMessage;
        if (doctorId) {
            operationPromise = firebaseDb.ref(`daftar_dokter/${doctorId}`).update(doctorData);
            successMessage = `Data dokter "${escapeHtml(doctorName)}" berhasil diperbarui.`;
        } else {
            operationPromise = firebaseDb.ref('daftar_dokter').push(doctorData);
            successMessage = `Dokter "${escapeHtml(doctorName)}" berhasil ditambahkan.`;
        }
        await operationPromise;
        Swal.fire('Berhasil!', successMessage, 'success');
        toggleDoctorForm(false); // Sembunyikan form setelah sukses
        await loadAndDisplayDoctorsTable();
    } catch (error) {
        console.error("Gagal menyimpan data dokter:", error);
        Swal.fire('Gagal!', `Terjadi kesalahan: ${error.message}`, 'error');
    } finally {
        doctorSubmitBtn.disabled = false;
        // Reset teks tombol berdasarkan mode awal form (sebelum submit)
        if (doctorEditIdInput.value) { // Jika ini adalah edit
             doctorSubmitBtn.innerHTML = `<i class="fas fa-save mr-2"></i> Simpan Perubahan`;
        } else { // Jika ini adalah tambah
             doctorSubmitBtn.innerHTML = `<i class="fas fa-plus mr-2"></i> Tambah Dokter`;
        }
    }
}

window.confirmDeleteDoctor = (id, name) => {
     if (!firebaseDb) { Swal.fire('Error Koneksi', 'Koneksi database belum siap.', 'error'); return; }
     Swal.fire({
         title: 'Hapus Dokter?',
         html: `Anda yakin ingin menghapus data dokter <strong>${escapeHtml(name)}</strong>? Tindakan ini tidak dapat diurungkan.`,
         icon: 'warning', showCancelButton: true,
         confirmButtonColor: getComputedStyle(document.documentElement).getPropertyValue('--danger-color').trim(),
         cancelButtonColor: '#6b7280',
         confirmButtonText: 'Ya, Hapus!', cancelButtonText: 'Batal',
         customClass: { popup: 'rounded-xl shadow-lg', confirmButton: 'font-semibold', cancelButton: 'font-medium' }
     }).then(async (result) => {
         if (result.isConfirmed) {
             console.log(`Menghapus Dokter ID: ${id}`);
             try {
                 await firebaseDb.ref(`daftar_dokter/${id}`).remove();
                 Swal.fire('Dihapus!', `Data dokter "${escapeHtml(name)}" telah dihapus.`, 'success');
                 await loadAndDisplayDoctorsTable();
                 if (doctorEditIdInput.value === id) {
                     resetDoctorForm();
                     toggleDoctorForm(false);
                 }
             } catch (error) {
                 console.error(`Gagal menghapus Dokter ID ${id}:`, error);
                 Swal.fire('Gagal!', `Gagal menghapus data dokter: ${error.message}`, 'error');
             }
         }
     });
}


// --- Event Listener UI ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed for dokter-script.js");
    initializeTheme(); // Inisialisasi tema dulu
    if (themeToggleButton) { // Tambahkan listener setelah elemen pasti ada
        themeToggleButton.addEventListener('click', toggleTheme);
    } else {
        console.warn("Tombol tema tidak ditemukan.");
    }


    const firebaseConfig = await fetchFirebaseConfig();
    if (firebaseConfig && initializeFirebase(firebaseConfig)) {
        console.log("Firebase initialized successfully for doctor management.");
        await loadAndDisplayDoctorsTable(); // Muat tabel dokter saat halaman dimuat
        await loadHospitalsForDropdown(); // Muat RS untuk dropdown form
    } else {
        console.error("Firebase initialization failed. Doctor management features might not work.");
        showNoDataMessage(noDoctorMessage, true, "Gagal koneksi ke database. Fitur tidak tersedia.");
    }

    if (openAddDoctorFormBtn) {
        openAddDoctorFormBtn.addEventListener('click', () => {
            resetDoctorForm(); // Pastikan form bersih untuk tambah baru
            toggleDoctorForm(true);
        });
    }

    if (cancelDoctorEditBtn) {
        cancelDoctorEditBtn.addEventListener('click', () => {
            resetDoctorForm();
            toggleDoctorForm(false); // Sembunyikan form saat batal edit
        });
    }

    if (doctorCrudForm) {
        doctorCrudForm.addEventListener('submit', handleDoctorFormSubmit);
    }
});



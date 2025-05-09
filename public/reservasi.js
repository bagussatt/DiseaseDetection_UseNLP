// File: reservasi.js

// Variabel global untuk Firebase Database instance
let firebaseDb;

/**
 * Mengambil konfigurasi Firebase dari backend.
 * @returns {Promise<object|null>} Objek konfigurasi Firebase atau null jika gagal.
 */
async function fetchFirebaseConfig() {
    try {
        const response = await fetch('/api/firebase-config');
        if (!response.ok) {
            throw new Error(`Gagal mengambil konfigurasi: ${response.status} ${response.statusText}`);
        }
        const config = await response.json();
        console.log("Konfigurasi Firebase berhasil diambil dari API.");
        return config;
    } catch (error) {
        console.error("Error fetchFirebaseConfig:", error);
        // Tampilkan pesan error ke pengguna jika diperlukan, misalnya menggunakan SweetAlert
        Swal.fire({
            icon: 'error',
            title: 'Kesalahan Konfigurasi',
            text: 'Tidak dapat memuat konfigurasi penting untuk aplikasi. Beberapa fitur mungkin tidak berfungsi.',
            confirmButtonColor: '#d33'
        });
        return null;
    }
}

/**
 * Menginisialisasi Firebase menggunakan konfigurasi yang diambil.
 * @param {object} config - Objek konfigurasi Firebase.
 * @returns {boolean} True jika inisialisasi berhasil, false jika tidak.
 */
function initializeFirebase(config) {
    if (!config) {
        console.error("Inisialisasi Firebase dibatalkan: Konfigurasi tidak tersedia.");
        return false;
    }
    try {
        // Pastikan Firebase SDK sudah dimuat
        if (typeof firebase === 'undefined' || typeof firebase.initializeApp === 'undefined') {
            throw new Error("Firebase SDK belum dimuat dengan benar.");
        }

        // Inisialisasi Firebase App hanya jika belum ada instance
        if (!firebase.apps.length) {
            firebase.initializeApp(config);
            console.log("Firebase App berhasil diinisialisasi.");
        } else {
            firebase.app(); // Gunakan instance yang sudah ada
            console.log("Menggunakan instance Firebase App yang sudah ada.");
        }
        
        // Dapatkan instance Realtime Database
        firebaseDb = firebase.database();
        console.log("Firebase Realtime Database instance berhasil didapatkan.");
        return true;
    } catch (error) {
        console.error("Error initializeFirebase:", error);
        Swal.fire({
            icon: 'error',
            title: 'Kesalahan Inisialisasi',
            text: `Gagal menginisialisasi layanan Firebase: ${error.message}`,
            confirmButtonColor: '#d33'
        });
        return false;
    }
}

/**
 * Memuat opsi rumah sakit dari Firebase Realtime Database.
 */
async function loadRumahSakitOptions() {
    const rumahSakitSelect = document.getElementById('rumah_sakit');
    if (!rumahSakitSelect) {
        console.error("Elemen <select id='rumah_sakit'> tidak ditemukan.");
        return;
    }

    if (!firebaseDb) {
        console.error("Firebase Database tidak terinisialisasi. Tidak dapat memuat daftar RS.");
        rumahSakitSelect.innerHTML = '<option value="" selected disabled>Gagal memuat daftar RS (DB Error)</option>';
        return;
    }

    // Tampilkan status loading di dropdown
    rumahSakitSelect.innerHTML = '<option value="" selected disabled>-- Memuat daftar rumah sakit... --</option>';
    rumahSakitSelect.disabled = true;

    const rumahSakitRef = firebaseDb.ref('daftar_rumah_sakit'); // Sesuaikan dengan path node Anda

    try {
        const snapshot = await rumahSakitRef.once('value');
        if (snapshot.exists()) {
            rumahSakitSelect.innerHTML = '<option value="" selected disabled>-- Pilih Rumah Sakit --</option>'; // Reset opsi default
            snapshot.forEach((childSnapshot) => {
                const rsData = childSnapshot.val();
                if (rsData && rsData.nama) { // Pastikan ada data nama
                    const option = document.createElement('option');
                    option.value = rsData.nama; // Value yang akan dikirim
                    option.textContent = rsData.singkatan || rsData.nama; // Teks yang ditampilkan
                    rumahSakitSelect.appendChild(option);
                }
            });
            console.log("Daftar rumah sakit berhasil dimuat dari Firebase.");
        } else {
            console.log("Tidak ada data rumah sakit di Firebase path:", rumahSakitRef.toString());
            rumahSakitSelect.innerHTML = '<option value="" selected disabled>-- Tidak ada RS tersedia --</option>';
        }
    } catch (error) {
        console.error("Gagal mengambil data rumah sakit dari Firebase:", error);
        rumahSakitSelect.innerHTML = '<option value="" selected disabled>Gagal memuat daftar RS (Network Error)</option>';
        // Tampilkan error menggunakan SweetAlert jika perlu
        Swal.fire({
            icon: 'warning',
            title: 'Gagal Memuat Data',
            text: 'Tidak dapat memuat daftar rumah sakit saat ini. Silakan coba lagi nanti.',
            confirmButtonColor: '#f39c12'
        });
    } finally {
        rumahSakitSelect.disabled = false; // Aktifkan kembali dropdown
    }
}


document.addEventListener('DOMContentLoaded', async () => { // Jadikan async untuk await
    console.log("reservasi.js: DOM fully loaded.");

    // --- Inisialisasi Firebase dan Muat Opsi Rumah Sakit ---
    const firebaseConfig = await fetchFirebaseConfig();
    if (firebaseConfig) {
        if (initializeFirebase(firebaseConfig)) {
            await loadRumahSakitOptions(); // Muat opsi RS setelah Firebase siap
        } else {
            // Handle kasus jika inisialisasi Firebase gagal setelah config didapat
            const rumahSakitSelect = document.getElementById('rumah_sakit');
            if (rumahSakitSelect) {
                rumahSakitSelect.innerHTML = '<option value="" selected disabled>Error Inisialisasi Layanan</option>';
            }
        }
    } else {
        // Handle kasus jika config tidak bisa diambil
        const rumahSakitSelect = document.getElementById('rumah_sakit');
        if (rumahSakitSelect) {
            rumahSakitSelect.innerHTML = '<option value="" selected disabled>Error Konfigurasi Layanan</option>';
        }
    }


    // --- 1. Ambil dan Tampilkan Data Diagnosis dari URL ---
    const gejalaContentDiv = document.getElementById('gejala-content');
    const hiddenDiagnosisInput = document.getElementById('gejala-data'); // Target input hidden

    if (!gejalaContentDiv || !hiddenDiagnosisInput) {
        console.error("Elemen #gejala-content atau #gejala-data tidak ditemukan!");
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const encodedDiagnosis = urlParams.get('diagnosis');

        if (encodedDiagnosis) {
            try {
                const diagnosisResult = decodeURIComponent(encodedDiagnosis);
                console.log("Diagnosis diterima (decoded):", diagnosisResult);

                const preElement = document.createElement('pre');
                preElement.classList.add('whitespace-pre-wrap');
                preElement.textContent = diagnosisResult;
                gejalaContentDiv.innerHTML = ''; // Hapus placeholder
                gejalaContentDiv.appendChild(preElement);
                hiddenDiagnosisInput.value = diagnosisResult;
                console.log("Hidden input #gejala-data value set.");

            } catch (e) {
                console.error("Gagal decode data diagnosis:", e);
                gejalaContentDiv.innerHTML = '<p class="text-red-500 italic text-sm">Gagal memuat data ringkasan gejala dari URL.</p>';
                hiddenDiagnosisInput.value = "Error: Gagal decode data";
            }
        } else {
            console.log("Tidak ada data 'diagnosis' di parameter URL.");
            gejalaContentDiv.innerHTML = '<p class="text-yellow-600 italic text-sm">Tidak ada ringkasan gejala yang diterima dari halaman sebelumnya. Silakan lakukan analisis gejala terlebih dahulu.</p>';
            hiddenDiagnosisInput.value = "Tidak ada data diagnosis dari URL";
        }
    }

    // --- 2. Atur Tanggal Minimal pada Input Date ---
    const tanggalInput = document.getElementById('tanggal');
    if (tanggalInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;
        tanggalInput.setAttribute('min', todayString);
        console.log("Min date for #tanggal set to:", todayString);
    } else {
        console.warn("Elemen #tanggal tidak ditemukan.");
    }

    // --- 3. Penanganan Form Submit dengan Fetch ke Backend ---
    const formElement = document.getElementById('reservation-form');
    const submitButton = document.getElementById('submitButton'); // Menggunakan ID yang sudah ada di HTML

    if (formElement && submitButton) {
        formElement.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log("Form submitted. Mengirim ke backend /api/reservasi...");

            const currentForm = event.target;
            const confirmationDiv = document.getElementById('confirmation-message');
            const confirmationTextSpan = document.getElementById('confirmation-text');


            if (!confirmationDiv || !confirmationTextSpan) {
                console.error("Elemen #confirmation-message atau #confirmation-text tidak ditemukan saat submit!");
                Swal.fire('Error UI', 'Komponen pesan konfirmasi tidak ditemukan.', 'error');
                return;
            }

            confirmationDiv.style.display = 'none';
            // Reset kelas SweetAlert jika ada, atau style lain
            confirmationDiv.className = 'mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg shadow-md flex items-center fade-in';


            submitButton.disabled = true; // Menggunakan disabled property
            submitButton.innerHTML = `
                <i class="fas fa-spinner fa-spin mr-2"></i>
                Mengirim...
            `;

            const formData = new FormData(currentForm);
            const dataToSend = Object.fromEntries(formData.entries());
            dataToSend.diagnosis = hiddenDiagnosisInput ? hiddenDiagnosisInput.value : "Error: Input gejala tidak ditemukan";
            // Tambahkan status dan timestamp jika backend Anda tidak menanganinya
            // dataToSend.status = 'registrasi'; 
            // dataToSend.timestamp = new Date().toISOString(); // Atau format lain yang diterima backend

            console.log("Data yang akan dikirim ke /api/reservasi:", dataToSend);

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
                    console.log('Sukses dari backend:', result);
                    const nama = escapeHtml(dataToSend.nama);
                    const telegram_id = escapeHtml(dataToSend.telegram_id); // Jika ingin menampilkan telegram_id

                    // Menggunakan SweetAlert untuk notifikasi sukses
                    Swal.fire({
                        icon: 'success',
                        title: 'Permintaan Terkirim!',
                        html: `Terima kasih, <strong>${nama}</strong>. Permintaan reservasi Anda telah berhasil dikirim. Tim kami akan segera menghubungi Anda Melalui Telegram Anda.`,
                        confirmButtonText: 'Lanjutkan',
                        confirmButtonColor: '#3498db'
                    }).then(() => {
                         currentForm.reset();
                         // Reset dropdown rumah sakit ke pilihan default setelah reset form
                        if (rumahSakitSelect) {
                            rumahSakitSelect.selectedIndex = 0;
                        }
                         // Kosongkan juga area gejala jika perlu
                         if(gejalaContentDiv) gejalaContentDiv.innerHTML = '<p class="text-gray-500 italic">Silakan lakukan analisis gejala kembali untuk reservasi baru.</p>';
                         if(hiddenDiagnosisInput) hiddenDiagnosisInput.value = "";
                         localStorage.removeItem('hasilAnalisisGejala'); // Hapus dari localStorage
                    });
                    
                    // Jika masih ingin menggunakan div HTML untuk konfirmasi (opsional)
                    // confirmationTextSpan.innerHTML = `<strong>Permintaan Reservasi Berhasil Dikirim!</strong><br><small>Terima kasih, ${nama}. Tim kami akan segera menghubungi Anda. ID Reservasi: ${result.id || 'N/A'}</small>`;
                    // confirmationDiv.classList.remove('bg-red-100', 'border-red-400', 'text-red-700');
                    // confirmationDiv.classList.add('bg-green-100', 'border-green-400', 'text-green-700');
                    // confirmationDiv.style.display = 'flex';


                } else {
                    console.error('Gagal dari backend:', result);
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal Mengirim Reservasi',
                        text: result.message || 'Terjadi kesalahan di server. Silakan coba lagi.',
                        confirmButtonColor: '#d33'
                    });
                }

            } catch (error) {
                console.error('Error Fetch ke /api/reservasi:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Mengirim Reservasi',
                    text: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.',
                    confirmButtonColor: '#d33'
                });
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> Kirim Permintaan';
                // confirmationDiv.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Jika menggunakan div HTML
            }
        });
    } else {
        console.error("Elemen #reservation-form atau tombol submit tidak ditemukan saat inisialisasi.");
    }

    function escapeHtml(unsafe) {
        if (unsafe === null || typeof unsafe === 'undefined') return "";
        return unsafe
             .toString() // Pastikan itu string
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // --- Toggle Menu Mobile (jika belum ada atau ingin disesuaikan) ---
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    } else {
        console.warn("Elemen untuk toggle menu mobile tidak ditemukan.");
    }
});

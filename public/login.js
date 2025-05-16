document.addEventListener('DOMContentLoaded', () => {
    // --- Referensi Elemen DOM ---
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessageDiv = document.getElementById('errorMessage');
    const togglePasswordButton = document.getElementById('togglePassword');
    const toggleIcon = document.getElementById('toggleIcon');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const guestLoginButton = document.getElementById('guestLoginButton');
    const loginButton = document.getElementById('loginButton'); // Referensi tombol login
    const loginButtonText = document.getElementById('loginButtonText'); // Referensi teks tombol login

    // Variabel untuk Firebase Auth (diinisialisasi setelah config didapat)
    let firebaseAuth = null;

    // --- Fungsi Error Message ---
    function showErrorMessage(message) {
        if (errorMessageDiv) {
            errorMessageDiv.textContent = message;
            errorMessageDiv.classList.remove('opacity-0');
        } else {
            console.error("Pesan error tidak bisa ditampilkan, elemen #errorMessage tidak ditemukan.");
        }
    }
    function hideErrorMessage() {
        if (errorMessageDiv) {
            errorMessageDiv.textContent = '';
            errorMessageDiv.classList.add('opacity-0');
        }
    }

    // --- Fungsi Loading State Tombol ---
    function setLoginButtonLoading(isLoading) {
        if (!loginButton || !loginButtonText) {
             console.warn("Tombol login atau teksnya tidak ditemukan untuk set loading state.");
             return;
        }
        if (isLoading) {
            loginButton.disabled = true;
            loginButtonText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Memproses...';
        } else {
            loginButton.disabled = false;
            loginButtonText.innerHTML = '<i class="fas fa-sign-in-alt mr-2 mt-0.5"></i> Login Admin';
        }
    }

    /**
     * Mengambil konfigurasi Firebase dari backend.
     * @returns {Promise<object|null>} Promise yang resolve dengan objek config atau null jika gagal.
     */
    async function fetchFirebaseConfig() {
        try {
            console.log("Mengambil konfigurasi Firebase dari backend...");
            // Pastikan endpoint ini benar dan server backend berjalan
            const response = await fetch('/api/firebase-config');
            if (!response.ok) {
                let errorMsg = `Gagal mengambil config: Status ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (e) { /* Abaikan jika body bukan JSON */ }
                throw new Error(errorMsg);
            }
            const config = await response.json();
            // Validasi dasar config yang diterima
            if (!config || !config.apiKey || !config.authDomain || !config.projectId) {
                throw new Error("Konfigurasi Firebase yang diterima dari API tidak lengkap/valid.");
            }
            console.log("Konfigurasi Firebase berhasil diambil.");
            return config;
        } catch (error) {
            console.error("Error mengambil konfigurasi Firebase:", error);
            showErrorMessage(`Gagal memuat konfigurasi layanan: ${error.message}. Coba muat ulang halaman.`);
            setLoginButtonLoading(false);
            if(loginButton) loginButton.disabled = true; // Nonaktifkan tombol jika config gagal
            return null;
        }
    }

    /**
     * Menginisialisasi Firebase setelah mendapatkan konfigurasi.
     * @param {object} firebaseConfig - Objek konfigurasi Firebase.
     */
    function initializeFirebase(firebaseConfig) {
        if (!firebaseConfig) {
             console.error("Inisialisasi dibatalkan: Konfigurasi Firebase tidak valid.");
             return;
        }
        try {
            // Periksa apakah variabel 'firebase' dari SDK compat sudah dimuat
            if (typeof firebase === 'undefined' || !firebase.initializeApp || !firebase.auth) {
                 throw new Error("Firebase SDK (compat) belum dimuat dengan benar di HTML.");
            }
            // Inisialisasi Firebase App dan Auth menggunakan SDK compat
            const firebaseApp = firebase.initializeApp(firebaseConfig);
            firebaseAuth = firebase.auth(); // Instance Auth sekarang disimpan di variabel global
            console.log("Firebase Client SDK (compat) berhasil diinisialisasi dengan config dari API.");
            // Aktifkan form dan listener lainnya setelah inisialisasi berhasil
            enableLoginForm();
            enableForgotPasswordLink();
        } catch (error) {
            console.error("Gagal menginisialisasi Firebase dengan config dari API:", error);
            showErrorMessage(`Gagal menginisialisasi layanan otentikasi: ${error.message}`);
            if(loginButton) loginButton.disabled = true; // Nonaktifkan tombol login
        }
    }

    /**
     * Mengaktifkan event listener pada form login setelah Firebase siap.
     */
    function enableLoginForm() {
        if (!loginForm) { console.error("Elemen form login (#loginForm) tidak ditemukan."); return; }
        if (!firebaseAuth) { console.error("Firebase Auth belum siap saat mencoba mengaktifkan form login."); return; }

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Mencegah halaman refresh saat form disubmit
            hideErrorMessage(); // Sembunyikan pesan error lama
            setLoginButtonLoading(true); // Tampilkan status loading di tombol

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // Validasi input dasar
            if (!email || !password) {
                showErrorMessage("Email dan password wajib diisi.");
                setLoginButtonLoading(false); // Matikan loading
                return;
            }

            console.log(`Mencoba login (Client SDK) dengan email: ${email}`);
            // Proses login menggunakan Firebase Auth Client SDK
            firebaseAuth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log("Autentikasi Firebase berhasil untuk:", userCredential.user.email);
                    // Ambil ID Token Result untuk memeriksa Custom Claims
                    // Argumen 'true' memaksa refresh token untuk mendapatkan klaim terbaru
                    return userCredential.user.getIdTokenResult(true);
                })
                .then((idTokenResult) => {
                    console.log("ID Token Result (claims):", idTokenResult.claims);
                    // Periksa apakah klaim 'admin' ada dan bernilai true
                    if (idTokenResult.claims.admin === true) {
                        console.log("Login Admin berhasil (Custom Claim). Mengarahkan ke homepage admin...");
                        // Jangan matikan loading state karena akan redirect
                        window.location.href = 'homepage_admin.html'; // Redirect Admin
                    } else {
                        // Jika tidak ada klaim admin, tolak akses
                        console.warn("Login berhasil tapi tidak memiliki klaim admin.");
                        showErrorMessage("Akses ditolak. Akun ini bukan admin.");
                        firebaseAuth.signOut(); // Logout pengguna non-admin
                        setLoginButtonLoading(false); // Matikan loading state
                    }
                })
                .catch((error) => {
                    // Tangani error saat login atau saat getIdTokenResult
                    console.error("Error login Firebase (Client SDK):", error.code, error.message);
                    let msg = "Login gagal.";
                    // Berikan pesan error yang lebih spesifik
                    switch (error.code) {
                        case'auth/invalid-login-credentials':msg = "Akun Anda Tidak ditemukan"; break;
                        case 'auth/invalid-email': msg = "Format email tidak valid."; break;
                        case 'auth/user-disabled': msg = "Akun ini dinonaktifkan."; break;
                        case 'auth/user-not-found': msg = "Email tidak terdaftar."; break;
                        case 'auth/wrong-password': msg = "Password salah."; break;
                        case 'auth/invalid-credential': msg = "Email atau password salah."; break; // Error umum Firebase v9+
                        case 'auth/network-request-failed': msg = "Kesalahan jaringan. Periksa koneksi Anda."; break;
                        case 'auth/too-many-requests': msg = "Terlalu banyak percobaan login. Coba lagi nanti."; break;
                        default: msg = `Terjadi kesalahan: ${error.message}`; // Tampilkan pesan error asli jika tidak dikenal
                    }
                    showErrorMessage(msg);
                    setLoginButtonLoading(false); // Matikan loading state jika error
                });
        });
        console.log("Event listener untuk form login telah diaktifkan.");
    }

     /**
     * Mengaktifkan event listener pada link lupa password.
     */
    function enableForgotPasswordLink() {
        if (!forgotPasswordLink) { console.warn("Link lupa password (#forgotPasswordLink) tidak ditemukan."); return; }
        if (!firebaseAuth) { console.error("Firebase Auth belum siap saat mencoba mengaktifkan link lupa password."); return; }

         forgotPasswordLink.addEventListener('click', (e) => {
             e.preventDefault();
             const email = emailInput.value.trim();
             if (!email) {
                 showErrorMessage("Masukkan email Anda pada kolom email untuk reset password.");
                 emailInput.focus();
                 return;
             }

             // Tidak perlu cek admin di frontend untuk lupa password
             hideErrorMessage();
             console.log(`Meminta reset password untuk: ${email}`);
             // Gunakan SweetAlert untuk konfirmasi sebelum mengirim
             Swal.fire({
                title: 'Reset Password?',
                text: `Kirim email reset password ke ${email}?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Ya, Kirim Email',
                cancelButtonText: 'Batal',
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33'
             }).then((result) => {
                 if (result.isConfirmed) {
                     // Kirim email reset jika dikonfirmasi
                     firebaseAuth.sendPasswordResetEmail(email)
                         .then(() => {
                             Swal.fire({ title: 'Email Terkirim', text: `Link reset password telah dikirim ke ${email}. Periksa inbox/spam.`, icon: 'success', confirmButtonColor: '#3b82f6' });
                         })
                         .catch((error) => {
                             console.error("Error kirim email reset:", error.code, error.message);
                             let msg = "Gagal mengirim email reset.";
                             switch (error.code) {
                                 case 'auth/invalid-email': msg = "Format email tidak valid."; break;
                                 case 'auth/user-not-found': msg = "Email tidak terdaftar."; break;
                                 case 'auth/network-request-failed': msg = "Kesalahan jaringan."; break;
                                 default: msg = `Error: ${error.message}`;
                             }
                             showErrorMessage(msg); // Tampilkan error di div biasa
                         });
                 }
             });
         });
         console.log("Event listener untuk lupa password telah diaktifkan.");
    }


    // --- Event Listener Toggle Password ---
    if (togglePasswordButton && passwordInput && toggleIcon) {
        togglePasswordButton.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            toggleIcon.classList.toggle('fa-eye');
            toggleIcon.classList.toggle('fa-eye-slash');
        });
    } else {
        console.warn("Elemen toggle password tidak ditemukan sepenuhnya.");
    }

    // --- Event Listener Tombol Pengunjung ---
    if (guestLoginButton) {
        guestLoginButton.addEventListener('click', () => {
            console.log("Masuk sebagai pengunjung...");
            window.location.href = 'index.html'; // Arahkan ke halaman utama
        });
    } else {
        console.warn("Tombol masuk sebagai pengunjung (#guestLoginButton) tidak ditemukan.");
    }

     // --- Fungsi Logout (Dibuat Global) ---
     // Fungsi ini mungkin lebih cocok diletakkan di file JS global atau di halaman setelah login
     window.logoutUser = function() {
         console.log("Fungsi logoutUser dipanggil.");
         if (firebaseAuth && firebaseAuth.currentUser) { // Pastikan auth siap dan ada user yg login
             firebaseAuth.signOut().then(() => {
                 console.log("Logout Firebase berhasil.");
                 Swal.fire({ title: 'Logout Berhasil', text: 'Anda telah keluar.', icon: 'success', timer: 1500, showConfirmButton: false })
                     .then(() => window.location.href = 'login.html'); // Redirect setelah notif
             }).catch((error) => {
                 console.error("Error saat logout Firebase:", error);
                 Swal.fire('Error Logout', 'Gagal melakukan logout, coba lagi.', 'error');
             });
         } else {
              console.warn("Mencoba logout saat Firebase Auth tidak siap atau tidak ada pengguna login. Mengarahkan langsung.");
              window.location.href = 'login.html'; // Fallback redirect
         }
     }


    // --- Inisialisasi Utama ---
    // 1. Ambil konfigurasi Firebase dari backend
    // 2. Jika berhasil, inisialisasi Firebase Client SDK
    // 3. Jika inisialisasi berhasil, aktifkan form login dan link lupa password
    fetchFirebaseConfig().then(config => {
        if (config) {
            initializeFirebase(config);
        } else {
            // Config gagal diambil, pesan error sudah ditampilkan.
            // Form login tidak akan diaktifkan.
            console.error("Inisialisasi Firebase tidak dapat dilanjutkan karena gagal mengambil konfigurasi.");
        }
    });
    // -------------------------

}); // Akhir DOMContentLoaded

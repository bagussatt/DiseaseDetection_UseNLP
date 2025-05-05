// File: reservasi.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("reservasi.js: DOM fully loaded.");

    // --- 1. Ambil dan Tampilkan Data Diagnosis dari URL ---
    const gejalaContentDiv = document.getElementById('gejala-content');
    const hiddenDiagnosisInput = document.getElementById('gejala-data'); // Target input hidden

    if (!gejalaContentDiv || !hiddenDiagnosisInput) {
        console.error("Elemen #gejala-content atau #gejala-data tidak ditemukan!");
        // Sebaiknya hentikan eksekusi jika elemen penting ini tidak ada
        // Anda bisa menambahkan return di sini jika perlu: return;
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const encodedDiagnosis = urlParams.get('diagnosis'); // Ambil parameter 'diagnosis'

        if (encodedDiagnosis) {
            try {
                const diagnosisResult = decodeURIComponent(encodedDiagnosis); // Decode datanya
                console.log("Diagnosis diterima (decoded):", diagnosisResult);

                // Tampilkan di area ringkasan gejala menggunakan <pre>
                const preElement = document.createElement('pre');
                preElement.classList.add('whitespace-pre-wrap');
                preElement.textContent = diagnosisResult;
                gejalaContentDiv.innerHTML = ''; // Hapus placeholder
                gejalaContentDiv.appendChild(preElement);

                // Isi nilai input hidden
                hiddenDiagnosisInput.value = diagnosisResult;
                console.log("Hidden input #gejala-data value set.");

            } catch (e) {
                console.error("Gagal decode data diagnosis:", e);
                gejalaContentDiv.innerHTML = '<p class="text-danger fst-italic small">Gagal memuat data ringkasan gejala dari URL.</p>';
                hiddenDiagnosisInput.value = "Error: Gagal decode data";
            }
        } else {
            console.log("Tidak ada data 'diagnosis' di parameter URL.");
            gejalaContentDiv.innerHTML = '<p class="text-warning-emphasis alert alert-warning-custom fst-italic small">Tidak ada ringkasan gejala yang diterima dari halaman sebelumnya.</p>';
            hiddenDiagnosisInput.value = "Tidak ada data";
        }
    } // Akhir dari blok if (!gejalaContentDiv || !hiddenDiagnosisInput)

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
    const formElement = document.getElementById('reservation-form'); // Variabel untuk elemen form
    const submitButton = formElement ? formElement.querySelector('button[type="submit"]') : null; // Ambil tombol dari formElement

    // Pastikan form dan tombol submit ditemukan sebelum menambahkan listener
    if (formElement && submitButton) {
        formElement.addEventListener('submit', async function(event) { // 'event' adalah kunci
            event.preventDefault(); // Mencegah pengiriman form standar
            console.log("Form submitted (preventDefault). Mengirim ke backend...");

            // Dapatkan referensi form DARI EVENT OBJECT
            const currentForm = event.target; // <- Gunakan event.target sebagai referensi form

            // Ambil confirmationDiv DI DALAM listener, sebelum try...catch
            const confirmationDiv = document.getElementById('confirmation-message');
            if (!confirmationDiv) {
                console.error("Elemen #confirmation-message tidak ditemukan saat submit!");
                // Aktifkan lagi tombolnya jika div konfirmasi tidak ada
                submitButton.removeAttribute('disabled');
                submitButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Kirim Permintaan';
                return; // Hentikan eksekusi listener
            }

            // Sembunyikan pesan sebelumnya dan reset class
            confirmationDiv.style.display = 'none';
            confirmationDiv.className = 'mt-4 alert d-flex align-items-center fade-in card-custom';

            // Ubah teks tombol menjadi loading
            submitButton.setAttribute('disabled', 'true');
            submitButton.innerHTML = `
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Mengirim...
            `;

            // Ambil data dari form menggunakan event.target
            const formData = new FormData(currentForm); // <- Gunakan currentForm
            const dataToSend = Object.fromEntries(formData.entries());

            // Pastikan diagnosis ada di dataToSend (ambil dari hidden input yang sudah diisi di awal)
            dataToSend.diagnosis = hiddenDiagnosisInput ? hiddenDiagnosisInput.value : "Error: Input gejala tidak ditemukan";
            console.log("Data yang akan dikirim:", dataToSend);

            try {
                const response = await fetch('/api/reservasi', { // Targetkan route backend
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // Kirim sebagai JSON
                    },
                    body: JSON.stringify(dataToSend) // Ubah objek JS menjadi string JSON
                });

                const result = await response.json(); // Baca response JSON dari server

                if (response.ok && result.success) {
                    // SUKSES
                    console.log('Sukses:', result);
                    const nama = escapeHtml(dataToSend.nama);
                    const telegram_id = escapeHtml(dataToSend.telegram_id);
                    confirmationDiv.innerHTML = `
                        <i class="fas fa-check-circle fa-lg text-success me-3"></i>
                        <div>
                            <strong>Permintaan Reservasi Berhasil Dikirim!</strong><br>
                            <small>Terima kasih, ${nama}. Tim kami akan segera menghubungi Anda melalui telegram ${telegram_id} untuk Pemberitahuan Selengkapnya.</small>
                        </div>
                    `;
                    confirmationDiv.className = 'mt-4 alert alert-success d-flex align-items-center fade-in card-custom'; // Set class sukses
                    submitButton.innerHTML = '<i class="fas fa-check me-2"></i> Terkirim';
                    currentForm.reset(); // <- Reset form menggunakan currentForm
                } else {
                    // GAGAL DARI SERVER
                    console.error('Gagal:', result);
                    confirmationDiv.innerHTML = `
                        <i class="fas fa-exclamation-triangle fa-lg text-danger me-3"></i>
                        <div>
                            <strong>Gagal Mengirim Reservasi!</strong><br>
                            <small>${escapeHtml(result.message || 'Terjadi kesalahan di server.')}</small>
                        </div>
                     `;
                    confirmationDiv.className = 'mt-4 alert alert-danger d-flex align-items-center fade-in card-custom'; // Set class gagal
                    // Kembalikan tombol ke state semula agar bisa coba lagi
                    submitButton.removeAttribute('disabled');
                    submitButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Kirim Permintaan';
                }

            } catch (error) {
                // GAGAL KONEKSI/FETCH
                console.error('Error Fetch:', error);
                confirmationDiv.innerHTML = `
                     <i class="fas fa-times-circle fa-lg text-danger me-3"></i>
                     <div>
                         <strong>Gagal Mengirim Reservasi!</strong><br>
                         <small>Tidak dapat terhubung ke server. Periksa koneksi internet Anda.</small>
                     </div>
                `;
                confirmationDiv.className = 'mt-4 alert alert-danger d-flex align-items-center fade-in card-custom'; // Set class gagal
                 // Kembalikan tombol ke state semula agar bisa coba lagi
                submitButton.removeAttribute('disabled');
                submitButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Kirim Permintaan';
            } finally {
                 // Tampilkan pesan konfirmasi (sukses atau gagal)
                confirmationDiv.style.display = 'flex';
                confirmationDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }); // Akhir dari formElement.addEventListener
    } else {
         // Pesan error jika form atau tombol submit tidak ditemukan saat halaman dimuat
         console.error("Elemen #reservation-form atau tombol submit tidak ditemukan saat inisialisasi.");
    } // Akhir dari if (formElement && submitButton)

    // Helper function untuk escaping HTML sederhana (didefinisikan sekali di dalam DOMContentLoaded)
    function escapeHtml(unsafe) {
        if (!unsafe) return "";
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }

}); // <<<< PASTIKAN HANYA ADA SATU PENUTUP UNTUK DOMContentLoaded DI SINI
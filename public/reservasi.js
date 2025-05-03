// File: reservasi.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("reservasi.js: DOM fully loaded.");

    // --- 1. Ambil dan Tampilkan Data Diagnosis dari URL ---
    const gejalaContentDiv = document.getElementById('gejala-content');
    const hiddenDiagnosisInput = document.getElementById('gejala-data'); // Target input hidden

    if (!gejalaContentDiv || !hiddenDiagnosisInput) {
        console.error("Elemen #gejala-content atau #gejala-data tidak ditemukan!");
        return; // Hentikan jika elemen penting hilang
    }

    const urlParams = new URLSearchParams(window.location.search);
    const encodedDiagnosis = urlParams.get('diagnosis'); // Ambil parameter 'diagnosis'

    if (encodedDiagnosis) {
        try {
            const diagnosisResult = decodeURIComponent(encodedDiagnosis); // Decode datanya
            console.log("Diagnosis diterima (decoded):", diagnosisResult);

            // Tampilkan di area ringkasan gejala menggunakan <pre>
            const preElement = document.createElement('pre');
            preElement.classList.add('whitespace-pre-wrap'); // Class dari CSS Anda
            preElement.textContent = diagnosisResult; // Tampilkan teks asli hasil decode
            gejalaContentDiv.innerHTML = ''; // Hapus pesan placeholder "Memeriksa data gejala..."
            gejalaContentDiv.appendChild(preElement); // Tambahkan elemen <pre>

            // Isi nilai input hidden untuk dikirim bersama form
            hiddenDiagnosisInput.value = diagnosisResult; // Isi value dengan hasil decode
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

    // --- 3. Contoh Penanganan Form Submit ---
    const form = document.getElementById('reservation-form');
    const confirmationDiv = document.getElementById('confirmation-message');

    if (form && confirmationDiv) {
        form.addEventListener('submit', function(event) {
            event.preventDefault(); // Mencegah pengiriman form standar
            console.log("Form submitted (preventDefault).");

            // Simulasi Pengiriman Sukses (Ganti dengan fetch ke backend Anda)
            const nama = document.getElementById('nama').value;
            const telepon = document.getElementById('telepon').value;

            confirmationDiv.innerHTML = `
                <div class="spinner-border spinner-border-sm text-success me-2" role="status">
                     <span class="visually-hidden">Loading...</span>
                </div>
                <strong>Permintaan Reservasi Terkirim!</strong> Terima kasih, ${escapeHtml(nama)}. Tim kami akan segera menghubungi Anda melalui nomor ${escapeHtml(telepon)} untuk konfirmasi.
            `;
            confirmationDiv.className = 'mt-4 alert alert-success d-flex align-items-center fade-in card-custom';
            confirmationDiv.style.display = 'flex'; // Pastikan terlihat

            confirmationDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

            form.querySelector('button[type="submit"]').setAttribute('disabled', 'true');
            form.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-check me-2"></i> Terkirim';

            // Di aplikasi nyata: kirim data form ke server Anda di sini
            // const formData = new FormData(form);
            // fetch('/api/reservasi', { method: 'POST', body: formData })
            //   .then(response => response.json())
            //   .then(data => { console.log('Success:', data); /* Tampilkan pesan sukses */ })
            //   .catch((error) => { console.error('Error:', error); /* Tampilkan pesan error */ });

        });
    } else {
         console.error("Elemen #reservation-form atau #confirmation-message tidak ditemukan.");
    }

    // Helper function untuk escaping HTML sederhana
    function escapeHtml(unsafe) {
        if (!unsafe) return "";
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }

}); // Akhir DOMContentLoaded
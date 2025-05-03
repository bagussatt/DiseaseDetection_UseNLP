// File: reservasi.js
// Berisi logika JavaScript untuk halaman reservasi

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil data gejala dari URL
    const urlParams = new URLSearchParams(window.location.search);
    const gejalaParam = urlParams.get('gejala');
    const gejalaDisplayContent = document.getElementById('gejala-content');
    const gejalaHiddenInput = document.getElementById('gejala-data');
    let hasValidSymptoms = false;

    if (gejalaParam && gejalaParam.trim() !== '') {
        // Format gejala untuk ditampilkan (tanpa <pre>)
        let formattedGejalaHtml = '';
        const lines = gejalaParam.trim().split('\n');
        lines.forEach(line => {
            const parts = line.split(':');
            const safeLine = line.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
            if (parts.length >= 2) {
                const label = parts[0].trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const value = parts.slice(1).join(':').trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
                formattedGejalaHtml += `<p class="mb-1"><strong class="fw-medium text-primary">${label}:</strong> ${value}</p>`; // Gunakan kelas Bootstrap
            } else if (safeLine) {
                formattedGejalaHtml += `<p class="mb-1">${safeLine}</p>`;
            }
        });

        gejalaDisplayContent.innerHTML = formattedGejalaHtml;
        gejalaHiddenInput.value = gejalaParam;
        hasValidSymptoms = true;
        console.log("Symptom data received:", gejalaParam);
    } else {
        gejalaDisplayContent.innerHTML = '<p class="text-muted fst-italic">Tidak ada detail gejala yang disertakan.</p>';
        gejalaHiddenInput.value = "";
        hasValidSymptoms = false;
        console.log("No symptom data received.");
    }

    // 2. Set tanggal minimal untuk input tanggal (hari ini)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const dd = String(today.getDate()).padStart(2, '0');
    const minDate = `${yyyy}-${mm}-${dd}`;
    const tanggalInput = document.getElementById('tanggal');
    if (tanggalInput) {
        tanggalInput.setAttribute('min', minDate);
    }


    // 3. Handle form submission
    const form = document.getElementById('reservation-form');
    const confirmationDiv = document.getElementById('confirmation-message');
    const mainContentContainer = document.querySelector('.row.g-4'); // Container grid utama
    const submitButton = form.querySelector('button[type="submit"]'); // Ambil tombol submit
    
    if (form && confirmationDiv && mainContentContainer && submitButton) { // Pastikan tombol juga ada
        form.addEventListener('submit', async (event) => { // Jadikan fungsi ini async
            event.preventDefault(); // Mencegah pengiriman form standar
    
            // Nonaktifkan tombol submit untuk mencegah klik ganda
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mengirim...'; // Tampilkan loading
    
            const nama = document.getElementById('nama').value;
            const tanggal = document.getElementById('tanggal').value;
            const rumahSakit = document.getElementById('rumah_sakit').value;
            const gejalaData = gejalaHiddenInput.value; // Ambil dari hidden input
    
            // --- Persiapkan data dalam format URL-Encoded ---
            const formData = new URLSearchParams();
            formData.append('nama', nama);
            formData.append('tanggal', tanggal);
            formData.append('rumahSakit', rumahSakit || ''); // Kirim string kosong jika tidak dipilih
            formData.append('gejalaData', gejalaData || ''); // Kirim string kosong jika tidak ada
    
            try {
                // --- Kirim data ke Backend menggunakan Fetch API (Format URL-Encoded) ---
                console.log('Sending reservation data to /api/reservations...');
                const response = await fetch('/api/reservations', { // Panggil endpoint backend
                    method: 'POST',
                    headers: {
                        // Gunakan Content-Type yang sama dengan referensi Anda
                        'Content-Type': 'application/x-www-form-urlencoded',
                        // Tetap minta JSON sebagai balasan dari server
                        'Accept': 'application/json'
                    },
                    // Kirim data yang sudah diformat URL-Encoded
                    body: formData.toString()
                });
    
                // Cek apakah respons dari backend sukses (status code 2xx)
                if (response.ok) {
                    // --- Pemrosesan Sukses (respons dari backend OK) ---
                    const result = await response.json(); // Baca respons JSON dari backend
                    console.log('Backend success response:', result);
    
                    // --- Tampilkan Pesan Konfirmasi (Sama seperti sebelumnya) ---
                    let confirmationHTML = `
                        <div class="d-flex align-items-center">
                            <i class="fas fa-check-circle fs-2 me-3 text-success"></i>
                            <div>
                                <h4 class="alert-heading h5">Permintaan Reservasi Terkirim!</h4>
                                <p class="mb-1">Terima kasih, <strong>${nama}</strong>.</p>
                                <p class="mb-1">Permintaan reservasi Anda untuk tanggal <strong>${formatDate(tanggal)}</strong>`;
                    if(rumahSakit) {
                         confirmationHTML += ` di <strong>${rumahSakit}</strong>`;
                    }
                    confirmationHTML += ` telah kami teruskan.</p>`;
    
                    if (hasValidSymptoms && gejalaData) {
                        confirmationHTML += `
                            <details class="mt-2 mb-2 small">
                                <summary class="text-muted fst-italic" style="cursor:pointer;">Lihat Ringkasan Gejala Terlampir</summary>
                                <blockquote class="blockquote-custom small mt-2">
                                    <pre class="whitespace-pre-wrap">${gejalaData.replace(/\\n|\n/g, '\n')}</pre>
                                </blockquote>
                            </details>
                        `;
                    } else {
                         confirmationHTML += `
                            <div class="alert alert-warning-custom p-2 mt-2 mb-1 d-inline-flex align-items-center small">
                                <i class="fas fa-exclamation-triangle me-2"></i> Reservasi diajukan tanpa detail gejala.
                            </div>
                         `;
                    }
                     confirmationHTML += `
                                <p class="mt-2 mb-0 small">Pihak rumah sakit atau admin akan segera menghubungi Anda untuk konfirmasi lebih lanjut melalui nomor telepon yang diberikan.</p>
                                <hr class="my-2">
                                <p class="mb-0 xsmall text-muted text-success fw-bold">Data berhasil disimpan di server.</p>
                            </div>
                        </div>
                    `;
    
                    confirmationDiv.innerHTML = confirmationHTML;
                    confirmationDiv.className = 'mt-4 alert alert-success d-flex align-items-center fade-in card-custom p-4';
                    confirmationDiv.style.display = 'flex';
                    if(mainContentContainer) { mainContentContainer.style.display = 'none'; }
                    confirmationDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
                } else {
                    // --- Pemrosesan Gagal (respons dari backend error) ---
                     // Coba baca pesan error sebagai teks dulu, karena mungkin bukan JSON
                     const errorText = await response.text();
                     console.error(`Server error: ${response.status} ${response.statusText}. Detail: ${errorText}`);
                     // Coba parse sebagai JSON jika mungkin
                     let errorMsg = `Gagal mengirim reservasi (${response.status})`;
                     try {
                         const errorJson = JSON.parse(errorText);
                         errorMsg = `Gagal mengirim reservasi: ${errorJson.error || response.statusText}`;
                     } catch (e) {
                        // Biarkan errorMsg default jika parsing gagal
                     }
                    alert(errorMsg);
                    // Aktifkan kembali tombol submit jika gagal
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Kirim Permintaan Reservasi';
                }
    
            } catch (error) {
                // --- Tangani error network atau error JavaScript lainnya ---
                console.error('Error submitting form via fetch:', error);
                alert(`Gagal mengirim reservasi: Tidak dapat terhubung ke server atau terjadi error. ${error.message}`);
                 // Aktifkan kembali tombol submit jika gagal
                 submitButton.disabled = false;
                 submitButton.innerHTML = 'Kirim Permintaan Reservasi';
            }
    
        }); // Akhir event listener submit
    } else {
        console.error("Form, confirmation message container, main content container, or submit button not found!");
    }
}); // Akhir DOMContentLoaded

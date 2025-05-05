/**
 * statistik.js
 *
 * Script untuk mengambil data statistik penyakit dari API (individual per penyakit),
 * memperbarui tampilan persentase di kartu, merender grafik Chart.js,
 * dan memungkinkan penggantian tipe grafik.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Variabel global
    let statistikChartInstance = null; // Menyimpan instance Chart.js
    let currentChartType = 'bar'; // Tipe grafik default saat halaman dimuat
    let cachedCombinedData = null; // Cache untuk data gabungan agar tidak fetch ulang saat ganti tipe grafik

    // Referensi elemen DOM
    const ctx = document.getElementById('statistikChart'); // Canvas untuk grafik
    const chartTypeButtons = document.querySelectorAll('.chart-type-btn'); // Tombol ganti tipe grafik
    const chartContainer = document.getElementById('chartContainer'); // Container canvas (opsional, untuk pesan error)

    // --- Validasi Awal ---
    // Periksa apakah elemen canvas ada sebelum melanjutkan
    if (!ctx) {
        console.error("Kesalahan Fatal: Elemen canvas dengan ID 'statistikChart' tidak ditemukan dalam HTML.");
        // Tampilkan pesan error di container jika ada
        if(chartContainer) {
            chartContainer.innerHTML = '<p class="text-center text-red-600 font-semibold p-4">Error: Komponen grafik tidak dapat dimuat (canvas tidak ditemukan).</p>';
        }
        return; // Hentikan eksekusi script jika canvas tidak ada
    }
     if (!chartContainer) {
        // Ini tidak fatal, tapi bisa mempengaruhi tampilan pesan error
        console.warn("Peringatan: Elemen container dengan ID 'chartContainer' tidak ditemukan. Pesan error grafik mungkin tidak tampil.");
    }
    if (chartTypeButtons.length === 0) {
        console.warn("Peringatan: Tombol ganti tipe grafik (kelas '.chart-type-btn') tidak ditemukan.");
    }
    // --------------------


    // --- Konfigurasi ---
    // Base URL API (Sesuaikan dengan alamat API Anda)
    // Jika API berjalan di port/domain berbeda, gunakan URL lengkap (e.g., 'http://localhost:3000/api/persentase-penyakit')
    // dan pastikan CORS di server API mengizinkan akses dari frontend.
    const API_BASE_URL = '/api/persentase-penyakit';

    // Pemetaan ID elemen span persentase di HTML ke nama penyakit (digunakan untuk URL API & kunci data)
    // Pastikan nama penyakit (value) cocok dengan path di API Anda (e.g., /api/.../jantung)
    // dan juga cocok dengan kunci dalam objek JSON yang akan dibuat untuk grafik.
    const percentageElementMapping = {
        'diarePercentage': 'diare', // Nama penyakit dalam huruf kecil untuk URL API
        'ginjalPercentage': 'Penyakit Ginjal Kronis',
        'hipertensiPercentage': 'Hipertensi (Tekanan Darah Tinggi)',
        'ispaPercentage': 'ISPA (Infeksi Saluran Pernapasan Akut)',
        'diabetesPercentage': 'Diabetes Melitus'
        // Tambahkan penyakit lain di sini jika ada di HTML dan API
    };

    // Warna dasar untuk grafik (pastikan jumlahnya cukup)
    // Urutan warna ini akan digunakan sesuai urutan penyakit dalam percentageElementMapping
    const baseColors = [
        '#dc2626', // Jantung (Red-600)
        '#9333ea', // Ginjal (Purple-600)
        '#b91c1c', // Hipertensi (Red-700)
        '#d97706', // ISPA (Amber-600)
        '#4f46e5', // Diabetes (Indigo-600)
        '#059669', // Emerald-600 (Contoh tambahan 1)
        '#db2777', // Pink-600 (Contoh tambahan 2)
        '#0ea5e9', // Sky-500 (Contoh tambahan 3)
    ];

    // Fungsi helper untuk membuat warna RGBA dari HEX/RGB
    const getTransparentColors = (alpha = 0.7) => baseColors.map(color => {
        let r = 0, g = 0, b = 0;
        if (color.startsWith('#')) {
            if (color.length == 7) { r = parseInt(color.substring(1, 3), 16); g = parseInt(color.substring(3, 5), 16); b = parseInt(color.substring(5, 7), 16); }
            else if (color.length == 4) { r = parseInt(color[1]+color[1], 16); g = parseInt(color[2]+color[2], 16); b = parseInt(color[3]+color[3], 16); }
        } else if (color.startsWith('rgb')) {
            // Simple rgb parsing (doesn't handle errors robustly)
            const parts = color.match(/\d+/g);
            if (parts && parts.length >= 3) { [r, g, b] = parts.map(Number); }
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    });
    // --------------------


    /**
     * Mengambil data persentase untuk satu penyakit dari API dan memperbarui span HTML.
     * @param {string} elementId - ID elemen span HTML (e.g., 'jantungPercentage').
     * @param {string} diseaseName - Nama penyakit (e.g., 'jantung').
     * @returns {Promise<object>} Promise yang resolve dengan objek { NamaPenyakitKapital: nilaiPersentase } atau { NamaPenyakitKapital: null } jika error.
     */
    const fetchAndUpdateIndividualPercentage = async (elementId, diseaseName) => {
        const apiUrl = `${API_BASE_URL}/${diseaseName}`;
        const element = document.getElementById(elementId);
        // Membuat nama penyakit dengan huruf kapital di awal (e.g., Jantung) untuk kunci objek
        const diseaseNameCapitalized = diseaseName.charAt(0).toUpperCase() + diseaseName.slice(1);

        // Periksa apakah elemen target ada di HTML
        if (!element) {
            console.warn(`Peringatan: Elemen HTML dengan ID '${elementId}' tidak ditemukan.`);
            // Kembalikan objek dengan nilai null untuk menandakan kegagalan pada penyakit ini
            return { [diseaseNameCapitalized]: null };
        }

        try {
            console.log(`Mengambil data untuk ${diseaseNameCapitalized} dari ${apiUrl}...`);
            const response = await fetch(apiUrl);

            // Periksa apakah response dari server OK (status code 2xx)
            if (!response.ok) {
                throw new Error(`Gagal mengambil data: Status ${response.status} (${response.statusText}) untuk ${diseaseName}`);
            }

            // Parse response sebagai JSON
            const data = await response.json();

            // Periksa apakah data ada dan memiliki properti 'persentase'
            // Sesuaikan 'persentase' jika nama properti di API Anda berbeda
            if (data && data.hasOwnProperty('persentase')) {
                let percentage = parseFloat(data.persentase);

                // Validasi apakah hasil parse adalah angka yang valid
                if (!isNaN(percentage)) {
                    element.textContent = `${percentage.toFixed(0)}%`; // Update teks (0 angka desimal)
                    console.log(`Sukses: Elemen ${elementId} diperbarui menjadi ${percentage.toFixed(0)}%`);
                    // Kembalikan objek dengan nama penyakit dan nilainya
                    return { [diseaseNameCapitalized]: percentage };
                } else {
                    // Data ada tapi nilainya tidak bisa di-parse sebagai angka
                    element.textContent = 'N/A';
                    console.warn(`Peringatan: Data persentase untuk ${diseaseNameCapitalized} dari API bukan angka yang valid:`, data.persentase);
                    return { [diseaseNameCapitalized]: null };
                }
            } else {
                // Format response API tidak sesuai
                element.textContent = 'N/A';
                console.warn(`Peringatan: Format data API untuk ${diseaseNameCapitalized} tidak sesuai (properti 'persentase' tidak ditemukan):`, data);
                return { [diseaseNameCapitalized]: null };
            }
        } catch (error) {
            // Tangani error saat fetch atau parsing JSON
            console.error(`Error saat mengambil data untuk ${diseaseNameCapitalized}:`, error);
            element.textContent = 'Error'; // Tampilkan 'Error' di span
            return { [diseaseNameCapitalized]: null }; // Kembalikan null jika error
        }
    };


    /**
     * Merender atau memperbarui grafik statistik menggunakan Chart.js.
     * @param {object} combinedData - Objek gabungan data persentase penyakit (e.g., { Jantung: 22, Ginjal: 15, ... }).
     * @param {string} chartType - Tipe grafik yang akan dirender ('bar', 'doughnut', 'pie', 'line', 'polarArea', 'radar').
     */
    const renderOrUpdateChart = (combinedData, chartType = 'bar') => {
        // Validasi data sebelum merender
        if (!combinedData || typeof combinedData !== 'object' || Object.keys(combinedData).length === 0) {
            console.error("Error: Data gabungan kosong atau tidak valid untuk merender grafik.");
            const chartCtx = ctx.getContext('2d');
            // Hapus grafik lama jika ada
            if (statistikChartInstance) {
                statistikChartInstance.destroy();
                statistikChartInstance = null;
            }
            // Tampilkan pesan error di canvas
            chartCtx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            chartCtx.textAlign = 'center';
            chartCtx.fillStyle = '#ef4444'; // Warna merah untuk error
            chartCtx.font = '16px Poppins';
            chartCtx.fillText("Data statistik tidak dapat dimuat.", ctx.canvas.width / 2, 50); // Posisi teks error
            return;
        }

        console.log(`Merender atau memperbarui grafik sebagai: ${chartType}`);

        // Siapkan data untuk Chart.js
        const labels = Object.keys(combinedData); // Nama penyakit
        const values = Object.values(combinedData).map(val => parseFloat(val) || 0); // Nilai persentase (pastikan angka)

        // --- Konfigurasi Dasar Chart.js ---
        let chartOptions = {
            responsive: true,
            maintainAspectRatio: false, // Penting agar grafik mengisi container
            plugins: {
                legend: {
                    display: true, // Default tampilkan legenda
                    position: 'bottom',
                    labels: { padding: 20, boxWidth: 15, usePointStyle: true, font: { size: 13 }, color: '#374151' } // Warna teks legenda
                },
                tooltip: {
                    enabled: true, backgroundColor: 'rgba(0, 0, 0, 0.8)', titleFont: { size: 14, weight: 'bold' }, bodyFont: { size: 12 }, padding: 10, boxPadding: 4, usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || ''; if (label) { label += ': '; }
                            let value = context.parsed;
                            // Penyesuaian cara akses nilai berdasarkan tipe chart dan orientasi
                            if (chartType === 'bar' && chartOptions.indexAxis === 'y' && context.parsed.x !== null) { value = context.parsed.x; }
                            else if (chartType === 'bar' && chartOptions.indexAxis !== 'y' && context.parsed.y !== null) { value = context.parsed.y; }
                            else if (chartType === 'radar' || chartType === 'line') { value = context.raw; } // Gunakan raw untuk radar/line
                            else if (context.parsed !== null && ['doughnut', 'pie', 'polarArea'].includes(chartType)) { value = context.parsed; }
                            else { value = 0; } // Fallback
                            label += value.toFixed(1) + '%'; return label;
                        }
                    }
                 }
            }
        };

        let chartDataConfig = {
            labels: labels,
            datasets: [{
                label: 'Persentase Kasus (%)',
                data: values,
                // Warna akan diatur spesifik per tipe di bawah
            }]
        };

        // --- Penyesuaian Spesifik Tipe Grafik ---
        delete chartOptions.scales; // Hapus scales default, akan ditambahkan jika perlu
        delete chartOptions.indexAxis; // Hapus indexAxis default
        chartOptions.plugins.legend.display = true; // Tampilkan legenda secara default

        // Atur warna dan opsi spesifik berdasarkan tipe
        if (chartType === 'bar') {
            chartOptions.indexAxis = 'y'; // Bar horizontal
            chartOptions.scales = { x: { beginAtZero: true, grid: { display: true, color: 'rgba(200, 200, 200, 0.2)', borderColor: 'rgba(150, 150, 150, 0.1)' }, ticks: { callback: function(value) { return value + "%" }, color: '#4b5563' } }, y: { grid: { display: false }, ticks: { color: '#374151' } } };
            chartOptions.plugins.legend.display = false; // Sembunyikan legenda untuk bar chart
            chartDataConfig.datasets[0].backgroundColor = getTransparentColors(0.7).slice(0, values.length);
            chartDataConfig.datasets[0].borderColor = baseColors.slice(0, values.length);
            chartDataConfig.datasets[0].borderWidth = 1;
            chartDataConfig.datasets[0].borderRadius = 5;
            chartDataConfig.datasets[0].barPercentage = 0.7;
            chartDataConfig.datasets[0].categoryPercentage = 0.8;
        } else if (chartType === 'doughnut' || chartType === 'pie' || chartType === 'polarArea') {
            chartDataConfig.datasets[0].backgroundColor = baseColors.slice(0, values.length); // Warna solid
            chartDataConfig.datasets[0].borderColor = '#ffffff'; // Border putih antar segmen
            chartDataConfig.datasets[0].borderWidth = 2;
            chartDataConfig.datasets[0].hoverOffset = 8; // Efek angkat saat hover
            if (chartType === 'doughnut') chartOptions.cutout = '60%';
            if (chartType === 'pie') chartOptions.cutout = '0%';
            // PolarArea tidak perlu cutout, scales defaultnya radial
        } else if (chartType === 'line') {
             chartDataConfig.datasets[0].backgroundColor = getTransparentColors(0.2)[0]; // Warna area (opsional)
             chartDataConfig.datasets[0].borderColor = baseColors[0]; // Warna garis utama
             chartDataConfig.datasets[0].borderWidth = 2.5; // Garis lebih tebal
             chartDataConfig.datasets[0].pointBackgroundColor = baseColors[0];
             chartDataConfig.datasets[0].pointBorderColor = '#ffffff';
             chartDataConfig.datasets[0].pointRadius = 4; // Ukuran titik
             chartDataConfig.datasets[0].pointHoverRadius = 6; // Ukuran titik saat hover
             chartDataConfig.datasets[0].pointHoverBackgroundColor = '#ffffff';
             chartDataConfig.datasets[0].pointHoverBorderColor = baseColors[0];
             chartDataConfig.datasets[0].tension = 0.1; // Sedikit melengkung
             chartDataConfig.datasets[0].fill = false; // Tidak mengisi area bawah garis (set true jika ingin)
             chartOptions.scales = { x: { grid: { color: 'rgba(200, 200, 200, 0.1)'}, ticks: { color: '#4b5563' } }, y: { beginAtZero: true, grid: { color: 'rgba(200, 200, 200, 0.1)'}, ticks: { callback: function(value) { return value + "%" }, color: '#4b5563' } } };
        } else if (chartType === 'radar') {
            chartDataConfig.datasets[0].backgroundColor = getTransparentColors(0.2)[0]; // Warna area dalam radar
            chartDataConfig.datasets[0].borderColor = baseColors[0]; // Warna garis radar
            chartDataConfig.datasets[0].pointBackgroundColor = baseColors[0];
            chartDataConfig.datasets[0].pointBorderColor = '#fff';
            chartDataConfig.datasets[0].pointHoverBackgroundColor = '#fff';
            chartDataConfig.datasets[0].pointHoverBorderColor = baseColors[0];
            chartDataConfig.datasets[0].borderWidth = 2;
            chartOptions.scales = {
                r: { // Konfigurasi sumbu radial (nilai)
                    beginAtZero: true,
                    angleLines: { color: 'rgba(0, 0, 0, 0.1)' }, // Garis dari pusat ke label
                    grid: { color: 'rgba(0, 0, 0, 0.1)' }, // Garis jaring
                    pointLabels: { font: { size: 12 }, color: '#374151' }, // Label penyakit di ujung
                    ticks: {
                        backdropColor: 'rgba(255, 255, 255, 0.75)', // Background angka di sumbu
                        color: '#4b5563',
                        stepSize: 10, // Sesuaikan interval angka jika perlu
                        callback: function(value) { return value + "%" }
                    }
                }
            };
            // Radar chart biasanya lebih cocok jika ada beberapa dataset untuk dibandingkan
            // Jika hanya satu dataset, mungkin perlu penyesuaian visual lebih lanjut
        }

        // Hancurkan instance chart lama jika ada
        if (statistikChartInstance) {
            console.log("Menghancurkan instance grafik lama...");
            statistikChartInstance.destroy();
        }

        // Buat instance Chart baru
        console.log("Membuat instance grafik baru...");
        try {
             statistikChartInstance = new Chart(ctx, {
                type: chartType,
                data: chartDataConfig,
                options: chartOptions
            });
            updateActiveButton(chartType); // Update tombol aktif setelah render berhasil
        } catch (error) {
            console.error(`Gagal membuat grafik tipe ${chartType}:`, error);
             const chartCtx = ctx.getContext('2d');
             chartCtx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
             chartCtx.textAlign = 'center'; chartCtx.fillStyle = '#ef4444'; chartCtx.font = '16px Poppins';
             chartCtx.fillText(`Gagal memuat grafik ${chartType}.`, ctx.canvas.width / 2, 50);
        }
    };

    /**
     * Menandai tombol tipe grafik yang aktif secara visual.
     * @param {string} activeType - Tipe grafik yang sedang aktif ('bar', 'doughnut', dll.).
     */
    const updateActiveButton = (activeType) => {
        chartTypeButtons.forEach(button => {
            const buttonType = button.getAttribute('data-type');
            // Hapus style aktif dari semua tombol dulu
            button.classList.remove('active', 'bg-blue-600', 'text-white', 'ring-2', 'ring-offset-1', 'ring-blue-500');
            // Tambahkan style non-aktif default
            button.classList.add('bg-white', 'text-blue-600', 'hover:bg-gray-100');

            // Tambahkan style aktif ke tombol yang sesuai
            if (buttonType === activeType) {
                button.classList.add('active', 'bg-blue-600', 'text-white', 'ring-2', 'ring-offset-1', 'ring-blue-500');
                button.classList.remove('bg-white', 'text-blue-600', 'hover:bg-gray-100');
            }
        });
    };

    // --- Fungsi Utama untuk Fetch dan Update ---
    const fetchAllDataAndRender = async () => {
        console.log("Memulai pengambilan data individual...");
        const fetchPromises = [];

        // Buat array promise untuk setiap fetch individual
        for (const id in percentageElementMapping) {
            const diseaseName = percentageElementMapping[id];
            fetchPromises.push(fetchAndUpdateIndividualPercentage(id, diseaseName));
        }

        try {
            // Tunggu semua fetch selesai
            const results = await Promise.all(fetchPromises);
            console.log("Semua fetch individual selesai:", results);

            // Gabungkan hasil yang valid menjadi satu objek untuk grafik
            const combinedData = results.reduce((acc, currentResult) => {
                if (currentResult && typeof currentResult === 'object') {
                    const key = Object.keys(currentResult)[0]; // Ambil nama penyakit (e.g., "Jantung")
                    // Hanya tambahkan ke data gabungan jika nilainya bukan null (berhasil fetch)
                    if (currentResult[key] !== null) {
                       acc[key] = currentResult[key];
                    }
                }
                return acc;
            }, {});

            console.log("Data gabungan untuk grafik:", combinedData);
            cachedCombinedData = combinedData; // Simpan data gabungan di cache

            // Render grafik awal dengan data gabungan dan tipe default
            renderOrUpdateChart(cachedCombinedData, currentChartType);

        } catch (error) {
            // Error ini jarang terjadi jika fetchIndividualPercentage sudah try-catch
            console.error("Error saat menggabungkan hasil fetch individual:", error);
            renderOrUpdateChart(null, currentChartType); // Tampilkan error di grafik
        }
    };

    // --- Event Listener untuk Tombol Ganti Tipe Grafik ---
    chartTypeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const selectedType = button.getAttribute('data-type');
            // Hanya render ulang jika tipe berbeda dan data sudah ada
            if (selectedType && selectedType !== currentChartType) {
                currentChartType = selectedType;
                if (cachedCombinedData) {
                    renderOrUpdateChart(cachedCombinedData, currentChartType);
                } else {
                    // Jika data awal gagal fetch, tombol ini tidak akan melakukan apa-apa
                    // kecuali kita panggil fetchAllDataAndRender() lagi
                    console.warn("Data cache tidak tersedia, tidak dapat mengganti tipe grafik. Coba refresh halaman.");
                    // Optional: fetchAllDataAndRender(); // Coba fetch ulang jika data awal gagal
                }
            }
        });
    });

    // --- Inisialisasi ---
    fetchAllDataAndRender(); // Panggil fungsi utama saat DOM siap
    // --------------------

}); // Akhir DOMContentLoaded

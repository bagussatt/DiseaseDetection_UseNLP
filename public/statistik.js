document.addEventListener("DOMContentLoaded", function () {
    fetch('/api/persentase-penyakit')
        .then(response => response.json())
        .then(data => {
            const ctx = document.getElementById('statistikChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',  // Menggunakan diagram batang
                data: {
                    labels: Object.keys(data.persentasePenyakit),
                    datasets: [{
                        label: 'Persentase Penyakit (%)',
                        data: Object.values(data.persentasePenyakit),
                        backgroundColor: ['red', 'blue', 'green', 'gray'],
                        borderColor: ['darkred', 'darkblue', 'darkgreen', 'black'],
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        })
        .catch(error => console.error('Error fetching data:', error));
});

document.addEventListener("DOMContentLoaded", async function() {
    const section2Element = document.getElementById("section2");

    try {
        const response = await fetch("http://localhost:3000/api/persentase-penyakit/flu");
        if (!response.ok) {
            throw new Error("Gagal mengambil data dari API");
        }
        const data = await response.json();

        // Ambil elemen tempat persentase akan ditampilkan
        const content = `
            <div>
                <h1>FLU atau Influenza</h1>
                <p>Flu, atau influenza, adalah infeksi virus yang menyerang saluran pernapasan, termasuk hidung, tenggorokan, dan paru-paru. Penyakit ini disebabkan oleh virus influenza, yang dapat menyebar melalui tetesan udara ketika seseorang yang terinfeksi batuk atau bersin.</p>
                <p><strong>Persentase orang yang konsultasi dan terkena flu: ${data.persentase}%</strong></p>
                 <a href="flu.html">
                    <button style="background-color: #2196F3; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
                        Cek Gejala Flu Lebih Detail
                    </button>
                </a>
            </div>
            
            <img src="/component/batuk.png" alt="Gambar Section 2">
        `;

        // Update isi Section 2
        section2Element.innerHTML = content;

    } catch (error) {
        console.error("Error:", error);
        section2Element.innerHTML = `
            <div>
                <h2>Section 2: Layanan Kami</h2>
                <p>Data tidak dapat dimuat saat ini.</p>
            </div>
        `;
    }
});

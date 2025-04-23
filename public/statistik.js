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
                        backgroundColor: ['red','blue','green','yellow','orange','purple','pink','brown','cyan','lime','indigo','teal','gray'],
                        borderColor: [
                            'darkred',
                            'darkblue',
                            'darkgreen',
                            'goldenrod',
                            'darkorange',
                            'indigo',
                            'deeppink',
                            'saddlebrown',
                            'darkcyan',
                            'green',
                            'midnightblue',
                            'darkslategray',
                            'black',
                          ],
                          
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
async function updatePersentaseFlu() {
    try {
        const response = await fetch("http://localhost:3000/api/persentase-penyakit/flu");
        if (!response.ok) throw new Error("Gagal mengambil data");

        const data = await response.json();

        // Ambil nilai persentasenya (dari properti 'persentase')
        let percentage = parseFloat(data.persentase);

        // Jika kosong/null/NaN maka set ke 0
        if (isNaN(percentage)) {
            percentage = 0;
        }

        // Update elemen HTML dengan format angka + '%'
        const fluPercentageElement = document.getElementById('fluPercentage');
        
        if(fluPercentageElement){
            fluPercentageElement.textContent = `${percentage.toFixed(2)}%`;
        } else {
            console.warn("Elemen #fluPercentage tidak ditemukan");
        }
        
    } catch (error) {
       console.error("Error saat update persentase flu:", error);
       // Jika error, tetap tampilkan "0%"
       const fluPercentageElement = document.getElementById('fluPercentage');
       if(fluPercentageElement){
           fluPercentageElement.textContent = "0%";
       }
    }
}

// Panggil fungsi setelah halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
   updatePersentaseFlu();
});

async function updatePersentaseDiare() {
    try {
        const response = await fetch("http://localhost:3000/api/persentase-penyakit/diare");
        if (!response.ok) throw new Error("Gagal mengambil data");

        const data = await response.json();

        // Ambil nilai persentasenya (dari properti 'persentase')
        let percentage = parseFloat(data.persentase);

        // Jika kosong/null/NaN maka set ke 0
        if (isNaN(percentage)) {
            percentage = 0;
        }

        // Update elemen HTML dengan format angka + '%'
        const fluPercentageElement = document.getElementById('DiarePercentage');
        
        if(fluPercentageElement){
            fluPercentageElement.textContent = `${percentage.toFixed(2)}%`;
        } else {
            console.warn("Elemen #DiarePercentage tidak ditemukan");
        }
        
    } catch (error) {
       console.error("Error saat update persentase Diare:", error);
       // Jika error, tetap tampilkan "0%"
       const fluPercentageElement = document.getElementById('DiarePercentage');
       if(fluPercentageElement){
           fluPercentageElement.textContent = "0%";
       }
    }
}

// Panggil fungsi setelah halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
   updatePersentaseDiare();
});

async function updatePersentaseHipertensi() {
    try {
        const response = await fetch("http://localhost:3000/api/persentase-penyakit/hipertensi");
        if (!response.ok) throw new Error("Gagal mengambil data");

        const data = await response.json();

        // Ambil nilai persentasenya (dari properti 'persentase')
        let percentage = parseFloat(data.persentase);

        // Jika kosong/null/NaN maka set ke 0
        if (isNaN(percentage)) {
            percentage = 0;
        }

        // Update elemen HTML dengan format angka + '%'
        const hipePercentageElement = document.getElementById('HipertensiPercentage');
        
        if(hipePercentageElement){
            hipePercentageElement.textContent = `${percentage.toFixed(2)}%`;
        } else {
            console.warn("Elemen #HipertensiPercentage tidak ditemukan");
        }
        
    } catch (error) {
       console.error("Error saat update persentase Hipertensi:", error);
       // Jika error, tetap tampilkan "0%"
       const fluPercentageElement = document.getElementById('HipertensiPercentage');
       if(hipePercentageElement){
           hipePercentageElement.textContent = "0%";
       }
    }
}

// Panggil fungsi setelah halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
   updatePersentaseHipertensi();
});

async function updatePersentaseIspa() {
    try {
        const response = await fetch("http://localhost:3000/api/persentase-penyakit/ispa");
      if (!response.ok) throw new Error("Gagal mengambil data");

        const data = await response.json();

        // Ambil nilai persentasenya (dari properti 'persentase')
        let percentage = parseFloat(data.persentase);

        // Jika kosong/null/NaN maka set ke 0
        if (isNaN(percentage)) {
            percentage = 0;
        }

        // Update elemen HTML dengan format angka + '%'
        const fluPercentageElement = document.getElementById('IspaPercentage');
        
        if(fluPercentageElement){
            fluPercentageElement.textContent = `${percentage.toFixed(2)}%`;
        } else {
            console.warn("Elemen #IspaPercentage tidak ditemukan");
        }
        
    } catch (error) {
       console.error("Error saat update persentase Ispa:", error);
       // Jika error, tetap tampilkan "0%"
       const fluPercentageElement = document.getElementById('IspaPercentage');
       if(fluPercentageElement){
           fluPercentageElement.textContent = "0%";
       }
    }
}

// Panggil fungsi setelah halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
   updatePersentaseIspa();
});


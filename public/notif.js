// Load Navbar
async function loadNavbar() {
    try {
        const response = await fetch("navbar.html");
        if (!response.ok) throw new Error("Navbar gagal dimuat");
        document.getElementById("navbar-container").innerHTML = await response.text();
    } catch (error) {
        console.error("Error loading navbar:", error);
    }
}
loadNavbar();

// Smooth Scroll untuk Navigasi
document.addEventListener("DOMContentLoaded", function () {
    const links = document.querySelectorAll("nav ul li a");
    links.forEach(link => {
        link.addEventListener("click", function (event) {
            if (this.getAttribute("href").startsWith("#")) {
                event.preventDefault();
                const sectionId = this.getAttribute("href").substring(1);
                document.getElementById(sectionId).scrollIntoView({
                    behavior: "smooth"
                });
            }
        });
    });

    // Event Listener untuk Floating Button
    const floatingButton = document.getElementById("floating-button");
    if (floatingButton) {
        floatingButton.addEventListener("click", function () {
            Swal.fire({
                title: "Persetujuan",
                text: "Sistem akan Merekam Suara anda untuk melakukan identifikasi penyakit, Apakah anda bersedia?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Ya, Lanjutkan",
                cancelButtonText: "Batal"
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = "deteksiPenyakit.html";
                }
            });
        });
    }

    // Event Listener untuk Tombol "Cek Gejala Anda"
    const cekGejalaButton = document.getElementById("cek-gejala-button");
    if (cekGejalaButton) {
        cekGejalaButton.addEventListener("click", function () {
            Swal.fire({
                title: "Konsultasi Penyakit",
                text: "Sistem akan Merekam Suara anda untuk melakukan identifikasi penyakit, Apakah anda bersedia ?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Ya, Lanjutkan",
                cancelButtonText: "Batal"
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = "deteksiPenyakit.html";
                }
            });
        });
    }
});

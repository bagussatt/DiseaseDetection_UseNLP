// sketch.js
let viewer = document.getElementById("view");
let speech;
let recording = "";
let finalTranscript = "";
let isRecordingActive = false;
let storedSentence = ""; // Variabel untuk menyimpan kalimat yang lebih dari empat kata
let interimTimeoutId;
const interimDebounceTime = 200; // Waktu debounce untuk hasil sementara (200ms)

function setup() {
    noCanvas();

    speech = new p5.SpeechRec("id-ID", getResult);
    speech.continuous = true;
    speech.interimResults = true;

    speech.onStart = function() {
        viewer.innerHTML = "Merekam suara...";
        isRecordingActive = true;
        finalTranscript = "";
        storedSentence = "";
        console.log("Mulai merekam");
    };

    speech.onResult = function() {
        if (isRecordingActive) {
            let currentResult = speech.resultString.trim();
            let wordCount = currentResult.split(/\s+/).filter(Boolean).length;

            clearTimeout(interimTimeoutId);
            interimTimeoutId = setTimeout(() => {
                if (wordCount > 4) {
                    storedSentence = (storedSentence ? storedSentence + " " : "") + currentResult;
                    viewer.innerHTML = storedSentence + " (sementara)";
                    console.log("Kalimat disimpan (debounce):", storedSentence);
                }
            }, interimDebounceTime);

            if (speech.final) {
                finalTranscript += (finalTranscript ? " " : "") + currentResult;
                console.log("Hasil final (per bagian):", currentResult);
            }
        }
    };

    speech.onEnd = function() {
        if (isRecordingActive) {
            console.log("Perekaman sementara berhenti");
        }
    };

    speech.start();
    console.log("speech.start() dipanggil");
}

function getResult() {}

function reset() {
    isRecordingActive = false;
    recording = "";
    finalTranscript = "";
    storedSentence = "";
    viewer.innerHTML = "";
    speech.stop();
    console.log("Perekaman direset dan dihentikan");
}

document.getElementById("submitBtn").addEventListener("click", async function() {
    isRecordingActive = false;
    speech.stop();
    recording = storedSentence.trim(); // Kirim storedSentence, bukan finalTranscript
    viewer.innerHTML = recording; // Tampilkan storedSentence sebagai hasil final
    if (recording) {
        console.log("Data yang akan dikirim (dari submit):", recording);
        await sendToServer(recording); // Panggil fungsi sendToServer dengan storedSentence
    } else {
        Swal.fire("Peringatan", "Tidak ada teks yang direkam untuk dikirim.", "warning");
    }
});

function saveAsPDF(content, print = false) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.text("Hasil Deteksi Penyakit", 10, 10);
    doc.setFont("helvetica", "normal");

    let tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    let cleanText = tempDiv.textContent || tempDiv.innerText || "";

    cleanText = cleanText.replace(/alert\(.*?\);/g, "").trim();
    cleanText = cleanText.replace(/Obat yang disarankan:\s+/g, ""); // Hapus label duplikat
    cleanText = cleanText.replace(/Saran:\s+/g, ""); // Hapus kata "Saran:" berulang

    let formattedText = cleanText
        .replace(/Penyakit terdeteksi:/g, "\nPenyakit terdeteksi: ")
        .replace(/Gejala yang muncul:/g, "\nGejala yang muncul: ")
        .replace(/Saran Dokter:/g, "\nSaran Dokter: ")
        .replace(/Saran Obat:/g, "\nSaran Obat: ")
        // .replace(/Waktu Deteksi:/g, "\nWaktu Deteksi: ");

    let splitText = doc.splitTextToSize(formattedText, 180);
    doc.text(splitText, 20, 40);

    if (print) {
        doc.autoPrint(); // Cetak otomatis
        window.open(doc.output("bloburl"), "_blank");
    } else {
        doc.save("Hasil_Deteksi.pdf"); // Simpan PDF
    }
}

async function sendToServer(inputText) {
    try {
        viewer.innerHTML = "Mengirim data ke server...";
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `inputText=${encodeURIComponent(inputText)}`
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        let hasilDeteksiHTML = "";
        if (data.hasilDeteksi) {
            const formattedData = data.hasilDeteksi.split('\n').filter(line => line.trim() !== "");
            hasilDeteksiHTML += `<div style="text-align: left;"><ul>`;
            formattedData.forEach(line => {
                const parts = line.split(':');
                if (parts.length === 2) {
                    const label = parts[0].trim();
                    const value = parts[1].trim();
                    hasilDeteksiHTML += `<li><b>${label}:</b> ${value}</li>`;
                } else {
                    hasilDeteksiHTML += `<li>${line}</li>`; // Menangani baris yang tidak memiliki label:nilai
                }
            });
            hasilDeteksiHTML += `</ul></div><br><hr><br>`;
        } else {
            hasilDeteksiHTML = "<p>Tidak ada hasil deteksi.</p><br><hr><br>";
        }

        let petaHTML = '<div id="leaflet-map-hasil" style="height: 300px;"></div><ul id="daftar-rs-hasil"></ul>';
        let leafletMap;
        let userMarker;
        const umyLocation = { lat: -7.8127, lng: 110.3651 }; // Koordinat UMY

        await Swal.fire({
            width: '60%',
            title: 'Hasil Deteksi & Rumah Sakit Terdekat',
            html: hasilDeteksiHTML + petaHTML,
            icon: data.hasilDeteksi ? "success" : "info",
            didOpen: () => {
                const mapElement = document.getElementById('leaflet-map-hasil');
                const hospitalListDiv = document.getElementById('daftar-rs-hasil');
                leafletMap = L.map(mapElement).setView(umyLocation, 14); // Set tampilan awal ke UMY

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(leafletMap);

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            const userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                            leafletMap.setView(userLocation, 15);
                            if (userMarker) {
                                userMarker.setLatLng(userLocation).setPopupContent('Lokasi Anda').openPopup();
                            } else {
                                userMarker = L.marker(userLocation).addTo(leafletMap).bindPopup('Lokasi Anda').openPopup();
                            }
                            await fetchNearbyHospitalsSWAL(userLocation.lat, userLocation.lng, leafletMap, hospitalListDiv, userLocation);
                        },
                        (error) => {
                            Swal.fire('Warning', 'Gagal mendapatkan lokasi Anda. Menampilkan rumah sakit di sekitar UMY.', 'warning');
                            leafletMap.setView(umyLocation, 14);
                            userMarker = L.marker(umyLocation).addTo(leafletMap).bindPopup('Lokasi UMY').openPopup();
                            fetchNearbyHospitalsSWAL(umyLocation.lat, umyLocation.lng, leafletMap, hospitalListDiv, umyLocation);
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 5000,
                            maximumAge: 0
                        }
                    );
                } else {
                    Swal.fire('Error', 'Geolocation tidak didukung oleh browser Anda. Menampilkan rumah sakit di sekitar UMY.', 'error');
                    leafletMap.setView(umyLocation, 14);
                    userMarker = L.marker(umyLocation).addTo(leafletMap).bindPopup('Lokasi UMY').openPopup();fetchNearbyHospitalsSWAL(umyLocation.lat, umyLocation.lng, leafletMap, hospitalListDiv, umyLocation);
                }
            },
            confirmButtonText: 'Kembali ke Home',
            cancelButtonText: 'Simpan sebagai PDF',
            showCancelButton: true
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = "index.html";
                setTimeout(() => {
                    location.reload();
                }, 500);
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                saveAsPDF(data.hasilDeteksi); // Panggil saveAsPDF hanya dengan hasil diagnosa
            }
        });

    } catch (error) {
        console.error('Error:', error);
        Swal.fire("Kesalahan", "Terjadi kesalahan saat mengirim data.", "error");
    } finally {
        viewer.innerHTML = "Silahkan berbicara..."; // Reset tampilan
    }
}

async function fetchNearbyHospitalsSWAL(lat, lng, map, hospitalListDiv, userLocation) {
    try {
        const response = await fetch(`/api/nearby-hospitals?lat=${lat}&lng=${lng}`);
        const hospitals = await response.json();
        displayHospitalsSWAL(hospitals, map, hospitalListDiv, userLocation);
    } catch (error) {
        console.error('Error fetching hospitals:', error);
        hospitalListDiv.textContent = 'Gagal mengambil data rumah sakit.';
    }
}

function displayHospitalsSWAL(hospitals, map, hospitalListDiv, userLocation) {
    hospitalListDiv.innerHTML = '';
    if (hospitals.length === 0) {
        hospitalListDiv.textContent = 'Tidak ada rumah sakit terdekat ditemukan.';
        return;
    }

    let tableHTML = '<table style="width: 100%; border-collapse: collapse;">';
    tableHTML += '<thead><tr><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Nama Rumah Sakit</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Alamat</th><th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Jarak (km)</th></tr></thead><tbody>';

    const hospitalsWithDistance = hospitals.map(hospital => {
        if (hospital.lat && hospital.lng && userLocation) {
            const hospitalLatLng = L.latLng(hospital.lat, hospital.lng);
            const distanceMeters = map.distance(L.latLng(userLocation.lat, userLocation.lng), hospitalLatLng);
            return { ...hospital, distance: distanceMeters };
        }
        return { ...hospital, distance: Infinity }; // Jika lokasi tidak ada, anggap jarak tak hingga
    });

    // Urutkan berdasarkan jarak terdekat
    hospitalsWithDistance.sort((a, b) => a.distance - b.distance);


    hospitalsWithDistance.forEach(hospital => {
        if (hospital.lat && hospital.lng) {
            const distanceKM = (hospital.distance / 1000).toFixed(2);
            const distanceText = userLocation ? distanceKM : 'Tidak diketahui';
            const marker = L.marker([hospital.lat, hospital.lng]).addTo(map).bindPopup(`${hospital.name} (${distanceText} km)`);
            tableHTML += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${hospital.name}</td><td style="border: 1px solid #ddd; padding: 8px;">${hospital.address || 'Alamat tidak tersedia'}</td><td style="border: 1px solid #ddd; padding: 8px;">${distanceText}</td></tr>`;
        }
    });
    tableHTML += '</tbody></table>';
    hospitalListDiv.innerHTML = tableHTML;
}
function saveAsPDF(diagnosaContent, print = false) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Tambahkan Header
    const headerText = "Website Konsultasi";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    const textWidth = doc.getTextWidth(headerText);
    const pageWidth = doc.internal.pageSize.getWidth();
    const xPosition = (pageWidth - textWidth) / 2;
    doc.text(headerText, xPosition, 20);

    // Tambahkan Logo (Asumsi logo.png ada dan dapat diakses)
    const logoImg = new Image();
    logoImg.onload = function() {
        const logoWidth = 30;
        const logoHeight = 30;
        const logoX = 10;
        const logoY = 10;
        doc.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);

        // Format Isi Diagnosa
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        let yPosition = 50;
        const margin = 10;

        const formattedDiagnosa = diagnosaContent.split('\n').filter(line => line.trim() !== "");
        formattedDiagnosa.forEach(line => {
            const parts = line.split(':');
            if (parts.length === 2) {
                const label = parts[0].trim();
                const value = parts[1].trim();
                doc.setFont("helvetica", "bold");
                doc.text(`${label}:`, margin, yPosition);
                doc.setFont("helvetica", "normal");
                const valueLines = doc.splitTextToSize(value, pageWidth - 2 * margin - doc.getTextWidth(`${label}: `) - 5);
                let valueY = yPosition;
                valueLines.forEach(vLine => {
                    doc.text(vLine, margin + doc.getTextWidth(`${label}: `) + 5, valueY);
                    valueY += 5; // Spasi antar baris nilai
                });
                yPosition = valueY + 5; // Spasi antar item diagnosa
            } else {
                doc.text(line, margin, yPosition);
                yPosition += 5;
            }
            if (yPosition > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                yPosition = 20;
            }
        });

        if (print) {
            doc.autoPrint();
            window.open(doc.output("bloburl"), "_blank");
        } else {
            doc.save("Hasil_Diagnosa.pdf");
        }
    };
    logoImg.onerror = function() {
        // Jika logo gagal dimuat, tetap buat PDF tanpa logo
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        let yPosition = 30;
        const margin = 10;

        const formattedDiagnosa = diagnosaContent.split('\n').filter(line => line.trim() !== "");
        formattedDiagnosa.forEach(line => {
            const parts = line.split(':');
            if (parts.length === 2) {
                const label = parts[0].trim();
                const value = parts[1].trim();
                doc.setFont("helvetica", "bold");
                doc.text(`${label}:`, margin, yPosition);
                doc.setFont("helvetica", "normal");
                const valueLines = doc.splitTextToSize(value, pageWidth - 2 * margin - doc.getTextWidth(`${label}: `) - 5);
                let valueY = yPosition;
                valueLines.forEach(vLine => {
                    doc.text(vLine, margin + doc.getTextWidth(`${label}: `) + 5, valueY);
                    valueY += 5;
                });
                yPosition = valueY + 5;
            } else {
                doc.text(line, margin, yPosition);
                yPosition += 5;
            }
            if (yPosition > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                yPosition = 20;
            }
        });

        if (print) {
            doc.autoPrint();
            window.open(doc.output("bloburl"), "_blank");
        } else {
            doc.save("Hasil_Diagnosa.pdf");
        }
    };
    logoImg.src = 'logo.png'; // Ganti dengan path atau URL logo Anda
}
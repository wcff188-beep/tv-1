document.addEventListener("DOMContentLoaded", function () {
    // 1. Inisialisasi Variabel Global & Elemen DOM
    const liveClock = document.getElementById("liveClock");
    const dateMasehi = document.getElementById("dateMasehi");
    const dateHijriah = document.getElementById("dateHijriah");
    const namaMasjidDisplay = document.getElementById("namaMasjidDisplay");
    const lokasiDisplay = document.getElementById("lokasiDisplay");
    const slideshowContainer = document.getElementById("slideshowContainer");
    const blackoutScreen = document.getElementById("blackoutScreen");
    const nextPrayerInfo = document.getElementById("nextPrayerInfo");
    const runningTextContent = document.getElementById("runningTextContent");

    let appData = {};
    let currentSlideIndex = 0;
    let slideshowInterval = null;
    let slidesImages = [];

    // 2. Fungsi Mengambil Data dari Google Apps Script
    async function fetchData() {
        if (!CONFIG || !CONFIG.API_URL || CONFIG.API_URL.includes("https://script.google.com/macros/s/AKfycbz0EGO5D70XayPObX3Llm1G3X0iUkPr57-tK3QnBUMZCqxaQ4moNCUN3YN8UFu88V4/exec")) {
            console.warn("URL API belum dikonfigurasi di js/config.js");
            return;
        }

        try {
            let response = await fetch(CONFIG.API_URL + "?action=getData");
            let result = await response.json();
            if (result.status === "success") {
                appData = result.data;
                updateUIFromDatabase();
            }
        } catch (error) {
            console.error("Gagal mengambil data dari server:", error);
        }
    }

    // 3. Update Tampilan Berdasarkan Database Spreadsheet
    function updateUIFromDatabase() {
        // Update Pengaturan Umum
        if (appData.PENGATURAN) {
            appData.PENGATURAN.forEach(item => {
                if (item.kunci === "nama_masjid" && namaMasjidDisplay) namaMasjidDisplay.innerText = item.nilai;
                if (item.kunci === "lokasi" && lokasiDisplay) lokasiDisplay.innerText = item.nilai;
            });
        }

        // Update Running Text & Alarm
        if (appData.ALARM) {
            appData.ALARM.forEach(item => {
                if (item.kunci === "running_text" && runningTextContent) {
                    runningTextContent.innerText = item.nilai;
                }
            });
        }

        // Update Jadwal Salat Hari Ini
       if (appData.JADWAL_SHOLAT && appData.JADWAL_SHOLAT.length > 0) {
            let todayStr = "2026-11-01"; // Tanggal uji coba sesuai spreadsheet
            
            // Cari yang cocok dengan tanggal hari ini, jika tidak ada ambil baris pertama
            let schedule = appData.JADWAL_SHOLAT.find(s => String(s.tanggal).trim() === todayStr);
            if (!schedule) {
                schedule = appData.JADWAL_SHOLAT[0];
            }
            
            currentSchedule = schedule;

            if (currentSchedule) {
                document.getElementById("time-imsak").innerText = currentSchedule.imsak || "--:--";
                document.getElementById("time-subuh").innerText = currentSchedule.subuh || "--:--";
                document.getElementById("time-syuruq").innerText = currentSchedule.syuruq || "--:--";
                document.getElementById("time-zuhur").innerText = currentSchedule.zuhur || "--:--";
                document.getElementById("time-asar").innerText = currentSchedule.asar || "--:--";
                document.getElementById("time-magrib").innerText = currentSchedule.magrib || "--:--";
                document.getElementById("time-isya").innerText = currentSchedule.isya || "--:--";
            }
        }

        // Update Slideshow Foto (4 Foto Bergantian)
        if (appData.SLIDESHOW) {
            let activeSlides = appData.SLIDESHOW.filter(s => s.aktif.toString() === "true");
            if (activeSlides.length > 0) {
                slidesImages = activeSlides.map(s => s.url_foto);
                initSlideshow();
            }
        }
    }

    // 4. Logika Jam Real-Time & Tanggal
    function updateClock() {
        const now = new Date();
        let hours = String(now.getHours()).padStart(2, '0');
        let minutes = String(now.getMinutes()).padStart(2, '0');
        let seconds = String(now.getSeconds()).padStart(2, '0');

        if (liveClock) {
            liveClock.innerText = `${hours}:${minutes}:${seconds}`;
        }

        // Format Tanggal Masehi Bahasa Indonesia
        const optionsMasehi = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        if (dateMasehi) {
            dateMasehi.innerText = now.toLocaleDateString('id-ID', optionsMasehi);
        }
    }

    // 5. Inisialisasi & Pengaturan Slideshow (Berganti Setiap 7 Detik dengan Transisi Fade)
    function initSlideshow() {
        // Hapus elemen gambar lama jika ada
        const existingImgs = slideshowContainer.querySelectorAll('.slide-img');
        existingImgs.forEach(img => img.remove());

        // Masukkan elemen gambar baru ke container
        slidesImages.forEach((url, index) => {
            let img = document.createElement("img");
            img.src = url;
            img.className = `slide-img ${index === 0 ? 'active' : ''}`;
            slideshowContainer.appendChild(img);
        });

        // Ambil durasi slideshow dari pengaturan (default 7 detik jika belum ada)
        let duration = 7000;
        if (appData.PENGATURAN) {
            let durSetting = appData.PENGATURAN.find(s => s.kunci === "slideshow_durasi");
            if (durSetting && durSetting.nilai) {
                duration = parseInt(durSetting.nilai) * 1000;
            }
        }

        // Jalankan interval pergantian foto
        if (slideshowInterval) clearInterval(slideshowInterval);
        slideshowInterval = setInterval(changeSlide, duration);
    }

    function changeSlide() {
        const imgs = slideshowContainer.querySelectorAll('.slide-img');
        if (imgs.length === 0) return;

        imgs[currentSlideIndex].classList.remove('active');
        currentSlideIndex = (currentSlideIndex + 1) % imgs.length;
        imgs[currentSlideIndex].classList.add('active');
    }

    // Jalankan Fungsi Utama
    setInterval(updateClock, 1000);
    updateClock();
    fetchData();

    // Refresh data dari spreadsheet secara berkala (sesuai config)
    setInterval(fetchData, CONFIG.REFRESH_INTERVAL || 60000);
});

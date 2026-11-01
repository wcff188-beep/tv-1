document.addEventListener("DOMContentLoaded", function () {
    const liveClock = document.getElementById("liveClock");
    const dateMasehi = document.getElementById("dateMasehi");
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
    let currentSchedule = {};
    
    let isAlarmActive = false;
    let isIqamahActive = false;
    let isBlackoutActive = false;

    async function fetchData() {
        if (!CONFIG || !CONFIG.API_URL) return;
        try {
            let response = await fetch(CONFIG.API_URL + "?action=getData");
            let result = await response.json();
            if (result.status === "success") {
                appData = result.data;
                updateUIFromDatabase();
            }
        } catch (error) {
            console.error("Gagal mengambil data:", error);
        }
    }

    function updateUIFromDatabase() {
        if (appData.PENGATURAN) {
            appData.PENGATURAN.forEach(item => {
                if (item.kunci === "nama_masjid" && namaMasjidDisplay) namaMasjidDisplay.innerText = item.nilai;
                if (item.kunci === "lokasi" && lokasiDisplay) lokasiDisplay.innerText = item.nilai;
            });
        }

        if (appData.ALARM) {
            appData.ALARM.forEach(item => {
                if (item.kunci === "running_text" && runningTextContent) {
                    runningTextContent.innerText = item.nilai;
                }
            });
        }

        if (appData.JADWAL_SHOLAT && appData.JADWAL_SHOLAT.length > 0) {
            let now = new Date();
            let year = now.getFullYear();
            let month = String(now.getMonth() + 1).padStart(2, '0');
            let day = String(now.getDate()).padStart(2, '0');
            let todayStr = `${year}-${month}-${day}`;

            let schedule = appData.JADWAL_SHOLAT.find(s => {
                if (!s.tanggal) return false;
                return String(s.tanggal).split('T')[0].trim() === todayStr;
            });

            if (!schedule) {
                schedule = appData.JADWAL_SHOLAT[0];
            }

            currentSchedule = schedule;

            if (currentSchedule) {
                function cleanTime(val) {
                    if (!val) return "--:--";
                    let s = String(val);
                    if (s.includes('T')) {
                        return s.split('T')[1].substring(0, 5);
                    }
                    return s.substring(0, 5);
                }

                document.getElementById("time-imsak").innerText = cleanTime(currentSchedule.imsak);
                document.getElementById("time-subuh").innerText = cleanTime(currentSchedule.subuh);
                document.getElementById("time-syuruq").innerText = cleanTime(currentSchedule.syuruq);
                document.getElementById("time-zuhur").innerText = cleanTime(currentSchedule.zuhur);
                document.getElementById("time-asar").innerText = cleanTime(currentSchedule.asar);
                document.getElementById("time-magrib").innerText = cleanTime(currentSchedule.magrib);
                document.getElementById("time-isya").innerText = cleanTime(currentSchedule.isya);
            }
        }

        if (appData.SLIDESHOW) {
            let activeSlides = appData.SLIDESHOW.filter(s => String(s.aktif).toLowerCase() === "true");
            if (activeSlides.length > 0) {
                slidesImages = activeSlides.map(s => s.url_foto);
                initSlideshow();
            }
        }
    }

    function updateClock() {
        const now = new Date();
        let hours = String(now.getHours()).padStart(2, '0');
        let minutes = String(now.getMinutes()).padStart(2, '0');
        let seconds = String(now.getSeconds()).padStart(2, '0');
        
        if (liveClock) {
            liveClock.innerText = `${hours}:${minutes}:${seconds}`;
        }

        if (dateMasehi) {
            dateMasehi.innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    }

    function initSlideshow() {
        if (!slideshowContainer) return;
        slideshowContainer.querySelectorAll('.slide-img').forEach(img => img.remove());

        slidesImages.forEach((url, index) => {
            let img = document.createElement("img");
            img.src = url;
            img.className = `slide-img ${index === 0 ? 'active' : ''}`;
            slideshowContainer.appendChild(img);
        });

        if (slideshowInterval) clearInterval(slideshowInterval);
        slideshowInterval = setInterval(() => {
            const imgs = slideshowContainer.querySelectorAll('.slide-img');
            if (imgs.length === 0) return;
            imgs[currentSlideIndex].classList.remove('active');
            currentSlideIndex = (currentSlideIndex + 1) % imgs.length;
            imgs[currentSlideIndex].classList.add('active');
        }, 7000);
    }

    setInterval(updateClock, 1000);
    updateClock();
    fetchData();
    setInterval(fetchData, 60000);
});

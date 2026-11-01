document.addEventListener("DOMContentLoaded", function () {
    const liveClock = document.getElementById("liveClock");
    const dateMasehi = document.getElementById("dateMasehi");
    const dateHijriah = document.getElementById("dateHijriah");
    const namaMasjidDisplay = document.getElementById("namaMasjidDisplay");
    const lokasiDisplay = document.getElementById("lokasiDisplay");
    const slideshowContainer = document.getElementById("slideshowContainer");
    const runningTextContent = document.getElementById("runningTextContent");

    let appData = {};
    let currentSlideIndex = 0;
    let slideshowInterval = null;
    let slidesImages = [];
    let currentSchedule = {};

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
                    let s = String(val).trim();
                    if (s.includes('T')) {
                        let parts = s.split('T');
                        if (parts[1]) return parts[1].substring(0, 5);
                    }
                    if (s.length >= 5) {
                        return s.substring(0, 5);
                    }
                    return s;
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

    function timeToMinutes(tStr) {
        if (!tStr) return 0;
        let clean = String(tStr);
        if (clean.includes('T')) clean = clean.split('T')[1];
        let parts = clean.split(':');
        return parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0);
    }

    function updateActivePrayerHighlight() {
        if (!currentSchedule || !currentSchedule.subuh) return;

        const now = new Date();
        const currentTimeStr = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
        let currentMinutes = timeToMinutes(currentTimeStr);

        let prayers = [
            { id: 'imsak', time: timeToMinutes(currentSchedule.imsak) },
            { id: 'subuh', time: timeToMinutes(currentSchedule.subuh) },
            { id: 'syuruq', time: timeToMinutes(currentSchedule.syuruq) },
            { id: 'zuhur', time: timeToMinutes(currentSchedule.zuhur) },
            { id: 'asar', time: timeToMinutes(currentSchedule.asar) },
            { id: 'magrib', time: timeToMinutes(currentSchedule.magrib) },
            { id: 'isya', time: timeToMinutes(currentSchedule.isya) }
        ];

        // Menentukan waktu salat aktif: langsung berpindah ke jadwal berikutnya begitu jam melewati waktu tersebut
        let activeId = 'isya';
        for (let i = prayers.length - 1; i >= 0; i--) {
            if (currentMinutes >= prayers[i].time) {
                activeId = prayers[i].id;
                break;
            }
            // Jika sebelum imsak di hari itu, anggap aktif di isya hari sebelumnya
            if (i === 0 && currentMinutes < prayers[0].time) {
                activeId = 'isya';
            }
        }

        // Reset semua kartu jadwal
        ['imsak', 'subuh', 'syuruq', 'zuhur', 'asar', 'magrib', 'isya'].forEach(p => {
            let el = document.getElementById(`card-${p}`);
            if (el) {
                el.style.background = ""; 
                el.classList.remove('active-prayer', 'active');
            }
        });

        // Beri tanda oranye pada kartu yang aktif saat ini
        let activeCard = document.getElementById(`card-${activeId}`);
        if (activeCard) {
            activeCard.style.background = "linear-gradient(135deg, #f39c12, #e67e22)";
            activeCard.classList.add('active-prayer');
        }

        // Logika Pergantian Tanggal Hijriah Mulai Waktu Magrib
        if (dateHijriah && currentSchedule.magrib) {
            let magribMinutes = timeToMinutes(currentSchedule.magrib);
            let hijriDateObj = new Date();
            
            if (currentMinutes >= magribMinutes) {
                hijriDateObj.setDate(hijriDateObj.getDate() + 1);
            }

            try {
                let options = { calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric' };
                dateHijriah.innerText = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', options).format(hijriDateObj);
            } catch (e) {
                dateHijriah.innerText = "";
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

        updateActivePrayerHighlight();
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

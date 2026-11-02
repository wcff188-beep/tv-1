document.addEventListener("DOMContentLoaded", function () {
    const liveClock = document.getElementById("liveClock");
    const dateMasehi = document.getElementById("dateMasehi");
    const dateHijriah = document.getElementById("dateHijriah");
    const namaMasjidDisplay = document.getElementById("namaMasjidDisplay");
    const lokasiDisplay = document.getElementById("lokasiDisplay");
    const slideshowContainer = document.getElementById("slideshowContainer");
    const runningTextContent = document.getElementById("runningTextContent");
    const countdownSalat = document.getElementById("countdownSalat");

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

            let schedule = appData.JADWAL_SHOLAT.find(s => s.tanggal && String(s.tanggal).split('T')[0].trim() === todayStr);
            if (!schedule) schedule = appData.JADWAL_SHOLAT[0];
            currentSchedule = schedule;

            if (currentSchedule) {
                function cleanTime(val) {
                    if (!val) return "--:--";
                    let s = String(val).trim();
                    if (s.includes('T')) s = s.split('T')[1];
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

    function timeToSeconds(tStr) {
        if (!tStr) return 0;
        let clean = String(tStr).trim();
        if (clean.includes('T')) clean = clean.split('T')[1];
        let parts = clean.split(':');
        return (parseInt(parts[0] || 0) * 3600) + (parseInt(parts[1] || 0) * 60);
    }

    function getHijriDate(dateObj) {
        const hijriMonths = ["Muharram", "Safar", "Rabi'ul Awal", "Rabi'ul Akhir", "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban", "Ramadhan", "Syawal", "Zulqa'dah", "Zulhijjah"];
        try {
            let formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' });
            let parts = formatter.formatToParts(dateObj);
            let hDay = parts.find(p => p.type === 'day').value;
            let hMonth = parts.find(p => p.type === 'month').value;
            let hYear = parts.find(p => p.type === 'year').value.replace(/[^0-9]/g, '');
            return `${hDay} ${hijriMonths[parseInt(hMonth) - 1]} ${hYear} H`;
        } catch (e) { return ""; }
    }

    function updateClockAndHighlight() {
        const now = new Date();
        const currentSecs = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
        
        // Update Jam & Tanggal
        if (liveClock) liveClock.innerText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (dateMasehi) dateMasehi.innerText = now.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

        if (!currentSchedule || !currentSchedule.subuh) return;

        let prayers = [
            { id: 'imsak', time: timeToSeconds(currentSchedule.imsak), name: 'Imsak' },
            { id: 'subuh', time: timeToSeconds(currentSchedule.subuh), name: 'Subuh' },
            { id: 'syuruq', time: timeToSeconds(currentSchedule.syuruq), name: 'Syuruq' },
            { id: 'zuhur', time: timeToSeconds(currentSchedule.zuhur), name: 'Dzuhur' },
            { id: 'asar', time: timeToSeconds(currentSchedule.asar), name: 'Ashar' },
            { id: 'magrib', time: timeToSeconds(currentSchedule.magrib), name: 'Maghrib' },
            { id: 'isya', time: timeToSeconds(currentSchedule.isya), name: 'Isya' }
        ];

        let activeId = 'isya';
        let nextPrayer = prayers[0];

        // Cari waktu salat aktif dan berikutnya
        for (let i = 0; i < prayers.length; i++) {
            if (currentSecs < prayers[i].time) {
                activeId = i === 0 ? 'isya' : prayers[i - 1].id;
                nextPrayer = prayers[i];
                break;
            } else if (i === prayers.length - 1) {
                activeId = prayers[i].id;
                nextPrayer = { name: 'Imsak (Esok)', time: prayers[0].time + 86400 }; 
            }
        }

        // Reset highlight
        ['imsak', 'subuh', 'syuruq', 'zuhur', 'asar', 'magrib', 'isya'].forEach(p => {
            let el = document.getElementById(`col-${p}`);
            if (el) el.classList.remove('active');
        });

        // Set active highlight (Warna background nama salat & garis bawah berubah jadi oranye)
        let activeCard = document.getElementById(`col-${activeId}`);
        if (activeCard) activeCard.classList.add('active');

        // Hitung Countdown
        let diffSecs = nextPrayer.time - currentSecs;
        let h = Math.floor(diffSecs / 3600);
        let m = Math.floor((diffSecs % 3600) / 60);
        let s = diffSecs % 60;
        if (countdownSalat) {
            countdownSalat.innerText = `${nextPrayer.name} -${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }

        // Tanggal Hijriah
        if (dateHijriah && currentSchedule.magrib) {
            let magribSecs = timeToSeconds(currentSchedule.magrib);
            let hijriDateObj = new Date();
            if (currentSecs >= magribSecs) hijriDateObj.setDate(hijriDateObj.getDate() + 1);
            dateHijriah.innerText = getHijriDate(hijriDateObj);
        }
    }

    function initSlideshow() {
        if (!slideshowContainer) return;
        slideshowContainer.innerHTML = '';
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

    setInterval(updateClockAndHighlight, 1000);
    updateClockAndHighlight();
    fetchData();
    setInterval(fetchData, 60000);
});

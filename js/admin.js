async function kirimData(dataPayload) {
    if (!CONFIG || !CONFIG.API_URL) {
        alert("URL API belum dikonfigurasi!");
        return;
    }

    try {
        let response = await fetch(CONFIG.API_URL, {
            method: "POST",
            body: JSON.stringify(dataPayload)
        });
        let result = await response.json();
        if (result.status === "success") {
            alert("Data berhasil diperbarui!");
        } else {
            alert("Gagal memperbarui: " + result.message);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Terjadi kesalahan koneksi.");
    }
}

function updatePengaturan() {
    let nama = document.getElementById("inputNamaMasjid").value;
    let durasi = document.getElementById("inputSlideshowDurasi").value;

    kirimData({ sheet: "PENGATURAN", key: "nama_masjid", value: nama, action: "UPDATE_NAMA" });
    setTimeout(() => {
        kirimData({ sheet: "PENGATURAN", key: "slideshow_durasi", value: durasi, action: "UPDATE_DURASI" });
    }, 500);
}

function updateRunningText() {
    let text = document.getElementById("inputRunningText").value;
    kirimData({ sheet: "ALARM", key: "running_text", value: text, action: "UPDATE_RUNNING_TEXT" });
}

function tambahFoto() {
    let id = document.getElementById("inputPhotoId").value;
    let url = document.getElementById("inputPhotoUrl").value;

    if (!id || !url) {
        alert("ID dan URL Foto harus diisi!");
        return;
    }

    kirimData({ sheet: "SLIDESHOW", type: "add", id: id, url_foto: url, action: "ADD_SLIDE" });
}

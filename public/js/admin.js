
const socket = io();

// Menerima dan menampilkan statistik antrean
socket.on("queue:statistics", (data) => {
    document.getElementById("totalCreated").textContent =
        data.totalCreated;

    document.getElementById("totalCompleted").textContent =
        data.totalCompleted;

    document.getElementById("totalWaiting").textContent =
        data.totalWaiting;

    document.getElementById("totalProcessing").textContent =
        data.totalProcessing;
});

// Data antrean dari server
let queueData = {
    lastNumber: 0,
    current: null,
    completed: null,
    waiting: []
};


// Data riwayat antrean
let historyData = [];

// Menampilkan riwayat antrean
function renderHistory() {
    const historyList = document.querySelector(".history-list");

    historyList.innerHTML = "";

    if (historyData.length === 0) {
        historyList.textContent = "Belum ada riwayat antrean.";
        return;
    }

    historyData.forEach(item => {
        const entry = document.createElement("div");
        entry.className = "history-item";

        const number = document.createElement("strong");
        number.textContent = "Nomor " + item.number;

        const time = document.createElement("p");

        const date = new Date(item.completedAt);

        time.textContent = date.toLocaleString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        });

        entry.appendChild(number);
        entry.appendChild(time);

        historyList.appendChild(entry);
    });
}

// Menerima riwayat dari server
socket.on("queue:history", (data) => {
    historyData = data;
    renderHistory();

    console.log("Riwayat diperbarui:", historyData);
});


// Animasi angka aktif beberapa saat setelah halaman dibuka
let animationsReady = false;
setTimeout(() => {
    animationsReady = true;
}, 1500);

// Mengganti teks angka dan memberi animasi kecil jika angkanya berubah
function setNumber(element, value) {
    const text = String(value);

    if (element.textContent === text) {
        return;
    }

    element.textContent = text;

    if (!animationsReady) {
        return;
    }

    element.classList.remove("pop");
    void element.offsetWidth;
    element.classList.add("pop");
}

// Format nomor menjadi 001, 002, 003
function formatNumber(number) {
    return String(number).padStart(3, "0");
}

// Menampilkan data antrean
function renderQueue() {
    setNumber(
        document.getElementById("currentNumber"),
        queueData.current || "---"
    );

    setNumber(
        document.getElementById("newNumber"),
        formatNumber(queueData.lastNumber + 1)
    );

    const waitingList = document.querySelector(".waiting-list");

    waitingList.innerHTML = "";

    if (queueData.waiting.length === 0) {
        waitingList.textContent = "Belum ada antrean yang menunggu.";
    } else {
        queueData.waiting.forEach(number => {
            const item = document.createElement("p");
            item.textContent = "Nomor " + number;
            waitingList.appendChild(item);
        });
    }

    document.querySelector(".queue-status").textContent =
        queueData.current
            ? "SEDANG DIPROSES"
            : "BELUM ADA ANTREAN";
}

// Menerima pembaruan data dari server
socket.on("queue:update", (data) => {
    queueData = data;
    renderQueue();

    console.log("Data antrean diperbarui:", queueData);
});

// Membuat nomor antrean
document.querySelector(".btn-create").addEventListener("click", () => {
    if (!socket.connected) {
        alert("Server belum terhubung!");
        return;
    }

    socket.emit("queue:create");
});

// Memanggil nomor berikutnya
document.querySelector(".btn-call").addEventListener("click", () => {
    if (!socket.connected) {
        alert("Server belum terhubung!");
        return;
    }

    if (queueData.current) {
        alert("Selesaikan antrean yang sedang diproses terlebih dahulu.");
        return;
    }

    if (queueData.waiting.length === 0) {
        alert("Belum ada antrean yang menunggu.");
        return;
    }

    socket.emit("queue:call");
});

// Memanggil ulang nomor
document.querySelector(".btn-repeat").addEventListener("click", () => {
    if (!queueData.current) {
        alert("Belum ada nomor yang sedang diproses.");
        return;
    }

    socket.emit("queue:repeat");
});

// Menyelesaikan antrean
document.querySelector(".btn-finish").addEventListener("click", () => {
    if (!queueData.current) {
        alert("Tidak ada antrean yang sedang diproses.");
        return;
    }

    socket.emit("queue:finish");
});

// Menerima pemberitahuan panggil ulang
socket.on("queue:repeat", (number) => {
    alert("Memanggil ulang nomor " + number);
});

// Jam digital
function updateClock() {
    const now = new Date();

    document.getElementById("clock").textContent =
        now.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        });
}

updateClock();
setInterval(updateClock, 1000);


// ===============================
// RESET SELURUH ANTREAN
// ===============================

// Mengambil elemen tombol dan dialog
const resetQueueBtn = document.getElementById("resetQueueBtn");
const resetConfirmDialog = document.getElementById("resetConfirmDialog");
const cancelResetBtn = document.getElementById("cancelResetBtn");
const confirmResetBtn = document.getElementById("confirmResetBtn");

// Membuka dialog konfirmasi
resetQueueBtn.addEventListener("click", () => {
    resetConfirmDialog.showModal();
});

// Membatalkan reset
cancelResetBtn.addEventListener("click", () => {
    resetConfirmDialog.close();
});

// Menjalankan reset setelah dikonfirmasi
confirmResetBtn.addEventListener("click", () => {
    if (!socket.connected) {
        alert("Server belum terhubung!");
        resetConfirmDialog.close();
        return;
    }

    socket.emit("queue:reset");
    resetConfirmDialog.close();
});

// Menerima pesan jika reset gagal
socket.on("queue:reset:error", (message) => {
    alert(message);
});


const socket = io();

let soundEnabled = false;
let lastCompletedNumber = null;
let firstQueueUpdate = true;

let queueData = {
    current: null,
    completed: null,
    waiting: []
};

let historyData = [];

// Animasi angka baru aktif beberapa saat setelah halaman dibuka,
// supaya angka tidak "melompat" ketika data pertama baru masuk
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

// Mengubah angka menjadi kata bahasa Indonesia
function numberToWords(number) {
    const digits = String(number).split("");

    const words = [
        "nol", "satu", "dua", "tiga", "empat",
        "lima", "enam", "tujuh", "delapan", "sembilan"
    ];

    return digits
        .map(digit => words[Number(digit)])
        .join(" ");
}

// Mengucapkan nomor pesanan yang selesai
function speakQueue(number) {
    if (!soundEnabled || !("speechSynthesis" in window)) {
        return;
    }

    const speech = new SpeechSynthesisUtterance(
        `Nomor antrean ${numberToWords(number)}, silakan menuju kasir.`
    );

    speech.lang = "id-ID";
    speech.rate = 0.9;
    speech.pitch = 1;
    speech.volume = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
}

// Aktivasi suara
document.getElementById("enableSound").addEventListener("click", () => {
    if (!("speechSynthesis" in window)) {
        alert("Browser ini belum mendukung fitur suara.");
        return;
    }

    soundEnabled = true;

    document.getElementById("enableSound").classList.add("is-on");

    document.getElementById("enableSound").textContent = "🔊";
    document.getElementById("enableSound").title = "Suara aktif";

    const testSpeech = new SpeechSynthesisUtterance(
        "Suara panggilan pesanan aktif."
    );

    testSpeech.lang = "id-ID";
    testSpeech.rate = 0.9;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(testSpeech);
});

// Memperbarui tampilan utama
function updateMainDisplay() {
    const panel = document.querySelector(".current-queue");
    const currentNumber = document.getElementById("currentNumber");
    const currentLabel = document.getElementById("currentLabel");
    const status = document.querySelector(".status");
    const message = document.getElementById("queueMessage");

    if (queueData.current) {
        panel.dataset.state = "preparing";
        setNumber(currentNumber, queueData.current);
        currentLabel.textContent = "NOMOR SEDANG DISIAPKAN";
        status.textContent = "SEDANG DISIAPKAN";
        message.textContent = "Mohon menunggu sebentar";

    } else if (queueData.completed) {
        panel.dataset.state = "ready";
        setNumber(currentNumber, queueData.completed);
        currentLabel.textContent = "PESANAN SELESAI";
        status.textContent = "SILAKAN AMBIL PESANAN";
        message.textContent = "Pesanan Anda telah selesai dibuat";

    } else {
        panel.dataset.state = "idle";
        setNumber(currentNumber, "---");
        currentLabel.textContent = "BELUM ADA PESANAN";
        status.textContent = "MENUNGGU ANTREAN";
        message.textContent = "Mohon menunggu sebentar";
    }
}

// Memperbarui dua kartu kecil
function updateSmallCards() {
    const previousNumber = queueData.current
        ? historyData[0]?.number
        : historyData[1]?.number;

    setNumber(
        document.getElementById("completedNumber"),
        previousNumber || "---"
    );

    setNumber(
        document.getElementById("nextNumber"),
        queueData.waiting.length > 0
            ? queueData.waiting[0]
            : "---"
    );
}

// Menerima pembaruan antrean
socket.on("queue:update", (data) => {
    queueData = data;

    updateMainDisplay();
    updateSmallCards();

    // Tidak mengumumkan pesanan lama saat halaman pertama dibuka
    if (firstQueueUpdate) {
        lastCompletedNumber = data.completed;
        firstQueueUpdate = false;
        return;
    }

    // Suara hanya berbunyi ketika nomor selesai
    if (
        data.completed &&
        data.completed !== lastCompletedNumber
    ) {
        speakQueue(data.completed);
    }

    lastCompletedNumber = data.completed;

    console.log("Display diperbarui:", data);
});

// Menerima riwayat antrean
socket.on("queue:history", (data) => {
    historyData = data;
    updateSmallCards();

    console.log("Riwayat diterima:", historyData);
});

// Menerima perintah panggil ulang
socket.on("queue:repeat", (number) => {
    speakQueue(number);
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

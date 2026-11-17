
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

// Menghubungkan database SQLite
const {
    loadQueueData,
    saveQueueData,
    addHistory,
    loadHistory,
    loadStatistics
} = require("./database/db");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const publicFolder = path.join(__dirname, "public");

app.use(express.static(publicFolder));

app.get("/", (req, res) => {
    res.sendFile(path.join(publicFolder, "display.html"));
});

// Mengambil data antrean dari database saat server dimulai
let queueData = loadQueueData();

console.log("Data antrean berhasil dimuat:", queueData);

// Menyimpan dan mengirim pembaruan antrean
function broadcastQueue() {
    saveQueueData(queueData);

    io.emit("queue:update", queueData);
    io.emit("queue:statistics", loadStatistics());
}

io.on("connection", (socket) => {
    console.log("Perangkat terhubung:", socket.id);

    // Mengirim data terbaru kepada perangkat yang baru terhubung
    socket.emit("queue:update", queueData);
    socket.emit("queue:history", loadHistory());
    socket.emit("queue:statistics", loadStatistics());

    // Membuat nomor antrean
    socket.on("queue:create", () => {
        queueData.lastNumber++;

        const number = String(queueData.lastNumber).padStart(3, "0");

        queueData.waiting.push(number);

        console.log("Antrean dibuat:", number);
        broadcastQueue();
    });

    // Memanggil antrean berikutnya
    socket.on("queue:call", () => {
        if (queueData.current || queueData.waiting.length === 0) return;

        queueData.current = queueData.waiting.shift();

        console.log("Memanggil:", queueData.current);
        broadcastQueue();
    });

    // Menyelesaikan antrean
    socket.on("queue:finish", () => {
    if (!queueData.current) return;

    // Simpan nomor ke database riwayat
    addHistory(queueData.current);

    queueData.completed = queueData.current;
    queueData.current = null;

    console.log("Antrean selesai:", queueData.completed);

    // Simpan dan kirim pembaruan antrean
    broadcastQueue();

    // Kirim riwayat terbaru ke semua perangkat
    io.emit("queue:history", loadHistory());
});

    // Memanggil ulang nomor yang sedang diproses
    socket.on("queue:repeat", () => {
        if (queueData.current) {
            io.emit("queue:repeat", queueData.current);
        }
    });

    socket.on("disconnect", () => {
        console.log("Perangkat terputus:", socket.id);
    });
});

// Menjalankan server
server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

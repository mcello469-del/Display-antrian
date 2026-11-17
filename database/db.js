
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

// Membuka database
const db = new DatabaseSync(
    path.join(__dirname, "queue.db")
);

// Tabel data antrean aktif
db.exec(`
    CREATE TABLE IF NOT EXISTS queue_state (
        id INTEGER PRIMARY KEY,
        last_number INTEGER NOT NULL DEFAULT 0,
        current TEXT,
        completed TEXT,
        waiting TEXT NOT NULL DEFAULT '[]'
    )
`);

// Tabel riwayat antrean
db.exec(`
    CREATE TABLE IF NOT EXISTS queue_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        number TEXT NOT NULL,
        completed_at TEXT NOT NULL
    )
`);

// Data awal antrean
db.prepare(`
    INSERT OR IGNORE INTO queue_state
    (id, last_number, current, completed, waiting)
    VALUES (1, 0, NULL, NULL, '[]')
`).run();

// Mengambil data antrean
function loadQueueData() {
    const row = db.prepare(`
        SELECT * FROM queue_state WHERE id = 1
    `).get();

    return {
        lastNumber: row.last_number,
        current: row.current,
        completed: row.completed,
        waiting: JSON.parse(row.waiting)
    };
}

// Menyimpan data antrean
function saveQueueData(data) {
    db.prepare(`
        UPDATE queue_state
        SET last_number = ?,
            current = ?,
            completed = ?,
            waiting = ?
        WHERE id = 1
    `).run(
        data.lastNumber,
        data.current,
        data.completed,
        JSON.stringify(data.waiting)
    );
}

// Menambahkan nomor yang selesai ke riwayat
function addHistory(number) {
    db.prepare(`
        INSERT INTO queue_history (number, completed_at)
        VALUES (?, ?)
    `).run(number, new Date().toISOString());
}

// Mengambil riwayat antrean terbaru
function loadHistory(limit = 50) {
    return db.prepare(`
        SELECT
            id,
            number,
            completed_at AS completedAt
        FROM queue_history
        ORDER BY id DESC
        LIMIT ?
    `).all(limit);
}

// Mengambil statistik antrean
function loadStatistics() {
    const totalCreated = db.prepare(`
        SELECT last_number
        FROM queue_state
        WHERE id = 1
    `).get().last_number;

    const totalCompleted = db.prepare(`
        SELECT COUNT(*) AS total
        FROM queue_history
    `).get().total;

    const state = loadQueueData();

    return {
        totalCreated,
        totalCompleted,
        totalWaiting: state.waiting.length,
        totalProcessing: state.current ? 1 : 0
    };
}


// Mereset seluruh data antrean
function resetQueueData() {
    db.exec("BEGIN TRANSACTION");

    try {
        // Menghapus seluruh riwayat
        db.prepare(`
            DELETE FROM queue_history
        `).run();

        // Mengembalikan kondisi antrean ke awal
        db.prepare(`
            UPDATE queue_state
            SET last_number = 0,
                current = NULL,
                completed = NULL,
                waiting = '[]'
            WHERE id = 1
        `).run();

        db.exec("COMMIT");
    } catch (error) {
        db.exec("ROLLBACK");
        throw error;
    }
}

module.exports = {
    loadQueueData,
    saveQueueData,
    addHistory,
    loadHistory,
    loadStatistics,
    resetQueueData
};
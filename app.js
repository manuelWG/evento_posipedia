const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("better-sqlite3").verbose();
const path = require("path");

// Configuración del servidor
const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Conexión a la base de datos
const db = new sqlite3.Database("./db/database.db");

// Crear tabla si no existe
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS inscripciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        apellidos TEXT,
        email TEXT,
        empresa TEXT,
        fecha TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS fechas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT,
        cupos_disponibles INTEGER
    )`);

    // Insertar fechas iniciales
    db.run(`INSERT OR IGNORE INTO fechas (id, fecha, cupos_disponibles) VALUES
        (1, '2024-08-25', 5),
        (2, '2024-08-26', 5),
        (3, '2024-08-27', 5)
    `);
});

// Ruta para mostrar el formulario
app.get("/", (req, res) => {
    db.all(`SELECT * FROM fechas`, (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error al cargar las fechas.");
            return;
        }
        res.render("index", { fechas: rows });
    });
});

// Ruta para procesar la inscripción
app.post("/inscribir", (req, res) => {
    const { nombre, apellidos, email, empresa, fecha } = req.body;

    // Verificar si hay cupos disponibles
    db.get(
        `SELECT cupos_disponibles FROM fechas WHERE fecha = ?`,
        [fecha],
        (err, row) => {
            if (err) {
                console.error(err);
                res.status(500).send("Error al procesar la inscripción.");
                return;
            }
            if (row.cupos_disponibles > 0) {
                // Registrar inscripción y actualizar cupos
                db.run(
                    `INSERT INTO inscripciones (nombre, apellidos, email, empresa, fecha) VALUES (?, ?, ?, ?, ?)`,
                    [nombre, apellidos, email, empresa, fecha],
                    (err) => {
                        if (err) {
                            console.error(err);
                            res.status(500).send(
                                "Error al guardar la inscripción."
                            );
                            return;
                        }

                        db.run(
                            `UPDATE fechas SET cupos_disponibles = cupos_disponibles - 1 WHERE fecha = ?`,
                            [fecha],
                            (err) => {
                                if (err) {
                                    console.error(err);
                                    res.status(500).send(
                                        "Error al actualizar los cupos."
                                    );
                                    return;
                                }
                                res.redirect("/success");
                            }
                        );
                    }
                );
            } else {
                res.status(400).send(
                    "Lo siento, no hay más cupos disponibles para esta fecha."
                );
            }
        }
    );
});

// Ruta para mostrar la página de éxito
app.get("/success", (req, res) => {
    res.render("success");
});

// Iniciar el servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

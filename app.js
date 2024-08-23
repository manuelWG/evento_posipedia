const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const path = require("path");

// Configuración del servidor
const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Conexión a la base de datos PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

// Ejemplo de consulta para comprobar la conexión
pool.query("SELECT NOW()", (err, res) => {
    if (err) {
        console.error("Error ejecutando la consulta", err.stack);
    } else {
        console.log("Conexión exitosa:", res.rows[0]);
    }
});

// Crear tablas si no existen
pool.query(
    `
    CREATE TABLE IF NOT EXISTS inscripciones (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        apellidos TEXT NOT NULL,
        email TEXT NOT NULL,
        empresa TEXT,
        fecha TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fechas (
        id SERIAL PRIMARY KEY,
        fecha TEXT NOT NULL,
        cupos_disponibles INTEGER NOT NULL
    );

    -- Insertar fechas iniciales solo si no existen
    INSERT INTO fechas (fecha, cupos_disponibles) VALUES
        ('2024-08-25', 5),
        ('2024-08-26', 5),
        ('2024-08-27', 5)
    ON CONFLICT DO NOTHING;
`,
    (err) => {
        if (err) {
            console.error(
                "Error creando las tablas o insertando datos:",
                err.stack
            );
        }
    }
);

// Ruta para mostrar el formulario
app.get("/", (req, res) => {
    pool.query(`SELECT * FROM fechas`, (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send("Error al cargar las fechas.");
            return;
        }
        res.render("index", { fechas: result.rows });
    });
});
/*
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
*/

// Ruta para procesar la inscripción
app.post("/inscribir", (req, res) => {
    const { nombre, apellidos, email, empresa, fecha } = req.body;

    // Verificar si hay cupos disponibles
    pool.query(
        `SELECT cupos_disponibles FROM fechas WHERE fecha = $1`,
        [fecha],
        (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).send("Error al procesar la inscripción.");
                return;
            }

            if (result.rows[0].cupos_disponibles > 0) {
                // Registrar inscripción y actualizar cupos
                pool.query(
                    `INSERT INTO inscripciones (nombre, apellidos, email, empresa, fecha) VALUES ($1, $2, $3, $4, $5)`,
                    [nombre, apellidos, email, empresa, fecha],
                    (err) => {
                        if (err) {
                            console.error(err);
                            res.status(500).send(
                                "Error al guardar la inscripción."
                            );
                            return;
                        }

                        pool.query(
                            `UPDATE fechas SET cupos_disponibles = cupos_disponibles - 1 WHERE fecha = $1`,
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

/*
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
*/
// Ruta para mostrar la página de éxito
app.get("/success", (req, res) => {
    res.render("success");
});

// Iniciar el servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

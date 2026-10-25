const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { Pool } = require("pg");

const port = Number(process.env.DB_PORT || 5432);
const champsRequis = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const manquants = champsRequis.filter((champ) => !process.env[champ]);

if (manquants.length > 0) {
    throw new Error(`Configuration PostgreSQL manquante : ${manquants.join(", ")}`);
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT doit être un numéro de port valide.");
}

const pool = new Pool({
    host: process.env.DB_HOST,
    port,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

module.exports = pool;
const express = require("express");
const pool = require("./db");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "ecran-acceuil.html"));
});

app.get("/api/test-db", async (req, res) => {
    try {
        const resultat = await pool.query(
            "SELECT NOW() AS heure"
        );

        res.json({
            message: "Connexion PostgreSQL réussie !",
            heure: resultat.rows[0].heure
        });
    } catch (erreur) {
        console.error(erreur);
        res.status(500).json({
            message: "Erreur de connexion à la base de données."
        });
    }
});

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
    console.log(`Serveur lancé sur http://localhost:${port}`);
});
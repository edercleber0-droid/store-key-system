const express = require("express");
const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "edercleber0-droid";
const REPO_NAME = "keys-database";
const FILE_PATH = "keys.json";

async function buscarKeys() {
    try {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        const response = await fetch(url, {
            headers: { "Authorization": `token ${GITHUB_TOKEN}`, "User-Agent": "Render-App" }
        });
        if (!response.ok) return [];
        const data = await response.json();
        const conteudo = Buffer.from(data.content, 'base64').toString('utf-8');
        return JSON.parse(conteudo);
    } catch { return []; }
}

async function salvarKeys(keys) {
    try {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        const getResponse = await fetch(url, {
            headers: { "Authorization": `token ${GITHUB_TOKEN}`, "User-Agent": "Render-App" }
        });
        let sha = null;
        if (getResponse.ok) {
            const data = await getResponse.json();
            sha = data.sha;
        }
        const conteudo = Buffer.from(JSON.stringify(keys, null, 2)).toString('base64');
        const body = { message: "Update keys", content: conteudo };
        if (sha) body.sha = sha;
        await fetch(url, {
            method: "PUT",
            headers: { "Authorization": `token ${GITHUB_TOKEN}`, "Content-Type": "application/json", "User-Agent": "Render-App" },
            body: JSON.stringify(body)
        });
    } catch { }
}

app.get("/", (req, res) => { res.send("✅ KEY SYSTEM ONLINE"); });

app.get("/generate", async (req, res) => {
    const tipo = req.query.type || "perm";
    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
    let expires = null;
    if (tipo === "1d") expires = Date.now() + (86400000);
    if (tipo === "3d") expires = Date.now() + (259200000);
    
    const keys = await buscarKeys();
    keys.push({ key: codigo, tipo: tipo, expires: expires, created_at: Date.now() });
    await salvarKeys(keys);
    res.json({ key: codigo, tipo: tipo });
});

app.get("/check", async (req, res) => {
    const key = req.query.key;
    const keys = await buscarKeys();
    const found = keys.find(k => k.key === key);
    
    if (!found) return res.json({ valid: false });
    if (found.expires && Date.now() > found.expires) return res.json({ valid: false });
    
    res.json({ valid: true, tipo: found.tipo });
});

app.get("/list", async (req, res) => {
    const keys = await buscarKeys();
    res.json({ keys: keys });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Rodando na porta", PORT));
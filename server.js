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
            headers: {
                "Authorization": `token ${GITHUB_TOKEN}`,
                "User-Agent": "Render-App"
            }
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

app.get("/", (req, res) => {
    res.send("KEY SYSTEM ONLINE ✔ | 1d | 3d | perm");
});

app.get("/generate", async (req, res) => {
    const tipo = req.query.type || "perm";
    let keyType = tipo;
    
    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
    const keyString = `${codigo}`;
    
    let expires = null;
    if (tipo === "1d") {
        expires = Date.now() + (24 * 60 * 60 * 1000);
        keyType = "1d";
    } else if (tipo === "3d") {
        expires = Date.now() + (72 * 60 * 60 * 1000);
        keyType = "3d";
    } else {
        keyType = "perm";
    }
    
    const keys = await buscarKeys();
    keys.push({
        key: keyString,
        tipo: keyType,
        expires: expires,
        owner: null,
        created_at: Date.now()
    });
    await salvarKeys(keys);
    
    res.json({ key: keyString, tipo: keyType, expires: expires });
});

app.get("/check", async (req, res) => {
    const key = req.query.key;
    const userId = req.query.userId;
    
    const keys = await buscarKeys();
    const found = keys.find(k => k.key === key);
    
    if (!found) return res.json({ valid: false });
    
    const agora = Date.now();
    const expirada = found.expires !== null && agora > found.expires;
    
    if (expirada) return res.json({ valid: false, expired: true });
    
    if (!found.owner) {
        found.owner = userId;
        await salvarKeys(keys);
        return res.json({ valid: true, firstUse: true, tipo: found.tipo, expires: found.expires });
    }
    
    if (found.owner !== userId) {
        return res.json({ valid: false, reason: "used_by_other_user" });
    }
    
    res.json({ valid: true, tipo: found.tipo, expires: found.expires });
});

app.get("/list", async (req, res) => {
    const keys = await buscarKeys();
    const agora = Date.now();
    
    const keysInfo = keys.map(k => ({
        key: k.key,
        tipo: k.tipo,
        expires: k.expires,
        status: k.expires && agora > k.expires ? "EXPIRADA" : (!k.owner ? "NAO USADA" : "EM USO"),
        owner: k.owner || "Nenhum"
    }));
    
    res.json({ total: keysInfo.length, keys: keysInfo });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("SERVER RODANDO NA PORTA:", PORT));
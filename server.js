const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

// Arquivo para salvar as keys (persistente no Render com disco)
const KEYS_FILE = path.join(__dirname, "keys.json");

// Carregar keys do arquivo
function carregarKeys() {
    if (fs.existsSync(KEYS_FILE)) {
        return JSON.parse(fs.readFileSync(KEYS_FILE));
    }
    return [];
}

// Salvar keys no arquivo
function salvarKeys(keys) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

// =====================
// ENDPOINTS
// =====================

app.get("/", (req, res) => {
    res.send("KEY SYSTEM ONLINE ✔ | 1d | 3d | PERM");
});

app.get("/generate", (req, res) => {
    const tipo = req.query.type || "perm";
    
    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
    const keyString = `STORE-${codigo}-${tipo.toUpperCase()}`;
    
    let expires = null;
    if (tipo === "1d") expires = Date.now() + (24 * 60 * 60 * 1000);
    if (tipo === "3d") expires = Date.now() + (72 * 60 * 60 * 1000);
    
    const keys = carregarKeys();
    keys.push({
        key: keyString,
        tipo: tipo,
        expires: expires,
        owner: null,
        created_at: Date.now()
    });
    salvarKeys(keys);
    
    res.json({ key: keyString, tipo: tipo, expires: expires });
});

app.get("/check", (req, res) => {
    const key = req.query.key;
    const userId = req.query.userId;
    
    const keys = carregarKeys();
    const found = keys.find(k => k.key === key);
    
    if (!found) return res.json({ valid: false });
    
    const agora = Date.now();
    const expirada = found.expires !== null && agora > found.expires;
    
    if (expirada) return res.json({ valid: false, expired: true });
    
    if (!found.owner) {
        found.owner = userId;
        found.activated_at = Date.now();
        salvarKeys(keys);
        return res.json({ valid: true, firstUse: true });
    }
    
    if (found.owner !== userId) {
        return res.json({ valid: false, reason: "used_by_other_user" });
    }
    
    res.json({ valid: true });
});

app.get("/list", (req, res) => {
    const keys = carregarKeys();
    const agora = Date.now();
    
    const keysInfo = keys.map(k => ({
        key: k.key,
        tipo: k.tipo,
        status: k.expires && agora > k.expires ? "EXPIRADA" : (!k.owner ? "NAO USADA" : "EM USO"),
        owner: k.owner || "Nenhum"
    }));
    
    res.json({ total: keysInfo.length, keys: keysInfo });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("SERVER RODANDO NA PORTA:", PORT);
    console.log("KEYS SALVAS EM:", KEYS_FILE);
});
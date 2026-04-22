const express = require("express");
const fs = require("fs");

const app = express();

function formatarData(timestamp) {
    if (!timestamp) return "Nunca (Perm)";
    const data = new Date(timestamp);
    return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function calcularExpiracao(tipo) {
    const agora = Date.now();
    if (tipo === "1d") return agora + (24 * 60 * 60 * 1000);
    if (tipo === "3d") return agora + (72 * 60 * 60 * 1000);
    return null;
}

function inicializarKeys() {
    let keys = [];
    if (fs.existsSync("keys.json")) {
        try {
            const conteudo = fs.readFileSync("keys.json", "utf8");
            if (conteudo.trim() && conteudo !== "()" && conteudo !== "{}") {
                keys = JSON.parse(conteudo);
            }
        } catch (e) {}
    }
    if (keys.length === 0) {
        const agora = Date.now();
        keys = [
            { key: "DEMO-1D", tipo: "1d", expires: agora + (24 * 60 * 60 * 1000), owner: null, createdAt: agora, activatedAt: null },
            { key: "DEMO-3D", tipo: "3d", expires: agora + (72 * 60 * 60 * 1000), owner: null, createdAt: agora, activatedAt: null },
            { key: "DEMO-PERM", tipo: "perm", expires: null, owner: null, createdAt: agora, activatedAt: null }
        ];
        fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));
        console.log("[INICIO] Keys demo criadas!");
    }
}

setInterval(() => {
    if (fs.existsSync("keys.json")) {
        try {
            const keys = JSON.parse(fs.readFileSync("keys.json"));
            fs.writeFileSync("keys_backup.json", JSON.stringify(keys, null, 2));
            console.log("[BACKUP] Keys salvas!");
        } catch (e) {}
    }
}, 60 * 1000);

if (fs.existsSync("keys_backup.json") && !fs.existsSync("keys.json")) {
    const backup = fs.readFileSync("keys_backup.json");
    fs.writeFileSync("keys.json", backup);
    console.log("[RECUPERACAO] Backup restaurado!");
}

inicializarKeys();

app.get("/", (req, res) => {
    res.send("KEY SYSTEM ONLINE ✔ | 1d | 3d | PERM");
});

app.get("/check", (req, res) => {
    const key = req.query.key;
    const userId = req.query.userId;

    let keys = [];
    try {
        if (fs.existsSync("keys.json")) {
            keys = JSON.parse(fs.readFileSync("keys.json"));
        }
    } catch {
        return res.json({ valid: false });
    }

    const found = keys.find(k => k.key === key);
    if (!found) return res.json({ valid: false });

    const agora = Date.now();
    const expirada = found.expires !== null && agora > found.expires;

    if (expirada) {
        return res.json({ valid: false, expired: true });
    }

    if (!found.owner) {
        found.owner = userId;
        found.activatedAt = Date.now();
        fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));
        
        let diasRestantes = null;
        if (found.expires) {
            const diffMs = found.expires - Date.now();
            diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }
        return res.json({ valid: true, firstUse: true, expires: found.expires, dias_restantes: diasRestantes });
    }

    if (found.owner !== userId) {
        return res.json({ valid: false, reason: "used_by_other_user" });
    }

    let diasRestantes = null;
    if (found.expires) {
        const diffMs = found.expires - Date.now();
        diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }
    return res.json({ valid: true, expires: found.expires, dias_restantes: diasRestantes });
});

app.get("/generate", (req, res) => {
    const tipo = req.query.type || "perm";
    
    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
    const keyString = `STORE-${codigo}-${tipo.toUpperCase()}`;
    const expires = calcularExpiracao(tipo);
    
    const key = { key: keyString, tipo: tipo, expires: expires, owner: null, createdAt: Date.now(), activatedAt: null };
    let keys = [];
    if (fs.existsSync("keys.json")) keys = JSON.parse(fs.readFileSync("keys.json"));
    keys.push(key);
    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));
    
    console.log(`[GERADO] Key: ${keyString} - ${tipo}`);
    res.json({ key: keyString, tipo: tipo, expires: expires });
});

app.get("/list", (req, res) => {
    let keys = [];
    if (fs.existsSync("keys.json")) keys = JSON.parse(fs.readFileSync("keys.json"));
    
    const agora = Date.now();
    const keysInfo = keys.map(k => {
        let status = "ATIVA";
        if (k.expires && agora > k.expires) status = "EXPIRADA";
        else if (!k.owner) status = "NAO USADA";
        else if (k.owner && (!k.expires || agora <= k.expires)) status = "EM USO";
        return { key: k.key, tipo: k.tipo, status: status, owner: k.owner || "Nenhum" };
    });
    res.json({ total: keysInfo.length, keys: keysInfo });
});

app.get("/delete", (req, res) => {
    const keyToDelete = req.query.key;
    if (!keyToDelete) return res.json({ error: "Informe a key" });
    
    let keys = [];
    if (fs.existsSync("keys.json")) keys = JSON.parse(fs.readFileSync("keys.json"));
    const index = keys.findIndex(k => k.key === keyToDelete);
    if (index === -1) return res.json({ error: "Key nao encontrada" });
    
    const removida = keys[index];
    keys.splice(index, 1);
    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));
    
    console.log(`[DELETADO] Key: ${removida.key}`);
    res.json({ success: true, deleted: keyToDelete });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("========================================");
    console.log("KEY SYSTEM RODANDO NA PORTA:", PORT);
    console.log("========================================");
    console.log("ENDPOINTS:");
    console.log("  GET /generate?type=1d");
    console.log("  GET /generate?type=3d");
    console.log("  GET /generate?type=perm");
    console.log("  GET /list");
    console.log("  GET /delete?key=XXX");
    console.log("========================================");
});
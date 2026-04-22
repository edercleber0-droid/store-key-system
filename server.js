const express = require("express");
const fs = require("fs");

const app = express();

// =====================
// ⚙️ CONFIGURAÇÕES
// =====================

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

// INICIALIZAR KEYS PADRAO SE ARQUIVO ESTIVER VAZIO
function inicializarKeys() {
    let keys = [];
    
    if (fs.existsSync("keys.json")) {
        try {
            const conteudo = fs.readFileSync("keys.json", "utf8");
            if (conteudo.trim() && conteudo !== "()" && conteudo !== "{}") {
                keys = JSON.parse(conteudo);
            }
        } catch (e) {
            console.log("[ERRO] Falha ao ler keys.json");
        }
    }
    
    if (keys.length === 0) {
        const agora = Date.now();
        keys = [
            {
                key: "DEMO-1D",
                tipo: "1d",
                expires: agora + (24 * 60 * 60 * 1000),
                owner: null,
                createdAt: agora,
                activatedAt: null
            },
            {
                key: "DEMO-3D",
                tipo: "3d",
                expires: agora + (72 * 60 * 60 * 1000),
                owner: null,
                createdAt: agora,
                activatedAt: null
            },
            {
                key: "DEMO-PERM",
                tipo: "perm",
                expires: null,
                owner: null,
                createdAt: agora,
                activatedAt: null
            }
        ];
        fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));
        console.log("[INICIO] Keys padrao criadas!");
    }
}

// BACKUP AUTOMATICO A CADA 1 MINUTO
setInterval(() => {
    if (fs.existsSync("keys.json")) {
        try {
            const keys = JSON.parse(fs.readFileSync("keys.json"));
            fs.writeFileSync("keys_backup.json", JSON.stringify(keys, null, 2));
            console.log("[BACKUP] Keys salvas com sucesso!");
        } catch (e) {}
    }
}, 60 * 1000);

// TENTAR RECUPERAR BACKUP AO INICIAR
if (fs.existsSync("keys_backup.json") && !fs.existsSync("keys.json")) {
    const backup = fs.readFileSync("keys_backup.json");
    fs.writeFileSync("keys.json", backup);
    console.log("[RECUPERACAO] Backup restaurado!");
}

inicializarKeys();

// =====================
// 🌐 STATUS
// =====================
app.get("/", (req, res) => {
    res.send("KEY SYSTEM ONLINE ✔ | 1d | 3d | PERM");
});

// =====================
// 🔍 CHECK KEY
// =====================
app.get("/check", (req, res) => {
    const key = req.query.key;
    const userId = req.query.userId;

    let keys = [];
    try {
        if (fs.existsSync("keys.json")) {
            keys = JSON.parse(fs.readFileSync("keys.json"));
        }
    } catch {
        return res.json({ valid: false, error: "Erro interno" });
    }

    const found = keys.find(k => k.key === key);

    if (!found) {
        console.log(`[❌] Key invalida: ${key}`);
        return res.json({ valid: false, error: "Key nao encontrada" });
    }

    const agora = Date.now();
    const expirada = found.expires !== null && agora > found.expires;

    console.log(`[🔍] Key: ${found.key}`);
    console.log(`[🔍] Tipo: ${found.tipo}`);
    console.log(`[🔍] Expira: ${formatarData(found.expires)}`);
    console.log(`[🔍] Expirada: ${expirada}`);

    if (expirada) {
        return res.json({ 
            valid: false, 
            expired: true, 
            expires: found.expires,
            error: `Key expirou em ${formatarData(found.expires)}`
        });
    }

    if (!found.owner) {
        found.owner = userId;
        found.activatedAt = Date.now();
        fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));
        console.log(`[✅] Primeiro uso: ${found.key} vinculado ao user ${userId}`);
        
        let diasRestantes = null;
        if (found.expires) {
            const diffMs = found.expires - Date.now();
            diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }
        
        return res.json({ 
            valid: true, 
            firstUse: true,
            expires: found.expires,
            tipo: found.tipo,
            dias_restantes: diasRestantes
        });
    }

    if (found.owner !== userId) {
        console.log(`[🚫] Anti-share: ${found.key} tentado por user ${userId}, dono: ${found.owner}`);
        return res.json({ 
            valid: false, 
            reason: "used_by_other_user",
            error: "Esta key ja esta sendo usada por outro usuario"
        });
    }

    let diasRestantes = null;
    if (found.expires) {
        const diffMs = found.expires - Date.now();
        diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }
    
    console.log(`[✅] Key valida: ${found.key}, dias restantes: ${diasRestantes}`);
    
    return res.json({ 
        valid: true, 
        expires: found.expires,
        tipo: found.tipo,
        dias_restantes: diasRestantes
    });
});

// =====================
// 🔑 GERAR KEY (1d, 3d, perm)
// =====================
app.get("/generate", (req, res) => {
    const tipo = req.query.type || "perm";
    
    const tiposPermitidos = ["1d", "3d", "perm"];
    if (!tiposPermitidos.includes(tipo)) {
        return res.json({ error: "Tipo invalido. Use: 1d, 3d, ou perm" });
    }
    
    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
    const keyString = `STORE-${codigo}-${tipo.toUpperCase()}`;
    
    const expires = calcularExpiracao(tipo);
    
    const key = {
        key: keyString,
        tipo: tipo,
        expires: expires,
        owner: null,
        createdAt: Date.now(),
        activatedAt: null
    };

    let keys = [];
    if (fs.existsSync("keys.json")) {
        keys = JSON.parse(fs.readFileSync("keys.json"));
    }

    keys.push(key);
    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));

    console.log(`[🔑] KEY GERADA!`);
    console.log(`[🔑] Key: ${keyString}`);
    console.log(`[🔑] Tipo: ${tipo.toUpperCase()}`);
    console.log(`[🔑] Expira: ${formatarData(expires)}`);

    res.json({
        key: keyString,
        tipo: tipo,
        expires: expires,
        expires_formatado: formatarData(expires),
        createdAt: key.createdAt,
        createdAt_formatado: formatarData(key.createdAt)
    });
});

// =====================
// 📋 LISTAR KEYS
// =====================
app.get("/list", (req, res) => {
    let keys = [];
    if (fs.existsSync("keys.json")) {
        keys = JSON.parse(fs.readFileSync("keys.json"));
    }
    
    const agora = Date.now();
    
    const keysInfo = keys.map(k => {
        let status = "ATIVA";
        let expirada = false;
        
        if (k.expires && agora > k.expires) {
            status = "EXPIRADA";
            expirada = true;
        }
        if (!k.owner && !expirada) {
            status = "NAO USADA";
        }
        if (k.owner && !expirada) {
            status = "EM USO";
        }
        if (!k.expires && k.owner) {
            status = "EM USO (PERM)";
        }
        if (!k.expires && !k.owner) {
            status = "NAO USADA (PERM)";
        }
        
        return {
            key: k.key,
            tipo: k.tipo || "desconhecido",
            status: status,
            expires: k.expires ? formatarData(k.expires) : "Nunca (Perm)",
            owner: k.owner || "Nenhum",
            createdAt: formatarData(k.createdAt),
            activatedAt: k.activatedAt ? formatarData(k.activatedAt) : "Nao ativada"
        };
    });
    
    res.json({
        total: keysInfo.length,
        keys: keysInfo
    });
});

// =====================
:// 🗑️ DELETAR KEY
// =====================
app.get("/delete", (req, res) => {
    const keyToDelete = req.query.key;
    
    if (!keyToDelete) {
        return res.json({ error: "Informe a key" });
    }
    
    let keys = [];
    if (fs.existsSync("keys.json")) {
        keys = JSON.parse(fs.readFileSync("keys.json"));
    }
    
    const index = keys.findIndex(k => k.key === keyToDelete);
    
    if (index === -1) {
        return res.json({ error: "Key nao encontrada" });
    }
    
    const removida = keys[index];
    keys.splice(index, 1);
    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));
    
    console.log(`[🗑️] Key deletada: ${removida.key}`);
    
    res.json({ 
        success: true, 
        deleted: removida.key 
    });
});

// =====================
// 🚀 START SERVER
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("========================================");
    console.log("KEY SYSTEM RODANDO NA PORTA:", PORT);
    console.log("========================================");
    console.log("TIPOS DISPONIVEIS:");
    console.log("  • 1d   - Expira em 24 horas");
    console.log("  • 3d   - Expira em 72 horas");
    console.log("  • perm - NUNCA expira");
    console.log("========================================");
    console.log("ENDPOINTS:");
    console.log("  GET /generate?type=1d");
    console.log("  GET /generate?type=3d");
    console.log("  GET /generate?type=perm");
    console.log("  GET /list");
    console.log("  GET /delete?key=XXX");
    console.log("========================================");
});
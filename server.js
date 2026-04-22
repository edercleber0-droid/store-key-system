const express = require("express");
const fs = require("fs");

const app = express();

// =====================
// ⚙️ CONFIGURAÇÕES
// =====================

// Função para formatar data legivel
function formatarData(timestamp) {
    if (!timestamp) return "Nunca";
    const data = new Date(timestamp);
    return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// Função para calcular expiração (em milissegundos)
function calcularExpiracao(tipo) {
    const agora = Date.now();
    
    if (tipo === "1d") {
        // 24 horas EXATAS = 86,400,000 ms
        return agora + (24 * 60 * 60 * 1000);
    }
    if (tipo === "3d") {
        // 72 horas EXATAS = 259,200,000 ms
        return agora + (72 * 60 * 60 * 1000);
    }
    if (tipo === "perm") {
        // PERMANENTE = null (nunca expira)
        return null;
    }
    return null;
}

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

    // ⏳ VERIFICACAO DE EXPIRACAO (Só verifica se NÃO for perm)
    const agora = Date.now();
    let expirada = false;
    
    if (found.expires !== null && found.expires !== undefined) {
        expirada = agora > found.expires;
    }
    
    // Calcula horas/dias restantes para debug
    let horasRestantes = null;
    let diasRestantes = null;
    
    if (found.expires && !expirada) {
        const diffMs = found.expires - agora;
        horasRestantes = Math.floor(diffMs / (1000 * 60 * 60));
        diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    console.log(`[🔍] ========================================`);
    console.log(`[🔍] Key: ${found.key}`);
    console.log(`[🔍] Tipo: ${found.tipo || "desconhecido"}`);
    console.log(`[🔍] Criada em: ${formatarData(found.createdAt)}`);
    console.log(`[🔍] Expira em: ${formatarData(found.expires)}`);
    console.log(`[🔍] Expirada: ${expirada}`);
    if (horasRestantes) console.log(`[🔍] Horas restantes: ${horasRestantes}`);
    if (diasRestantes) console.log(`[🔍] Dias restantes: ${diasRestantes}`);
    console.log(`[🔍] Owner: ${found.owner || "Nenhum"}`);

    // KEY EXPIRADA (só se tiver expiração e tiver expirado)
    if (expirada) {
        console.log(`[❌] KEY EXPIRADA!`);
        return res.json({ 
            valid: false, 
            expired: true, 
            expires: found.expires,
            error: `Key expirou em ${formatarData(found.expires)}`
        });
    }

    // PRIMEIRO USO (vincula ao usuario)
    if (!found.owner) {
        found.owner = userId;
        found.activatedAt = Date.now();
        fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));
        
        console.log(`[✅] Primeiro uso: ${found.key} vinculado ao user ${userId}`);
        
        return res.json({ 
            valid: true, 
            firstUse: true,
            expires: found.expires,
            tipo: found.tipo,
            dias_restantes: diasRestantes
        });
    }

    // ANTI-SHARE
    if (found.owner !== userId) {
        console.log(`[🚫] Anti-share: ${found.key} tentado por user ${userId}, dono: ${found.owner}`);
        return res.json({ 
            valid: false, 
            reason: "used_by_other_user",
            error: "Esta key ja esta sendo usada por outro usuario"
        });
    }

    // KEY VALIDA
    console.log(`[✅] Key valida: ${found.key}, tipo: ${found.tipo}`);
    
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
    
    // Valida tipo permitido
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
        expires: expires,  // null = permanente
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

    console.log(`[🔑] ========================================`);
    console.log(`[🔑] KEY GERADA!`);
    console.log(`[🔑] Key: ${keyString}`);
    console.log(`[🔑] Tipo: ${tipo.toUpperCase()}`);
    console.log(`[🔑] Expira: ${formatarData(expires)}`);
    console.log(`[🔑] Criada em: ${formatarData(key.createdAt)}`);
    console.log(`[🔑] ========================================`);

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
// 📋 LISTAR KEYS (DEBUG)
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
        if (!k.owner) {
            status = "NAO USADA";
        }
        if (k.owner && !expirada) {
            status = "EM USO";
        }
        if (!k.expires) {
            status = "PERMANENTE";
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
// 🗑️ DELETAR KEY (DEBUG)
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
    console.log("EXEMPLOS DE USO:");
    console.log("  /generate?type=1d   - Gera key de 1 dia");
    console.log("  /generate?type=3d   - Gera key de 3 dias");
    console.log("  /generate?type=perm - Gera key permanente");
    console.log("  /list                - Lista todas keys");
    console.log("========================================");
});
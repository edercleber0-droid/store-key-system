const express = require("express");
const app = express();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = "edercleber0-droid";
const REPO_NAME = "keys-database";
const FILE_PATH = "keys.json";

// FUNÇÃO PARA BUSCAR KEYS COM CACHE CONTROL
async function buscarKeys() {
    try {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        const response = await fetch(url, {
            headers: {
                "Authorization": `token ${GITHUB_TOKEN}`,
                "User-Agent": "Render-App",
                "Cache-Control": "no-cache"
            }
        });
        if (!response.ok) return [];
        const data = await response.json();
        const conteudo = Buffer.from(data.content, 'base64').toString('utf-8');
        const keys = JSON.parse(conteudo);
        console.log(`[BUSCAR] ${keys.length} keys carregadas`);
        return keys;
    } catch (error) {
        console.log("[ERRO] buscarKeys:", error.message);
        return [];
    }
}

async function salvarKeys(keys) {
    try {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
        const getResponse = await fetch(url, {
            headers: { 
                "Authorization": `token ${GITHUB_TOKEN}`, 
                "User-Agent": "Render-App",
                "Cache-Control": "no-cache"
            }
        });
        let sha = null;
        if (getResponse.ok) {
            const data = await getResponse.json();
            sha = data.sha;
        }
        const conteudo = Buffer.from(JSON.stringify(keys, null, 2)).toString('base64');
        const body = { message: "Update keys", content: conteudo };
        if (sha) body.sha = sha;
        
        const putResponse = await fetch(url, {
            method: "PUT",
            headers: { 
                "Authorization": `token ${GITHUB_TOKEN}`, 
                "Content-Type": "application/json", 
                "User-Agent": "Render-App" 
            },
            body: JSON.stringify(body)
        });
        
        if (putResponse.ok) {
            console.log(`[SALVAR] ${keys.length} keys salvas`);
        } else {
            console.log("[ERRO] Salvar keys:", putResponse.status);
        }
    } catch (error) {
        console.log("[ERRO] salvarKeys:", error.message);
    }
}

app.get("/", (req, res) => {
    res.send("KEY SYSTEM ONLINE ✔ | 1d | 3d | perm");
});

app.get("/generate", async (req, res) => {
    const tipo = req.query.type || "perm";
    console.log(`[GERAR] Tipo solicitado: ${tipo}`);
    
    const codigo = Math.random().toString(36).substring(2, 10).toUpperCase();
    const keyString = `${codigo}`;
    
    let expires = null;
    let keyType = "perm";
    
    if (tipo === "1d") {
        expires = Date.now() + (24 * 60 * 60 * 1000);
        keyType = "1d";
        console.log(`[GERAR] Key 1D - Expira em: ${new Date(expires).toLocaleString()}`);
    } else if (tipo === "3d") {
        expires = Date.now() + (72 * 60 * 60 * 1000);
        keyType = "3d";
        console.log(`[GERAR] Key 3D - Expira em: ${new Date(expires).toLocaleString()}`);
    } else {
        keyType = "perm";
        console.log(`[GERAR] Key PERMANENTE`);
    }
    
    const keys = await buscarKeys();
    
    // Verifica se a key já existe (evitar duplicada)
    const existe = keys.find(k => k.key === keyString);
    if (existe) {
        return res.json({ error: "Key duplicada, tente novamente" });
    }
    
    keys.push({
        key: keyString,
        tipo: keyType,
        expires: expires,
        owner: null,
        created_at: Date.now()
    });
    await salvarKeys(keys);
    
    console.log(`[GERADO] Key: ${keyString}, Tipo: ${keyType}`);
    res.json({ key: keyString, tipo: keyType, expires: expires });
});

app.get("/check", async (req, res) => {
    const key = req.query.key;
    const userId = req.query.userId;
    
    console.log(`[CHECK] Key: ${key}, User: ${userId}`);
    
    const keys = await buscarKeys();
    const found = keys.find(k => k.key === key);
    
    if (!found) {
        console.log(`[CHECK] Key não encontrada`);
        return res.json({ valid: false });
    }
    
    console.log(`[CHECK] Key encontrada - Tipo: ${found.tipo}, Expires: ${found.expires}`);
    
    const agora = Date.now();
    const expirada = found.expires !== null && agora > found.expires;
    
    if (expirada) {
        console.log(`[CHECK] KEY EXPIRADA`);
        return res.json({ valid: false, expired: true });
    }
    
    if (!found.owner) {
        found.owner = userId;
        await salvarKeys(keys);
        console.log(`[CHECK] Primeiro uso - Owner: ${userId}`);
        return res.json({ valid: true, firstUse: true, tipo: found.tipo, expires: found.expires });
    }
    
    if (found.owner !== userId) {
        console.log(`[CHECK] Anti-share - Dono: ${found.owner}, Tentativa: ${userId}`);
        return res.json({ valid: false, reason: "used_by_other_user" });
    }
    
    console.log(`[CHECK] KEY VALIDA - Tipo: ${found.tipo}`);
    res.json({ valid: true, tipo: found.tipo, expires: found.expires });
});

app.get("/list", async (req, res) => {
    const keys = await buscarKeys();
    const agora = Date.now();
    
    const keysInfo = keys.map(k => ({
        key: k.key,
        tipo: k.tipo,
        expires: k.expires,
        expires_formatado: k.expires ? new Date(k.expires).toLocaleString() : "Nunca",
        status: k.expires && agora > k.expires ? "EXPIRADA" : (!k.owner ? "NAO USADA" : "EM USO"),
        owner: k.owner || "Nenhum"
    }));
    
    console.log(`[LIST] Total: ${keysInfo.length} keys`);
    res.json({ total: keysInfo.length, keys: keysInfo });
});

// endpoint para deletar key
app.get("/delete", async (req, res) => {
    const keyToDelete = req.query.key;
    if (!keyToDelete) return res.json({ error: "Informe a key" });
    
    let keys = await buscarKeys();
    const index = keys.findIndex(k => k.key === keyToDelete);
    if (index === -1) return res.json({ error: "Key nao encontrada" });
    
    keys.splice(index, 1);
    await salvarKeys(keys);
    
    console.log(`[DELETE] Key deletada: ${keyToDelete}`);
    res.json({ success: true, deleted: keyToDelete });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("========================================");
    console.log("SERVER RODANDO NA PORTA:", PORT);
    console.log("========================================");
});
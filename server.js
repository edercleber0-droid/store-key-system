const express = require("express");
const fs = require("fs");

const app = express();

// =====================
// 🌐 STATUS
// =====================
app.get("/", (req, res) => {
  res.send("KEY SYSTEM ONLINE ✔");
});

// =====================
// 🔍 CHECK KEY (ANTI-SHARE + EXPIRAÇÃO)
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
    return res.json({ valid: false });
  }

  const found = keys.find(k => k.key === key);

  if (!found) return res.json({ valid: false });

  // ⏳ EXPIRAÇÃO
  if (found.expires && Date.now() > found.expires) {
    return res.json({ valid: false, expired: true });
  }

  // 🔒 PRIMEIRO USO BLOQUEIA NO USER
  if (!found.owner) {
    found.owner = userId;
    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));

    return res.json({ valid: true, firstUse: true });
  }

  // 🚫 ANTI-SHARE
  if (found.owner !== userId) {
    return res.json({ valid: false, reason: "used_by_other_user" });
  }

  return res.json({ valid: true });
});

// =====================
// 🔑 GERAR KEY (MANUAL OU URL)
// =====================
app.get("/generate", (req, res) => {
  const type = req.query.type || "perm";

  const base = "STORE-" + Math.random().toString(36).substring(2, 10).toUpperCase();

  let expires = null;

  if (type === "1d") expires = Date.now() + 86400000;
  if (type === "3d") expires = Date.now() + 259200000;

  const key = {
    key: base + "-" + type.toUpperCase(),
    expires,
    owner: null
  };

  let keys = [];

  if (fs.existsSync("keys.json")) {
    keys = JSON.parse(fs.readFileSync("keys.json"));
  }

  keys.push(key);
  fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2));

  res.json(key);
});

// =====================
// 🚀 START SERVER
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("KEY SYSTEM RODANDO NA PORTA:", PORT);
});
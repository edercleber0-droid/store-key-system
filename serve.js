const express = require("express");
const fs = require("fs");

const app = express();

// =====================
// 🌐 LIVE CHECK (RENDER)
// =====================
app.get("/", (req, res) => {
  res.send("🔑 STORE KEY SYSTEM ONLINE ✔");
});

// =====================
// 🔍 CHECK KEY
// =====================
app.get("/check", (req, res) => {
  const key = req.query.key;

  let keys = [];

  try {
    if (fs.existsSync("keys.json")) {
      keys = JSON.parse(fs.readFileSync("keys.json"));
    }
  } catch (e) {
    return res.json({ valid: false });
  }

  const found = keys.find(k => k.key === key);

  if (!found) {
    return res.json({ valid: false });
  }

  if (found.expires && Date.now() > found.expires) {
    return res.json({ valid: false, expired: true });
  }

  return res.json({ valid: true });
});

// =====================
// 🚀 START SERVER
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🔑 KEY SYSTEM RODANDO NA PORTA:", PORT);
});
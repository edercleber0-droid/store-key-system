const express = require("express");
const fs = require("fs");

const app = express();

app.get("/", (req, res) => {
  res.send("KEY SYSTEM ONLINE");
});

app.get("/check", (req, res) => {
  let keys = [];

  try {
    if (fs.existsSync("keys.json")) {
      const data = fs.readFileSync("keys.json", "utf8");
      keys = data ? JSON.parse(data) : [];
    }
  } catch (e) {
    return res.json({ valid: false });
  }

  const key = req.query.key;
  const found = keys.find(k => k.key === key);

  if (!found) return res.json({ valid: false });

  if (found.expires && Date.now() > found.expires) {
    return res.json({ valid: false, expired: true });
  }

  return res.json({ valid: true });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("KEY SYSTEM ONLINE PORT:", PORT);
});
const express = require("express");
const fs = require("fs");

const app = express();

app.get("/", (req, res) => {
  res.send("API online");
});

// CHECK KEY
app.get("/check", (req, res) => {
  const key = req.query.key;

  let keys = [];
  if (fs.existsSync("keys.json")) {
    keys = JSON.parse(fs.readFileSync("keys.json"));
  }

  const found = keys.find(k => k.key === key);

  if (!found) return res.json({ valid: false });

  if (found.expires && Date.now() > found.expires) {
    return res.json({ valid: false, expired: true });
  }

  return res.json({ valid: true });
});

app.listen(3000, () => console.log("API ON"));
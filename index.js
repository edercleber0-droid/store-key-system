const express = require("express");
const app = express();

// 🔑 banco simples em memória (depois pode evoluir)
const keys = new Set([
  "STORE-ABC123",
  "STORE-XYZ999"
]);

app.get("/", (req, res) => {
  res.send("Key API Online");
});

// validação de key
app.get("/validate/:key", (req, res) => {
  const key = req.params.key;

  if (keys.has(key)) {
    return res.json({ valid: true });
  }

  return res.json({ valid: false });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("API rodando");
});

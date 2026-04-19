const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();

// ======================
// 🌐 SERVIDOR (RENDER)
// ======================
app.get("/", (req, res) => {
  res.send("Servidor OK - Key System Online");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Servidor rodando");
});

// ======================
// 🤖 DISCORD BOT
// ======================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// anti-crash login
client.login("SEU_TOKEN_AQUI").catch(err => {
  console.log("❌ ERRO NO TOKEN:", err);
});

// ======================
// 🔑 KEY SYSTEM SIMPLES
// ======================
const usedTickets = new Set();

function generateKey() {
  return "STORE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

client.on("messageCreate", (msg) => {
  if (!msg.channel.name.startsWith("ticket")) return;

  const ticketId = msg.channel.id;

  if (usedTickets.has(ticketId)) {
    msg.channel.send("❌ Ticket já processado.");
    return;
  }

  const text = msg.content.toLowerCase();

  if (text.includes("pago") || msg.attachments.size > 0) {

    const key = generateKey();

    usedTickets.add(ticketId);

    msg.channel.send(
      "✔ Pagamento recebido\n🔑 KEY: " + key + "\n⏳ Expira em 24h"
    );
  }
});

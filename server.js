const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// tickets já usados (anti-fraude simples)
const usedTickets = new Set();

// gera KEY
function generateKey() {
  return "STORE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

client.on("messageCreate", (msg) => {
  if (!msg.channel.name.startsWith("ticket")) return;

  const ticketId = msg.channel.id;

  // bloqueia ticket reutilizado
  if (usedTickets.has(ticketId)) {
    msg.channel.send("❌ Esse ticket já foi processado.");
    return;
  }

  const content = msg.content.toLowerCase();

  // detecta comprovante (texto ou imagem)
  if (content.includes("pago") || msg.attachments.size > 0) {

    const key = generateKey();

    usedTickets.add(ticketId);

    msg.channel.send(
      "✔ Comprovante recebido\n🔑 SUA KEY: " + key + "\n⏳ Expira em 24h"
    );
  }
});

client.login("SEU_BOT_TOKEN_AQUI");

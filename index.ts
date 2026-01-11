import {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { fileURLToPath } from "url";

import path from "path";

import fs from "fs";

import { token, site, googleApiKey } from "./config.json";

import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = googleApiKey;

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});
/* ---------------- PATH ---------------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------------- CLIENT ---------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

/* ---------------- COMMAND REGISTRY ---------------- */

type SlashCommand = {
  data: { name: string };
  execute: (interaction: Interaction) => Promise<void>;
};

client.commands = new Collection<string, SlashCommand>();

/* ---------------- LOAD COMMANDS ---------------- */

async function loadCommands() {
  const commandsDir = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsDir)) return;

  for (const folder of fs.readdirSync(commandsDir)) {
    const folderPath = path.join(commandsDir, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    for (const file of fs.readdirSync(folderPath)) {
      if (!file.endsWith(".js") && !file.endsWith(".ts")) continue;

      const filePath = path.join(folderPath, file);
      const mod = await import(filePath);
      const command: SlashCommand = mod.default ?? mod;

      if (!command?.data?.name || !command.execute) continue;
      client.commands.set(command.data.name, command);
    }
  }

  console.log(`Loaded ${client.commands.size} slash commands`);
}

/* ---------------- READY ---------------- */

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user?.tag}`);
  await loadCommands();
});

/* ---------------- INTERACTION HANDLER ---------------- */
/**
 * RULE:
 * - main NEVER replies
 * - commands ALWAYS defer + edit
 */

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error("Command crash:", err);

    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply("❌ Internal error.");
    }
  }
});
//makabhosda aag

client.on("messageCreate", async (message) => {
  // Ignore bot messages

  if (message.author.bot) return;

  // Check if the bot is mentioned

  if (message.mentions.has(client.user)) {
    try {
      // Generate ai response

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",

        contents: `Reply casually in Hinglish to this message ,maintain respect but use moderate amount of slangs , only give the reply dont extend messages,if the message ends with be respectful, answer in formal english, get the tone of the message , if the message is loving or respectful , dont use slangs : "${message.content}"; also if someone replies too often, then reply with:"terimakichu padhle"`,
      });

      //use slang (the worst ones too), the reciever is my friend

      // Send the AI response

      await message.reply(response.text);

      // await message.react("");

      await message.react("<:allen:1459539003094208613>");

      await message.react("<:pwlogo:1457684089212506302>");
    } catch (err) {
      console.error("AI error:", err);

      await message.reply(" Try again later.");
    }
  }
});

/* ---------------- MEMBER JOIN ---------------- */

client.on(Events.GuildMemberAdd, async (member) => {
  const channel = member.guild.channels.cache.find(
    (c): c is TextChannel => c.name === "📜join-log" && c.isTextBased(),
  );
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("WELCOME")
    .setColor(0x5865f2)
    .setDescription(`**${member.user.username.toUpperCase()}**`)
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  await channel.send({ content: `hi <@${member.id}>`, embeds: [embed] });
});
// ---------------- MEMBER LEAVE ----------------

client.on(Events.GuildMemberRemove, async (member) => {
  console.log(`Member left: ${member.user.tag}`);

  const channel = member.guild.channels.cache.find(
    (ch): ch is TextChannel => ch.name === "😭they-left" && ch.isTextBased(),
  );

  if (!channel) return;

  await channel.send(`<@${member.user.id}> has left the server.`);
});
/* ---------------- LOGIN ---------------- */

client.login(token);

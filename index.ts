import {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
  TextChannel,
  EmbedBuilder,
  Interaction,
} from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { token } from "./config.json";

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

/* ---------------- LOGIN ---------------- */

client.login(token);

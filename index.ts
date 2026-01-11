import {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import path from "path";
import fs from "fs";
import { token, site, googleApiKey } from "./config.json";
import { GoogleGenAI } from "@google/genai";
const GEMINI_API_KEY = googleApiKey;
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

// ---------------- CLIENT ----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // REQUIRED
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ---------------- READY ----------------
client.once(Events.ClientReady, () => {
  console.log(`Ready! Logged in as ${client.user?.tag}`);
});

// ---------------- MESSAGE COMMANDS ----------------
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content === "bw!lodaLassan") {
    await message.reply("kam karra mewderchod <:pwlogo:1457684089212506302>!");
  }

  if (message.content === "bw!site ping kar lodu") {
    await message.reply("<:pwlogo:1457684089212506302>! ruk karra");
    await message.react("<:pwlogo:1457684089212506302>");

    try {
      const res = await fetch(site);
      await message.reply(
        res.ok ? "site status: 200 OK" : "site not responding",
      );
    } catch {
      await message.reply("site not responding");
    }
  }

  if (message.content === "bw!tryme") {
    await message.reply(
      `dear ${message.author.displayName}, click here -> ||padhle mewderchod||<:pwlogo:1457684089212506302>!`,
    );
    await message.react("<:allen:1459539003094208613>");
    await message.react("<:pwlogo:1457684089212506302>");
  }
});

// ---------------- MEMBER JOIN ----------------
client.on(Events.GuildMemberAdd, async (member) => {
  console.log(`New member joined: ${member.user.tag}`);

  const channel = member.guild.channels.cache.find(
    (ch): ch is TextChannel => ch.name === "📜join-log" && ch.isTextBased(),
  );

  if (!channel) return;

  const color =
    member.displayHexColor === (member.displayColor as unknown as string)
      ? 0x5865f2
      : member.displayHexColor;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle("WELCOME")
    .setDescription(`**${member.user.username.toUpperCase()}**`)
    .setAuthor({
      name: `Welcome ${member.user.username}`,
      iconURL: member.user.displayAvatarURL({ size: 128 }),
    })
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `Welcome to ${member.guild.name}` })
    .setImage("https://miro.medium.com/1*l2fG_S9aIAV8ZOLiVoqB5Q.gif")
    .setTimestamp();

  await channel.send({
    content: `hi <@${member.id}>, drop your backlogs at <#1457979385746292787>`,
    embeds: [embed],
  });
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

// ---------------- SLASH COMMAND LOADER ----------------
(client as any).commands = new Collection();

const foldersPath = path.join(__dirname, "commands");
if (fs.existsSync(foldersPath)) {
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".ts"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      if ("data" in command && "execute" in command) {
        (client as any).commands.set(command.data.name, command);
      }
    }
  }
}

// ---------------- SLASH COMMAND EXEC ----------------
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = (client as any).commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "Something broke.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "Something broke.",
        ephemeral: true,
      });
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
      await message.react("<:allen:1459539003094208613>");
      await message.react("<:pwlogo:1457684089212506302>");
    } catch (err) {
      console.error("AI error:", err);
      await message.reply(" Try again later.");
    }
  }
});
//---------------------------------
const addRolesCmd = require("./commands/admin/add-roles");

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isModalSubmit()) {
    if (addRolesCmd.handleModal) {
      await addRolesCmd.handleModal(interaction);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = (client as any).commands.get(interaction.commandName);
  if (!command) return;

  await command.execute(interaction);
});

// ---------------- LOGIN ----------------
client.login(token);

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { REST, Routes } from "discord.js";
import { token, clientId, guildId } from "./config.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands: any[] = [];

async function walk(dir: string) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    // ⚠️ REGISTER FROM JS ONLY IF COMPILED
    if (!entry.endsWith(".ts")) continue;

    const mod = await import(pathToFileURL(fullPath).href);
    const cmd = mod.default ?? mod;

    if (!cmd?.data) continue;

    commands.push(cmd.data.toJSON());
  }
}

await walk(path.join(__dirname, "commands"));

console.log(`📤 Registering ${commands.length} commands`);

const rest = new REST({ version: "10" }).setToken(token);

await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
  body: commands,
});

console.log("✅ Guild slash commands registered");

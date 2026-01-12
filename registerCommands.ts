import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Collection } from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadCommands(client: any) {
  client.commands = new Collection();

  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) return;

  for (const folder of fs.readdirSync(commandsPath)) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    for (const file of fs.readdirSync(folderPath)) {
      if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;

      const filePath = path.join(folderPath, file);
      const mod = await import(pathToFileURL(filePath).href);
      const command = mod.default ?? mod;

      if (!command?.data?.name || !command.execute) continue;

      client.commands.set(command.data.name, command);
    }
  }

  console.log(`✅ Loaded ${client.commands.size} commands`);
}

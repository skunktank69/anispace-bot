import { REST, Routes } from "discord.js";
import { token, clientId, guildId } from "./config.json"; // add guildId if you want guild commands cleared

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("⚠️ Clearing all guild commands...");

    // Clear all guild commands
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: [],
      });
      console.log("✅ All guild commands cleared!");
    }

    console.log("⚠️ Clearing all global commands...");

    // Clear all global commands
    await rest.put(Routes.applicationCommands(clientId), {
      body: [],
    });
    console.log("✅ All global commands cleared!");

    console.log("🎉 Done. Your bot now has no registered slash commands.");
  } catch (err) {
    console.error("❌ Error clearing commands:", err);
  }
})();

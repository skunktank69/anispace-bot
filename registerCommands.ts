const fs = require("fs");
const path = require("path");

// Path to your commands folder
const foldersPath = path.join(__dirname, "commands");
if (!fs.existsSync(foldersPath)) {
  console.error("Commands folder not found!");
  process.exit(1);
}

const commandFolders = fs.readdirSync(foldersPath);

const allCommands = [];
const nameMap = {}; // { commandName: [filenames] }

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  if (!fs.existsSync(commandsPath)) continue;

  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    const cmd = command.default ?? command; // support TS ESM default export

    if ("data" in cmd && "execute" in cmd) {
      const name = cmd.data.name;
      allCommands.push({ name, file });

      if (!nameMap[name]) nameMap[name] = [];
      nameMap[name].push(file);
    }
  }
}

// ---------------- LOG ALL COMMANDS ----------------
console.log("📜 All loaded commands:");
for (const cmd of allCommands) {
  console.log(`- ${cmd.name} (from ${cmd.file})`);
}

// ---------------- LOG DUPLICATES ----------------
const duplicates = Object.entries(nameMap).filter(
  ([name, files]) => files.length > 1,
);

if (duplicates.length > 0) {
  console.warn("\n⚠️ Duplicate command names detected:");
  for (const [name, files] of duplicates) {
    console.warn(`- ${name} found in files: ${files.join(", ")}`);
  }
} else {
  console.log("\n✅ No duplicate command names found!");
}

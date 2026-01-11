import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("join-all-nighter")
  .setDescription("Join any currently active all-nighter role");

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({
      content: "❌ This command can only be used in a server.",
      ephemeral: true,
    });
  }

  const member = interaction.member;

  // Find all currently active all-nighter roles
  const allNighterRoles = interaction.guild.roles.cache.filter((r) =>
    r.name.toLowerCase().includes("all-nighter"),
  );

  if (allNighterRoles.size === 0) {
    return interaction.reply({
      content: "❌ No all-nighter is scheduled for today yet.",
      ephemeral: true,
    });
  }

  let addedCount = 0;

  for (const role of allNighterRoles.values()) {
    if (!member.roles.cache.has(role.id)) {
      try {
        await member.roles.add(role);
        addedCount++;
      } catch {
        // Ignore roles we can't add
      }
    }
  }

  if (addedCount === 0) {
    return interaction.reply({
      content: "⚠️ You’re already in all active all-nighter roles!",
      ephemeral: true,
    });
  }

  return interaction.reply({
    content: `✅ <@${member.id}> has joined ${addedCount} active all-nighter role(s)!}`,
  });
}

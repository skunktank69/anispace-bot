import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionsBitField,
  MessageFlags,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("Timeout a user")
  .addUserOption((option) =>
    option
      .setName("target")
      .setDescription("The user to timeout")
      .setRequired(true),
  )
  .addIntegerOption(
    (option) =>
      option
        .setName("time")
        .setDescription("Timeout duration (in seconds)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(2419200), // 28 days, Discord hard limit
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.member;
  const member = interaction.options.getMember("target");
  const time = interaction.options.getInteger("time");

  if (!user || !member || !time) {
    return interaction.reply({
      content: "Invalid input.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const hasRole = user.roles.cache.has("1457641203611992158");
  const isAdmin = user.permissions.has(PermissionsBitField.Flags.Administrator);

  // Block ONLY if neither mod nor admin
  if (!hasRole && !isAdmin) {
    return interaction.reply({
      content: "You need to be a mod or admin to timeout a user!",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!member.moderatable) {
    return interaction.reply({
      content: "I can't timeout this user due to role hierarchy.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Discord expects milliseconds
  await member.timeout(time * 1000);

  return interaction.reply({
    content: `<:pwlogo:1457684089212506302>
--------------------------
Timed out **@${member.displayName}** for **${time} seconds**`,
  });
}

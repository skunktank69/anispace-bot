import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionsBitField,
  MessageFlags,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("Kick a selected user")
  .addUserOption((option) =>
    option
      .setName("target")
      .setDescription("The user to kick")
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const user = interaction.member;
  const member = interaction.options.getMember("target");

  if (!user || !member) {
    return interaction.reply({
      content: "Invalid member.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const hasRole = user.roles.cache.has("1457641203611992158");
  const isAdmin = user.permissions.has(PermissionsBitField.Flags.Administrator);

  // Block ONLY if neither mod nor admin
  if (!hasRole && !isAdmin) {
    return interaction.reply({
      content: "You need to be a mod or admin to kick a user!",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!member.kickable) {
    return interaction.reply({
      content: "I can't kick this user due to role hierarchy.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await member.kick();

  return interaction.reply({
    content: `<:pwlogo:1457684089212506302>\n --------------------------\n kicked user **${member.displayName}**`,
    // flags: MessageFlags.Ephemeral,
  });
}

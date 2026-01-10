const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("temp-role")
    .setDescription("Create a temporary role that auto-deletes after a timeout")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Base name of the role")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration in minutes before role is deleted")
        .setRequired(true)
        .setMinValue(1),
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to assign the role to")
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const baseName = interaction.options.getString("name", true);
    const durationMinutes = interaction.options.getInteger("duration", true);
    const user = interaction.options.getUser("user", true);

    const me = interaction.guild.members.me;
    if (!me) {
      return interaction.editReply("❌ Bot member not found.");
    }

    // ---- DATE FORMAT: DD/MM/YY ----
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    const dateTag = `${dd}/${mm}/${yy}`;

    const roleName = `${baseName} (${dateTag})`;

    // ---- CREATE ROLE ----
    let role;
    try {
      role = await interaction.guild.roles.create({
        name: roleName,
        reason: `Temporary role created by ${interaction.user.tag}`,
      });
    } catch {
      return interaction.editReply("❌ Failed to create role.");
    }

    // ---- HIERARCHY CHECK ----
    if (role.position >= me.roles.highest.position) {
      await role.delete().catch(() => {});
      return interaction.editReply(
        "❌ Role is above my highest role. Move my role higher.",
      );
    }

    // ---- ASSIGN ROLE ----
    try {
      const member = await interaction.guild.members.fetch(user.id);
      await member.roles.add(role);
    } catch {
      await role.delete().catch(() => {});
      return interaction.editReply("❌ Failed to assign role to user.");
    }

    const durationMs = durationMinutes * 60 * 1000;

    // ---- SCHEDULE DELETION ----
    setTimeout(async () => {
      try {
        await role.delete(
          `Temporary role expired after ${durationMinutes} minutes`,
        );
      } catch {
        // role already deleted or bot restarted
      }
    }, durationMs);

    await interaction.editReply(
      `✅ Created role **${roleName}** and assigned it to ${user.tag}\n` +
        `⏳ This role will be deleted in **${durationMinutes} minutes**.`,
    );
  },
};

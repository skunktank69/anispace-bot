const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  GuildMember,
} = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("add-roles")
    .setDescription("Add multiple roles to multiple users (dynamic)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId("add_roles_modal")
      .setTitle("Add Roles to Users");

    const usersInput = new TextInputBuilder()
      .setCustomId("users")
      .setLabel("Users (mentions or IDs)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("@user1 @user2 or 123 456")
      .setRequired(true);

    const rolesInput = new TextInputBuilder()
      .setCustomId("roles")
      .setLabel("Roles (mentions or IDs)")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("@role1 @role2 or 789 012")
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(usersInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(rolesInput),
    );

    await interaction.showModal(modal);
  },
};

// -------- MODAL HANDLER --------
module.exports.handleModal = async (interaction: Interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== "add_roles_modal") return;
  if (!interaction.guild) return;

  await interaction.deferReply({ ephemeral: true });

  const usersRaw = interaction.fields.getTextInputValue("users");
  const rolesRaw = interaction.fields.getTextInputValue("roles");

  const extractIds = (text: string) =>
    [...text.matchAll(/\d{17,20}/g)].map((m) => m[0]);

  const userIds = extractIds(usersRaw);
  const roleIds = extractIds(rolesRaw);

  if (!userIds.length || !roleIds.length) {
    return interaction.editReply(
      "No valid users or roles detected. Use mentions or IDs.",
    );
  }

  const me = interaction.guild.members.me!;
  const results: string[] = [];

  for (const userId of userIds) {
    let member: GuildMember | null = null;

    try {
      member = await interaction.guild.members.fetch(userId);
    } catch {
      results.push(`User not found: ${userId}`);
      continue;
    }

    for (const roleId of roleIds) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        results.push(`Role not found: ${roleId}`);
        continue;
      }

      if (role.position >= me.roles.highest.position) {
        results.push(
          `Cannot assign **${role.name}** to ${member.user.tag} (hierarchy)`,
        );
        continue;
      }

      try {
        await member.roles.add(role);
        results.push(`Added **${role.name}** → ${member.user.tag}`);
      } catch {
        results.push(`Failed to add **${role.name}** → ${member.user.tag}`);
      }
    }
  }

  await interaction.editReply(results.slice(0, 50).join("\n"));
};

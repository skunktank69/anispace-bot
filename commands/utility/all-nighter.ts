const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("all-nighter")
    .setDescription("Temporary role + private VC & chat with expiry")
    .addIntegerOption((opt) =>
      opt
        .setName("hours")
        .setDescription("Duration in hours (1–24)")
        .setMinValue(1)
        .setMaxValue(24)
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("users")
        .setDescription(
          "Mentions or IDs (space separated). Leave empty for yourself.",
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    if (!interaction.guild) return;

    // 🔒 HARD GUARD — this is the fix
    if (interaction.deferred || interaction.replied) return;

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const botMember = guild.members.me;
    if (!botMember) return interaction.editReply("❌ Bot member not resolved.");

    const hours = interaction.options.getInteger("hours");
    const rawUsers = interaction.options.getString("users");

    const userIds = new Set();
    if (rawUsers) {
      rawUsers
        .split(/\s+/)
        .map((x) => x.replace(/[<@!>]/g, ""))
        .filter((x) => /^\d{17,20}$/.test(x))
        .forEach((id) => userIds.add(id));
    }
    if (!userIds.size) userIds.add(interaction.user.id);

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);

    const roleName = `all nighter paglu (${dd}/${mm}/${yy})`;
    const shortTag = `${dd}${mm}`;

    let role, textChannel, voiceChannel;

    try {
      role =
        guild.roles.cache.find((r) => r.name === roleName) ??
        (await guild.roles.create({ name: roleName }));

      if (role.position >= botMember.roles.highest.position)
        throw new Error("ROLE_TOO_HIGH");

      let category =
        guild.channels.cache.find(
          (c) =>
            c.name === "private-vc" && c.type === ChannelType.GuildCategory,
        ) ??
        (await guild.channels.create({
          name: "private-vc",
          type: ChannelType.GuildCategory,
        }));

      const overwrites = [
        { id: guild.id, deny: ["ViewChannel"] },
        { id: role.id, allow: ["ViewChannel", "Connect", "SendMessages"] },
      ];

      textChannel =
        guild.channels.cache.find(
          (c) => c.name === `all-nighter-chat-${shortTag}`,
        ) ??
        (await guild.channels.create({
          name: `all-nighter-chat-${shortTag}`,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: overwrites,
        }));

      voiceChannel =
        guild.channels.cache.find(
          (c) => c.name === `all-nighter-vc-${shortTag}`,
        ) ??
        (await guild.channels.create({
          name: `all-nighter-vc-${shortTag}`,
          type: ChannelType.GuildVoice,
          parent: category.id,
          permissionOverwrites: overwrites,
        }));

      let assigned = 0;
      for (const id of userIds) {
        try {
          const m = await guild.members.fetch(id);
          if (!m.roles.cache.has(role.id)) {
            await m.roles.add(role);
            assigned++;
          }
        } catch {}
      }

      if (!assigned) throw new Error("NO_USERS");

      await interaction.editReply(
        `🌙 **All-nighter live**\n` +
          `👥 Users: **${assigned}**\n` +
          `⏳ Duration: **${hours}h**\n` +
          `🔒 ${textChannel} | ${voiceChannel}`,
      );

      setTimeout(async () => {
        try {
          const members = await guild.members.fetch();
          for (const m of members.values())
            if (m.roles.cache.has(role.id))
              await m.roles.remove(role).catch(() => {});
          if (textChannel?.deletable)
            await textChannel.delete().catch(() => {});
          if (voiceChannel?.deletable)
            await voiceChannel.delete().catch(() => {});
          if (role?.editable) await role.delete().catch(() => {});
        } catch {}
      }, hours * 3600000);
    } catch (err) {
      if (interaction.replied)
        await interaction.editReply("❌ All-nighter setup failed.");
    }
  },
};

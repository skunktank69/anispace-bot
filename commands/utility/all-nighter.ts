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
        )
        .setRequired(false),
    )

    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    if (!interaction.guild) return;
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const botMember = guild.members.me;
    if (!botMember) {
      return interaction.editReply("❌ Bot member not resolved.");
    }

    // ---------- USERS ----------
    const rawUsers = interaction.options.getString("users");
    const hours = interaction.options.getInteger("hours");

    const userIds = new Set();

    if (rawUsers) {
      rawUsers
        .split(/\s+/)
        .map((x) => x.replace(/[<@!>]/g, ""))
        .filter((x) => /^\d{17,20}$/.test(x))
        .forEach((id) => userIds.add(id));
    }

    if (userIds.size === 0) userIds.add(interaction.user.id);

    // ---------- DATE ----------
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);

    const dateTag = `${dd}/${mm}/${yy}`;
    const shortTag = `${dd}${mm}`;

    const roleName = `all nighter paglu (${dateTag})`;
    const textName = `all-nighter-chat-${shortTag}`;
    const voiceName = `all-nighter-vc-${shortTag}`;

    let role = null;
    let textChannel = null;
    let voiceChannel = null;

    try {
      // ---------- ROLE (REUSE IF EXISTS) ----------
      role = guild.roles.cache.find((r) => r.name === roleName);

      if (!role) {
        role = await guild.roles.create({
          name: roleName,
          reason: `All-nighter by ${interaction.user.tag}`,
        });
      }

      if (role.position >= botMember.roles.highest.position) {
        throw new Error("ROLE_TOO_HIGH");
      }

      // ---------- CATEGORY ----------
      let category = guild.channels.cache.find(
        (c) => c.name === "private-vc" && c.type === ChannelType.GuildCategory,
      );

      if (!category) {
        category = await guild.channels.create({
          name: "private-vc",
          type: ChannelType.GuildCategory,
        });
      }

      if (!category) throw new Error("CATEGORY_FAILED");

      // ---------- PERMISSIONS ----------
      const overwrites = [
        { id: guild.id, deny: ["ViewChannel"] },
        {
          id: role.id,
          allow: ["ViewChannel", "Connect", "SendMessages"],
        },
      ];

      // ---------- TEXT CHANNEL ----------
      textChannel = guild.channels.cache.find(
        (c) =>
          c.parentId === category.id &&
          c.type === ChannelType.GuildText &&
          c.name === textName,
      );

      if (!textChannel) {
        textChannel = await guild.channels.create({
          name: textName,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: overwrites,
        });
      }

      // ---------- VOICE CHANNEL ----------
      voiceChannel = guild.channels.cache.find(
        (c) =>
          c.parentId === category.id &&
          c.type === ChannelType.GuildVoice &&
          c.name === voiceName,
      );

      if (!voiceChannel) {
        voiceChannel = await guild.channels.create({
          name: voiceName,
          type: ChannelType.GuildVoice,
          parent: category.id,
          permissionOverwrites: overwrites,
        });
      }

      // ---------- ASSIGN ROLE ----------
      let assigned = 0;
      for (const id of userIds) {
        try {
          const member = await guild.members.fetch(id);
          if (!member.roles.cache.has(role.id)) {
            await member.roles.add(role);
            assigned++;
          }
        } catch {}
      }

      if (assigned === 0) {
        throw new Error("NO_VALID_USERS");
      }

      // ---------- EXPIRY ----------
      const durationMs = hours * 60 * 60 * 1000;

      setTimeout(async () => {
        try {
          const members = await guild.members.fetch();

          for (const m of members.values()) {
            if (m.roles.cache.has(role.id)) {
              await m.roles.remove(role).catch(() => {});
            }
          }

          if (textChannel?.deletable)
            await textChannel.delete().catch(() => {});
          if (voiceChannel?.deletable)
            await voiceChannel.delete().catch(() => {});
          if (role?.editable) await role.delete().catch(() => {});
        } catch {}
      }, durationMs);

      await interaction.editReply(
        `🌙 **All-nighter live**\n` +
          `👥 Users added: **${assigned}**\n` +
          `⏳ Duration: **${hours}h**\n` +
          `🔒 Channels: ${textChannel} & ${voiceChannel}`,
      );
    } catch (err) {
      const msg =
        err.message === "ROLE_TOO_HIGH"
          ? "❌ My role is too low in hierarchy."
          : err.message === "NO_VALID_USERS"
            ? "❌ No valid users found."
            : "❌ Failed to set up all-nighter.";

      await interaction.editReply(msg);
    }
  },
};

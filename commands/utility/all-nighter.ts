import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ChatInputCommandInteraction,
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("all-nighter")
    .setDescription("Temporary role + private VC & chat")
    .addIntegerOption((o) =>
      o
        .setName("hours")
        .setDescription("Duration (1–24)")
        .setMinValue(1)
        .setMaxValue(24)
        .setRequired(true),
    )
    .addStringOption((o) =>
      o.setName("users").setDescription("Mentions or IDs (space separated)"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply();

    const guild = interaction.guild;
    const hours = interaction.options.getInteger("hours", true);
    const rawUsers = interaction.options.getString("users");
    const invokedChannel = interaction.channel;

    /* ===============================
       LOG CHANNEL SETUP
    ================================ */

    let logChannel = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildText && c.name === "all-nighter-logs",
    );

    if (!logChannel) {
      logChannel = await guild.channels.create({
        name: "all-nighter-logs",
        type: ChannelType.GuildText,
        reason: "Auto-created for all-nighter logging",
      });
    }

    const log = async (msg: string) => {
      await logChannel!.send(msg).catch(() => {});
      if (invokedChannel?.isTextBased())
        await invokedChannel.send(msg).catch(() => {});
    };

    /* ===============================
       USER PARSING (DEDUPED)
    ================================ */

    const ids = new Set<string>();

    if (rawUsers) {
      rawUsers
        .split(/\s+/)
        .map((x) => x.replace(/[<@!>]/g, ""))
        .filter((x) => /^\d{17,20}$/.test(x))
        .forEach((x) => ids.add(x));
    }

    if (!ids.size) ids.add(interaction.user.id);

    /* ===============================
       ROLE + CHANNEL NAMING
    ================================ */

    const date = new Date();
    const tag = `${date.getDate()}${date.getMonth() + 1}`;

    const roleName = `all-nighter-paglu-${tag}`;
    const textName = `all-nighter-${tag}`;
    const voiceName = `all-nighter-vc-${tag}`;

    /* ===============================
       ROLE SETUP
    ================================ */

    let role = guild.roles.cache.find((r) => r.name === roleName);
    if (!role) {
      role = await guild.roles.create({
        name: roleName,
        reason: "All-nighter started",
      });

      await log(`🆕 Created role **${roleName}**`);
    }

    /* ===============================
       CATEGORY SETUP
    ================================ */

    let category = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildCategory &&
        c.name.toLowerCase() === "private-vc",
    );

    if (!category) {
      category = await guild.channels.create({
        name: "private-vc",
        type: ChannelType.GuildCategory,
      });

      await log("📁 Created category **private-vc**");
    }

    const overwrites = [
      { id: guild.id, deny: ["ViewChannel"] },
      { id: role.id, allow: ["ViewChannel", "SendMessages", "Connect"] },
    ];

    /* ===============================
       CHANNEL SETUP
    ================================ */

    const text =
      guild.channels.cache.find((c) => c.name === textName) ??
      (await guild.channels.create({
        name: textName,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: overwrites,
      }));

    const voice =
      guild.channels.cache.find((c) => c.name === voiceName) ??
      (await guild.channels.create({
        name: voiceName,
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: overwrites,
      }));

    await log(`🔒 Channels ready: ${text} | ${voice}`);

    /* ===============================
       ROLE ASSIGNMENT
    ================================ */

    let added = 0;

    for (const id of ids) {
      try {
        const member = await guild.members.fetch(id);
        if (!member.roles.cache.has(role.id)) {
          await member.roles.add(role);
          added++;
          await log(`➕ Added ${member.user.tag} to **${roleName}**`);
        }
      } catch {
        await log(`⚠️ Failed to add user ID ${id}`);
      }
    }

    await interaction.editReply(
      `🌙 **All-nighter started**\n` +
        `👥 Users added: ${added}\n` +
        `⏳ Duration: ${hours}h\n` +
        `🔒 ${text} | ${voice}\n` +
        "Join with `/join-all-nighter`",
    );

    /* ===============================
       AUTO-CLEANUP TIMER
    ================================ */

    setTimeout(
      async () => {
        await log(`⏰ All-nighter **${tag}** ending`);

        const members = await guild.members.fetch();
        for (const m of members.values()) {
          if (m.roles.cache.has(role.id))
            await m.roles.remove(role).catch(() => {});
        }

        if (text.deletable) await text.delete().catch(() => {});
        if (voice.deletable) await voice.delete().catch(() => {});
        if (role.editable) await role.delete().catch(() => {});

        await log(`🧹 Cleaned up all-nighter **${tag}**`);
      },
      hours * 60 * 60 * 1000,
    );
  },
};

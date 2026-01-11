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

    // SINGLE ACK GUARANTEE
    await interaction.deferReply({});

    const guild = interaction.guild;
    const hours = interaction.options.getInteger("hours", true);
    const rawUsers = interaction.options.getString("users");

    const ids = new Set<string>();
    if (rawUsers) {
      rawUsers
        .split(/\s+/)
        .map((x) => x.replace(/[<@!>]/g, ""))
        .filter((x) => /^\d{17,20}$/.test(x))
        .forEach((x) => ids.add(x));
    }
    if (!ids.size) ids.add(interaction.user.id);

    const date = new Date();
    const tag = `${date.getDate()}${date.getMonth() + 1}`;
    const roleName = `all-nighter-paglu (${tag})`;

    let role = guild.roles.cache.find((r) => r.name === roleName);
    if (!role) role = await guild.roles.create({ name: roleName });

    const category =
      guild.channels.cache.find(
        (c) => c.name === "private-vc" && c.type === ChannelType.GuildCategory,
      ) ??
      (await guild.channels.create({
        name: "private-vc",
        type: ChannelType.GuildCategory,
      }));

    const perms = [
      { id: guild.id, deny: ["ViewChannel"] },
      { id: role.id, allow: ["ViewChannel", "SendMessages", "Connect"] },
    ];

    const text =
      guild.channels.cache.find((c) => c.name === `all-nighter-${tag}`) ??
      (await guild.channels.create({
        name: `all-nighter-${tag}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: perms,
      }));

    const voice =
      guild.channels.cache.find((c) => c.name === `all-nighter-vc-${tag}`) ??
      (await guild.channels.create({
        name: `all-nighter-vc-${tag}`,
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: perms,
      }));

    let added = 0;
    for (const id of ids) {
      try {
        const m = await guild.members.fetch(id);
        if (!m.roles.cache.has(role.id)) {
          await m.roles.add(role);
          added++;
        }
      } catch {}
    }

    await interaction.editReply(
      `🌙 **All-nighter started**\n` +
        `👥 Users: ${added}\n` +
        `⏳ ${hours} hours\n` +
        `🔒 ${text} | ${voice}\n` +
        "join with `/join-all-nighter`",
    );

    setTimeout(async () => {
      for (const m of (await guild.members.fetch()).values())
        if (m.roles.cache.has(role.id))
          await m.roles.remove(role).catch(() => {});
      if (text.deletable) await text.delete().catch(() => {});
      if (voice.deletable) await voice.delete().catch(() => {});
      if (role.editable) await role.delete().catch(() => {});
    }, hours * 3600000);
  },
};

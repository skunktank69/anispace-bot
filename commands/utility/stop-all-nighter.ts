const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

/* ===============================
   SAFE ROLE CHECKS
================================ */

const isAllNighterTempRole = (role) => {
  const name = role.name.toLowerCase();
  return /^all-nighter-paglu-\d+$/.test(name);
};

const isVeteranRole = (role) => /^all nighter veteran/i.test(role.name);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stop-all-nighter")
    .setDescription("Stops all all-nighters, cleans up, promotes veterans")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guild = interaction.guild;
    const executor = interaction.user;

    await interaction.deferReply({ ephemeral: true });

    /* ===============================
       0. ENSURE LOG CHANNEL EXISTS
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

    const log = async (msg) => {
      await logChannel.send(msg).catch(() => {});
    };

    await log(
      `🛑 **/stop-all-nighter triggered** by ${executor.tag} (${executor.id})`,
    );

    /* ===============================
       1. DELETE CHANNELS UNDER private-vc
    ================================ */

    const privateVcCategory = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildCategory &&
        c.name.toLowerCase() === "private-vc",
    );

    if (privateVcCategory) {
      const children = guild.channels.cache.filter(
        (c) => c.parentId === privateVcCategory.id,
      );

      for (const channel of children.values()) {
        await log(`🗑️ Deleting channel **${channel.name}**`);
        await channel.delete().catch(() => {});
      }
    } else {
      await log("⚠️ No `private-vc` category found");
    }

    /* ===============================
       2. FIND ALL-NIGHTER TEMP ROLES (SAFE)
    ================================ */

    const allNighterRoles = guild.roles.cache.filter(isAllNighterTempRole);

    if (allNighterRoles.size === 0) {
      await log("ℹ️ No all-nighter temp roles found");
    }

    /* ===============================
       3. PROCESS MEMBERS → VETERAN UPGRADE
    ================================ */

    for (const role of allNighterRoles.values()) {
      await log(`🎭 Processing role **${role.name}**`);

      for (const member of role.members.values()) {
        let days = 1;

        const existingVeteran = member.roles.cache.find(isVeteranRole);

        if (existingVeteran) {
          const match = existingVeteran.name.match(/\((\d+)\s*days?\)/i);
          if (match) days = parseInt(match[1], 10) + 1;

          await member.roles.remove(existingVeteran).catch(() => {});
        }

        const level = Math.min(Math.ceil(days / 5), 10);
        const veteranName = `all nighter veteran (${days} days) (level ${level})`;

        let veteranRole = guild.roles.cache.find((r) => r.name === veteranName);

        if (!veteranRole) {
          veteranRole = await guild.roles.create({
            name: veteranName,
            color: 0xff0000,
            reason: "All-nighter veteran progression",
          });

          await log(`🆕 Created veteran role **${veteranName}**`);
        }

        await member.roles.add(veteranRole).catch(() => {});

        await log(`⭐ ${member.user.tag} → **${veteranName}**`);
      }

      /* ===============================
         4. DELETE TEMP ROLE (DOUBLE GUARDED)
      ================================ */

      if (isAllNighterTempRole(role) && role.editable) {
        await role.delete().catch(() => {});
        await log(`❌ Deleted temp role **${role.name}**`);
      } else {
        await log(`🛑 Skipped deletion of **${role.name}**`);
      }
    }

    await log("✅ **All-nighter shutdown complete**");

    await interaction.editReply(
      "All-nighters stopped safely. Logs posted in #all-nighter-logs.",
    );
  },
};

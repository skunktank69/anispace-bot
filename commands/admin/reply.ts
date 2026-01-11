import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("reply")
  .setDescription("Reply or react to a message as the bot")
  .setDefaultMemberPermissions(
    PermissionFlagsBits.Administrator |
      PermissionFlagsBits.ManageMessages |
      PermissionFlagsBits.ModerateMembers,
  )
  .addStringOption((opt) =>
    opt
      .setName("target")
      .setDescription("Target message ID")
      .setRequired(false),
  )
  .addStringOption((opt) =>
    opt.setName("content").setDescription("Reply content").setRequired(false),
  )
  .addAttachmentOption((opt) =>
    opt
      .setName("image")
      .setDescription("Image (attach more files to reuse)")
      .setRequired(false),
  )
  .addStringOption((opt) =>
    opt
      .setName("react")
      .setDescription("Reactions (comma separated)")
      .setRequired(false),
  )
  .addBooleanOption((opt) =>
    opt
      .setName("react_only")
      .setDescription("Only react, do not send a reply")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({ content: "Guild only.", flags: 64 });
  }

  await interaction.deferReply({ flags: 64 });

  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    return interaction.editReply("Invalid channel.");
  }

  const messageId = interaction.options.getString("target");
  const content = interaction.options.getString("content");
  const reactRaw = interaction.options.getString("react");
  const reactOnly = interaction.options.getBoolean("react_only") ?? false;

  if (!messageId) {
    return interaction.editReply("Target message ID is required.");
  }

  let targetMessage;
  try {
    targetMessage = await (channel as TextChannel).messages.fetch(messageId);
  } catch {
    return interaction.editReply("Could not find target message.");
  }

  /* -------------------- IMAGE CONSOLIDATION -------------------- */

  const files = [];

  const primaryImage = interaction.options.getAttachment("image");
  if (primaryImage) files.push(primaryImage);

  const resolvedAttachments =
    interaction.options.resolved?.attachments?.values() ?? [];

  for (const attachment of resolvedAttachments) {
    if (!files.some((f) => f.id === attachment.id)) {
      files.push(attachment);
    }
  }

  /* ------------------------- REPLY ----------------------------- */

  if (!reactOnly && (content || files.length)) {
    await targetMessage.reply({
      content: content ?? undefined,
      files: files.length ? files : undefined,
    });
  }

  /* ----------------------- REACTIONS --------------------------- */

  if (reactRaw) {
    const emojis = reactRaw
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    for (const emoji of emojis) {
      try {
        await targetMessage.react(emoji);
      } catch {
        // invalid emoji → ignored
      }
    }
  }

  /* ------------------------- LOGGER ---------------------------- */

  const logChannel = interaction.guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildText && c.name === "🤖bot-logs",
  ) as TextChannel | undefined;

  if (logChannel) {
    await logChannel.send({
      content: [
        "🧾 **/reply used**",
        `User: ${interaction.user.tag}`,
        `Channel: <#${interaction.channelId}>`,
        `Target: ${messageId}`,
        `Reply sent: ${reactOnly ? "no" : "yes"}`,
        `Images: ${files.length}`,
        `Reactions: ${reactRaw ?? "none"}`,
      ].join("\n"),
    });
  }

  await interaction.editReply("Done.");
}

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("post")
  .setDescription("Make the bot post in #pdates")
  .addStringOption((opt) =>
    opt
      .setName("content")
      .setDescription("Text content of the post")
      .setRequired(true),
  )
  .addStringOption((opt) =>
    opt
      .setName("image")
      .setDescription("Optional image URL")
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({
      content: "❌ This command can only be used in a server.",
      ephemeral: true,
    });
  }

  const member = interaction.member;

  // Only allow admins
  if (
    !member.permissions.has(PermissionFlagsBits.Administrator) &&
    !member.permissions.has(PermissionFlagsBits.ManageGuild)
  ) {
    return interaction.reply({
      content:
        "❌ You must be an admin or have Manage Server permission to use this command.",
      ephemeral: true,
    });
  }

  // Fetch the #bot-updates channel
  const updatesChannel = interaction.guild.channels.cache.find(
    (c) => c.name === "updates👽" && c.isTextBased(),
  ) as TextChannel;

  if (!updatesChannel) {
    return interaction.reply({
      content: "❌ #bot-updates channel not found.",
      ephemeral: true,
    });
  }

  const content = interaction.options.getString("content", true);
  const imageUrl = interaction.options.getString("image");

  const messagePayload: any = { content };

  if (imageUrl) {
    messagePayload.embeds = [
      {
        image: { url: imageUrl },
      },
    ];
  }

  try {
    await updatesChannel.send(messagePayload);

    return interaction.reply({
      content: "✅ Post sent to #updates👽!",
      ephemeral: true,
    });
  } catch (err) {
    console.error(err);
    return interaction.reply({
      content: "❌ Failed to send the post.",
      ephemeral: true,
    });
  }
}

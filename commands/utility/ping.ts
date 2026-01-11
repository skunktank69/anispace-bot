import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Check if the bot is alive!");

export async function execute(interaction: ChatInputCommandInteraction) {
  // defer ephemeral reply for quick acknowledgment
  await interaction.deferReply({ flags: 64 });

  // measure latency
  const latency = Date.now() - interaction.createdTimestamp;

  // respond after processing
  await interaction.editReply({
    content: `🏓 Pong! Latency is ${latency}ms.`,
  });
}

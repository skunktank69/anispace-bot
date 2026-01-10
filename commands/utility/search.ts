import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

const { site } = require("../../config.json");

export const data = new SlashCommandBuilder()
  .setName("search-anime")
  .setDescription("Search anime by title")
  .addStringOption((option) =>
    option
      .setName("title")
      .setDescription("Title to search for")
      .setRequired(true),
  );

async function fetchPage(title, page) {
  const res = await fetch(
    `${site}/search/${encodeURIComponent(title)}?page=${page}&perPage=10&type=anime`,
  );

  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function buildEmbed(data, title) {
  const firstAnime = data.results[0];

  const embed = new EmbedBuilder()
    .setTitle(`Search results for "${title}"`)
    .setColor(0x3498db) // blue
    .setFooter({
      text: `Page ${data.currentPage} of ${data.totalPages}`,
    });

  if (firstAnime?.image) {
    embed.setThumbnail(firstAnime.image);
  }

  data.results.forEach((anime, index) => {
    embed.addFields({
      name: `${index + 1}. ${anime.title.english ?? anime.title.romaji}`,
      value:
        anime.type == "MOVIE"
          ? `Type: ${anime.type}\n` + `Year: ${anime.releaseDate}\n`
          : `Type: ${anime.type} \n Year: ${anime.releaseDate}\n Episodes: ${anime.totalEpisodes ?? "?"}`,
      inline: false,
    });
  });

  return embed;
}

function buildButtons(page, hasNext) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("◀ Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),

    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next ▶")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasNext),
  );
}

export async function execute(interaction) {
  const title = interaction.options.getString("title", true);
  let page = 1;

  let data;
  try {
    data = await fetchPage(title, page);
  } catch (err) {
    return interaction.reply({
      content: "API is not behaving. Try again later.",
      ephemeral: true,
    });
  }

  const message = await interaction.reply({
    embeds: [buildEmbed(data, title)],
    components: [buildButtons(page, data.hasNextPage)],
    fetchReply: true,
  });

  const collector = message.createMessageComponentCollector({
    time: 5 * 60 * 1000,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "prev") page--;
    if (i.customId === "next") page++;

    try {
      data = await fetchPage(title, page);
    } catch {
      return i.reply({
        content: "Failed to load page.",
        ephemeral: true,
      });
    }

    await i.update({
      embeds: [buildEmbed(data, title)],
      components: [buildButtons(page, data.hasNextPage)],
    });
  });

  collector.on("end", async () => {
    await message.edit({
      components: [],
    });
  });
}

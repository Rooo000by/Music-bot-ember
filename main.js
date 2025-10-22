const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption(option => 
      option.setName('query')
        .setDescription('The song name or URL')
        .setRequired(true)
    ),
  async execute(interaction, player) {
    const query = interaction.options.getString('query');

    const searchResult = await player.search(query, {
      requestedBy: interaction.user,
      searchEngine: 'youtubeSearch'
    });

    if (!searchResult || !searchResult.tracks.length) {
      return interaction.reply('No results found!');
    }

    const queue = player.createQueue(interaction.guild, {
      metadata: {
        channel: interaction.channel
      }
    });

    try {
      if (!queue.connection) await queue.connect(interaction.member.voice.channel);
    } catch {
      player.deleteQueue(interaction.guild.id);
      return interaction.reply('Could not join your voice channel!');
    }

    queue.addTrack(searchResult.tracks[0]);

    if (!queue.playing) await queue.play();

    await interaction.reply(`🎶 Playing **${searchResult.tracks[0].title}**`);
  }
};

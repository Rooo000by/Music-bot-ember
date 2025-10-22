require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player } = require('discord-player');
const playdl = require('play-dl');
const fs = require('fs');
const path = require('path');

// Catch startup errors and log
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

client.commands = new Collection();

// Load command files from /commands folder
const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) {
  console.error('Commands folder not found! Please create a "commands" folder.');
  process.exit(1);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
if (commandFiles.length === 0) {
  console.warn('Warning: No command files found in the commands folder.');
}

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (!command.data || !command.execute) {
    console.warn(`Warning: The command at ${file} is missing required "data" or "execute" property.`);
    continue;
  }
  client.commands.set(command.data.name, command);
}

// Initialize discord-player with play-dl extractor
const player = new Player(client, {
  ytdlOptions: {
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
  },
  extractors: [
    {
      name: 'play-dl',
      validate: (url) => playdl.yt_validate(url) === 'video',
      extract: async (url) => {
        const info = await playdl.video_info(url);
        return {
          playlist: null,
          tracks: [
            {
              title: info.video_details.title,
              url: info.video_details.url,
              author: info.video_details.channel.name,
              duration: info.video_details.durationRaw,
              thumbnail: info.video_details.thumbnails[0].url,
              requestedBy: null,
            },
          ],
        };
      },
    },
  ],
});

client.player = player;

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} found.`);
    return;
  }

  try {
    await command.execute(interaction, player);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
    }
  }
});

// Login with your bot token from environment variables
if (!process.env.TOKEN) {
  console.error('ERROR: Missing TOKEN environment variable!');
  process.exit(1);
}

client.login(process.env.TOKEN);

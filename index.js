const DiscordJS = require('discord.js');
const { Intents, MessageEmbed } = require('discord.js');
const dotenv = require('dotenv');
const {
  authGoogleSheet,
  findResource,
  findWeaponResource,
} = require('./src/googleSheet');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Hello World!'));
const port = process.env.PORT || 4000;
app.listen(port, () =>
  console.log(`Discord bot listening at http://localhost:${port}`)
);

dotenv.config();

const client = new DiscordJS.Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    // Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    // Intents.FLAGS.GUILD_PRESENCES,
  ],
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

client.on('ready', () => {
  console.log('bot is ready');
  const guildId = process.env.GUID_ID;
  const guid = client.guilds.cache.get(guildId);
  let commands;
  if (guid) {
    commands = guid.commands;
  } else {
    commands = client.application?.commands;
  }
  // console.log(guid, commands);

  commands?.create({
    name: 'find',
    description: '查找素材最高掉落的關卡',
    options: [
      {
        name: 'name',
        description: '掉落物',
        required: true,
        type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
      },
    ],
  });

  commands?.create({
    name: 'weapon',
    description: '查找武器及其素材最高掉落的關卡',
    options: [
      {
        name: 'name',
        description: '武器名稱',
        required: true,
        type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
      },
    ],
  });
  authGoogleSheet(doc);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }
  // console.log(interaction);
  const { commandName, options } = interaction;
  switch (commandName) {
    case 'find':
      const resourceName = options.getString('name');
      const resourceResult = await findResource(doc, resourceName);
      console.log(resourceResult);
      await interaction.reply({
        content: resourceResult,
      });
      break;
    case 'weapon':
      const weaponName = options.getString('name');
      const weaponResult = await findWeaponResource(doc, weaponName);
      console.log('weaponResult', weaponResult);
      if (!weaponResult) {
        await interaction.reply({
          content: `沒有此武器: ${weaponName}`,
        });
      } else {
        const stagesToString = weaponResult.stages.join(' / ');
        const resourcesToField = weaponResult.resources.map((element) => ({
          name: element.resourceName,
          value: `素材:${element.stage}\n關卡:${element.amount}\n武器素材:${
            element.findWithWeapon ? '是' : '否'
          }`,
        }));

        const embed = new MessageEmbed({
          title: weaponName,
          description: `掉落關卡: ${stagesToString}`,
          fields: resourcesToField,
        });
        await interaction.reply({
          embeds: [embed],
        });
      }
      break;
    default:
      break;
  }
});

client.login(process.env.TOKEN);

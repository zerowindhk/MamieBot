const DiscordJS = require('discord.js');
const { Intents, MessageEmbed } = require('discord.js');
const dotenv = require('dotenv');
const {
  authGoogleSheet,
  findResource,
  findLikeResource,
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
  commands?.fetch();
  commands?.create({
    name: 'resource',
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
    name: 'like_resource',
    description: '查找包含名字的素材最高掉落的關卡',
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
    case 'resource':
      const resourceName = options.getString('name');
      const resourceResult = await findResource(doc, resourceName);
      console.log('name:', resourceName, '\nresourceResult:\n', resourceResult);
      const embed = new MessageEmbed({
        title: resourceName,
        color: '#ff0000',
        description: resourceResult.amount
          ? `${resourceResult.amount} @ ${resourceResult.stage}`
          : '沒有此素材',
      });
      await interaction.reply({
        embeds: [embed],
      });
      break;
    case 'like_resource':
      const likeResourceName = options.getString('name');
      const likeResourceResultList = await findLikeResource(
        doc,
        likeResourceName
      );
      console.log(
        'name:',
        likeResourceName,
        '\nlikeResourceResultList:\n',
        likeResourceResultList
      );
      if (!likeResourceResultList.length) {
        const embed = new MessageEmbed({
          title: likeResourceName,
          color: '#ff0000',
          description: '沒有此素材',
        });
        await interaction.reply({
          embeds: [embed],
        });
      } else {
        const foundItem = likeResourceResultList.length;
        const fields = likeResourceResultList
          .slice(0, 25)
          .map((resourceResult) => ({
            name: resourceResult.resourceName,
            value: `${resourceResult.amount} @ ${resourceResult.stage}`,
            inline: true,
          }));
        const embed = new MessageEmbed({
          title: likeResourceName,
          color: '#33FF99',
          description: `已查找${foundItem}項。`,
          fields,
        });
        await interaction.reply({
          embeds: [embed],
        });
      }
      break;
    case 'weapon':
      const weaponName = options.getString('name');
      const weaponResult = await findWeaponResource(doc, weaponName);
      console.log('name:', weaponName, '\nweaponResult:\n', weaponResult);
      if (!weaponResult) {
        const embed = new MessageEmbed({
          title: weaponName,
          description: '沒有此武器',
        });
        await interaction.reply({
          embeds: [embed],
        });
      } else {
        const stagesToString = weaponResult.stages.join(' / ');
        const resourcesToField = weaponResult.resources.map(
          (resourceResult) => ({
            name: resourceResult.resourceName,
            value: `${resourceResult.amount} @ ${
              resourceResult.stage
            }\n相關武器碎片掉落：${
              resourceResult.findWithWeapon ? '是' : '否'
            }`,
            inline: true,
          })
        );
        const embed = new MessageEmbed({
          title: weaponName,
          color: '#0099ff',
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

const {
  Client,
  Constants,
  Intents,
  MessageEmbed,
  MessageActionRow,
  MessageButton,
} = require('discord.js');
const dotenv = require('dotenv');
const {
  authGoogleSheet,
  findResource,
  findLikeResource,
  findWeaponResource,
  findLikeWeapon,
} = require('./src/googleSheet');
const { convertor } = require('./src/translate');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Hello World!'));
const port = process.env.PORT || 4000;
app.listen(port, () =>
  console.log(`Discord bot listening at http://localhost:${port}`)
);

dotenv.config();

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
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
    description: '查找包含名字的素材最高掉落的關卡',
    options: [
      {
        name: 'name',
        description: '素材名稱',
        required: true,
        type: Constants.ApplicationCommandOptionTypes.STRING,
      },
      {
        name: 'private',
        description: '如不想讓人知道自己在查甚麼就Yes',
        required: false,
        type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
      },
    ],
  });

  commands?.create({
    name: 'weapon',
    description: '查找包含名字的武器及其素材最高掉落的關卡',
    options: [
      {
        name: 'name',
        description: '武器名稱',
        required: true,
        type: Constants.ApplicationCommandOptionTypes.STRING,
      },
      {
        name: 'private',
        description: '如不想讓人知道自己在查甚麼就Yes',
        required: false,
        type: Constants.ApplicationCommandOptionTypes.BOOLEAN,
      },
    ],
  });

  commands?.create({
    name: 'excel',
    description: '提供資料來源的google sheet',
  });

  authGoogleSheet(doc);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }
  const { commandName, options } = interaction;
  console.log(commandName, options.getString('name'));
  switch (commandName) {
    case 'resource':
      await interaction.deferReply({
        ephemeral: options.getBoolean('private') || false,
      });
      const likeResourceName = convertor(options.getString('name'));
      const resourceNameList = await findLikeResource(doc, likeResourceName);
      const resourceCount = resourceNameList.length;
      if (resourceCount) {
        const rows = [];
        for (let i = 0; i <= resourceCount / 5 + 1 && i <= 5; i++) {
          const start = i * 5;
          const sliceResourceNameList = resourceNameList.slice(
            start,
            start + 5
          );
          if (sliceResourceNameList.length) {
            const row = new MessageActionRow({
              components: sliceResourceNameList.map(
                (item) =>
                  new MessageButton({
                    custom_id: `${item}`,
                    label: `${item}`,
                    style: 'PRIMARY',
                  })
              ),
            });
            rows.push(row);
          }
        }
        const embed = new MessageEmbed({
          title: likeResourceName,
          color: '#33FF99',
          description: `已查找${resourceCount}項。`,
        });
        await interaction.editReply({
          components: rows,
          embeds: [embed],
        });

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          time: 15000,
        });
        collector.on('collect', async (i) => {
          const { customId: resourceName } = i;
          console.log('choice', resourceName);
          const resourceResult = await findResource(doc, resourceName);
          const embed = new MessageEmbed({
            title: resourceName,
            color: '#5544ff',
            description: `${resourceResult.amount} @ ${resourceResult.stage}`,
          });
          await i.update({
            embeds: [embed],
            components: [],
          });
        });
        collector.on('end', (collected) => {});
      } else {
        const embed = new MessageEmbed({
          title: likeResourceName,
          color: '#ff0000',
          description: '沒有此素材',
        });
        await interaction.editReply({
          embeds: [embed],
        });
      }
      break;
    case 'weapon':
      await interaction.deferReply({
        ephemeral: options.getBoolean('private') || false,
      });
      const likeWeaponName = convertor(options.getString('name'));
      const weaponNameList = await findLikeWeapon(doc, likeWeaponName);
      const weaponCount = weaponNameList.length;
      if (weaponCount) {
        const rows = [];
        for (let i = 0; i <= weaponNameList.length / 5 + 1 && i <= 5; i++) {
          const start = i * 5;
          const sliceWeaponNameList = weaponNameList.slice(start, start + 5);
          if (sliceWeaponNameList.length) {
            const row = new MessageActionRow({
              components: sliceWeaponNameList.map(
                (item) =>
                  new MessageButton({
                    custom_id: `${item}`,
                    label: `${item}`,
                    style: 'PRIMARY',
                  })
              ),
            });
            // console.log(row);
            rows.push(row);
          }
        }
        const embed = new MessageEmbed({
          title: likeWeaponName,
          color: '#33FF99',
          description: `已查找${weaponCount}項。`,
        });
        await interaction.editReply({
          components: rows,
          embeds: [embed],
        });
        const filter = (i) => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          time: 15000,
        });
        collector.on('collect', async (i) => {
          const { customId: weaponName } = i;
          console.log('choice', weaponName);
          const weaponResult = await findWeaponResource(doc, weaponName);
          const stagesToString = weaponResult.stages.join(' / ');
          const resourcesToField = weaponResult.resources.map(
            (resourceResult) => ({
              name: resourceResult.resourceName,
              value: `${resourceResult.amount} @ ${
                resourceResult.stage
              }\n掉落武器碎片：${resourceResult.findWithWeapon ? '是' : '否'}`,
              inline: true,
            })
          );
          const embed = new MessageEmbed({
            title: weaponName,
            color: '#0099ff',
            description: `掉落關卡: ${stagesToString}`,
            fields: resourcesToField,
          });
          await i.update({
            embeds: [embed],
            components: [],
          });
        });
        collector.on('end', (collected) => {});
      } else {
        const embed = new MessageEmbed({
          title: likeWeaponName,
          color: '#ff0000',
          description: '沒有此武器',
        });
        await interaction.editReply({
          embeds: [embed],
        });
      }
      break;
    case 'excel':
      const embed = new MessageEmbed({
        title: 'Zold:Out 武器素材查詢區',
        url: 'https://docs.google.com/spreadsheets/d/1CeTO-Bae2xNGrAtTo1zAb81joirxu4CGnrdVieXQbfU/view#gid=0',
      });
      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
      break;
    default:
      break;
  }
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

client.login(process.env.TOKEN);

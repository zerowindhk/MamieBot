const DiscordJS = require('discord.js');
const { Intents } = require('discord.js');
const dotenv = require('dotenv');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
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

const initGoogleSheet = async () => {
  const creds = require('./config/private.json'); // the file saved above
  await doc.useServiceAccountAuth(creds);

  await doc.loadInfo(); // loads document properties and worksheets
  console.log(doc.title);
};

client.on('ready', () => {
  console.log('bot is ready');
  const guildId = '976887315182006292';
  const guid = client.guilds.cache.get(guildId);
  // console.log(process.env.GOOGLE_API_KEY);
  let commands;
  if (guid) {
    commands = guid.commands;
  } else {
    commands = client.application?.commands;
  }

  commands?.create({
    name: 'find',
    description: '查找最高掉落的關卡',
    options: [
      {
        name: 'name',
        description: '掉落物',
        required: true,
        type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
      },
    ],
  });

  (async function () {
    await initGoogleSheet();
  })();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }
  const { commandName, options } = interaction;
  switch (commandName) {
    case 'find':
      const resourceName = options.getString('name');
      let rowNo = 0;
      let hightest = 0;
      const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id] or doc.sheetsByTitle[title]
      // console.log('row count', sheet.rowCount);
      await sheet.loadCells(`A1:B${sheet.rowCount}`);
      for (let i = 0; i < sheet.rowCount; i++) {
        const cellResource = sheet.getCell(i, 1);
        // console.log('cell value', i, cellResource.value);
        if (cellResource.value) {
          const re = /\s*(?:;\/|$)\s*/;
          const resources = cellResource.value.split(re);
          resources.forEach((element) => {
            if (element.includes(resourceName)) {
              const re2 = /\d+/;
              const number = element.match(re2);
              if (number) {
                const count = parseInt(number[0]);
                if (count > hightest) {
                  rowNo = i;
                  hightest = count;
                }
              }
            }
          });
        } else {
          // already at the end of file
          break;
        }
      }
      const hightestCellLevel = sheet.getCell(rowNo, 0);
      // console.log(hightestCellLevel.value);
      const result = `查找掉落物: ${resourceName} 關卡: ${hightestCellLevel.value} 數量: ${hightest}`;
      console.log(result);
      interaction.reply({
        content: result,
      });
      break;
    default:
      break;
  }
});

client.login(process.env.TOKEN);
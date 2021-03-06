const authGoogleSheet = async (doc) => {
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  });

  await doc.loadInfo(); // loads document properties and worksheets
  console.log(doc.title);
};

const getDistinctResourcesList = (sheet, likeResourceName) => {
  const distinctArray = [];
  for (let i = 1; i < sheet.rowCount; i++) {
    const cellResource = sheet.getCell(i, 1);
    const cellValue = cellResource.value;
    if (cellValue && cellValue.includes(likeResourceName)) {
      const resources = cellValue.split('/');
      resources.forEach((item) => {
        const name = item.replace(/\d+/, '');
        if (name.includes(likeResourceName) && !distinctArray.includes(name)) {
          distinctArray.push(name);
        }
      });
    }
  }
  return distinctArray;
};

const getDistinctWeaponList = (sheet, likeWeaponName) => {
  const distinctArray = [];
  for (let i = 1; i < sheet.rowCount; i++) {
    const cellResource = sheet.getCell(i, 0);
    const cellValue = cellResource.value;
    if (cellValue && cellValue.includes(likeWeaponName)) {
      distinctArray.push(cellValue);
    }
  }
  return distinctArray;
};

const loopExactFind = (sheet, resourceName, weaponName = null) => {
  let rowNo = 0;
  let amount = 0;
  let hasWeaponRowNo = 0;
  let hasWeaponAmount = 0;
  for (let i = 1; i < sheet.rowCount; i++) {
    const cellResource = sheet.getCell(i, 1);
    const cellValue = cellResource.value;
    if (cellValue && cellValue.includes(resourceName)) {
      // const re = /\s*(?:;\/|$)\s*/;
      const resources = cellValue.split('/');
      const exactRe = new RegExp(`^[0-9]+${resourceName}$`);
      const element = resources.find((item) => {
        // console.log('element:', item, 'result:', exactRe.test(item));
        return exactRe.test(item);
      });
      if (element) {
        const re2 = /\d+/;
        const number = element.match(re2);
        if (number) {
          const count = parseInt(number[0]);
          if (count >= amount) {
            rowNo = i;
            amount = count;
            if (weaponName && sheet.getCell(i, 2).value === weaponName) {
              hasWeaponRowNo = i;
              hasWeaponAmount = count;
            }
          }
        }
      }
    } else {
      continue; //not filled yet
    }
  }
  rowNo = weaponName && hasWeaponAmount === amount ? hasWeaponRowNo : rowNo;
  const stage = sheet.getCell(rowNo, 0).value;
  const findWithWeapon = weaponName
    ? sheet.getCell(rowNo, 2).value === weaponName
    : false;
  return {
    resourceName,
    stage,
    rowNo,
    amount,
    findWithWeapon,
  };
};

const findWeaponStages = (sheet, weaponName) => {
  const result = [];
  for (let i = 1; i < sheet.rowCount; i++) {
    const weaponCell = sheet.getCell(i, 2);
    const weaponValue = weaponCell.value;
    // console.log(weaponValue);
    if (weaponValue && weaponValue.includes(weaponName)) {
      const weaponNameList = weaponValue.split('/');
      weaponNameList.forEach((element) => {
        if (element === weaponName) {
          const stageCell = sheet.getCell(i, 0);
          result.push(stageCell.value);
        }
      });
    }
  }
  return result;
};

const findResource = async (doc, resourceName) => {
  const sheet = doc.sheetsByIndex[0];
  await sheet.loadCells(`A1:B${sheet.rowCount}`);
  const result = loopExactFind(sheet, resourceName);

  return result;
};

const findLikeResource = async (doc, likeResourceName) => {
  const sheet = doc.sheetsByIndex[0];
  await sheet.loadCells(`A1:B${sheet.rowCount}`);
  const result = getDistinctResourcesList(sheet, likeResourceName);
  return result;
};

const findWeaponResource = async (doc, weaponName) => {
  // console.log(weaponName);
  const weaponSheet = doc.sheetsByIndex[1];
  await weaponSheet.loadCells(`A1:C${weaponSheet.rowCount}`);

  const weaponObject = {
    weaponName: '',
    stages: [],
    resources: [],
  };
  for (let i = 1; i < weaponSheet.rowCount; i++) {
    const weaponNameCell = weaponSheet.getCell(i, 0);
    // console.log(weaponNameCell.value, weaponNameCell.value === weaponName);
    if (weaponNameCell.value === weaponName) {
      weaponObject.weaponName = weaponName;
      const resourcesNameCell = weaponSheet.getCell(i, 1);
      const resourcesNameValue = resourcesNameCell.value;
      // const re = /\s*(?:;\/|$)\s*/;
      const resources = resourcesNameValue.split('/');
      // console.log('resources', resourcesNameValue, 'split', resources);
      weaponObject.resources = resources.map((item) => ({
        resourceName: item.trim(),
        stage: '',
        amount: 0,
        findWithWeapon: false,
      }));
      break;
    }
  }
  if (!weaponObject.weaponName) {
    return false;
  }
  const resourceSheet = doc.sheetsByIndex[0];
  await resourceSheet.loadCells(`A1:C${resourceSheet.rowCount}`);
  weaponObject.resources.forEach((element) => {
    const item = loopExactFind(resourceSheet, element.resourceName, weaponName);
    element.stage = item.stage;
    element.amount = item.amount;
    element.findWithWeapon = item.findWithWeapon;
  });
  weaponObject.stages = findWeaponStages(resourceSheet, weaponName);
  // console.log(weaponObject);
  return weaponObject;
};

const findLikeWeapon = async (doc, likeWeaponName) => {
  const sheet = doc.sheetsByIndex[1];
  await sheet.loadCells(`A1:B${sheet.rowCount}`);
  const result = getDistinctWeaponList(sheet, likeWeaponName);
  return result;
};

module.exports = {
  authGoogleSheet,
  findResource,
  findLikeResource,
  findWeaponResource,
  findLikeWeapon,
};

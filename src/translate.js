const OpenCC = require('opencc-js');

const converter = OpenCC.Converter({ from: 'cn', to: 'hk' });

module.exports = {
  converter,
};

const axios = require('axios');

async function main() {
  const resp = await axios.get('https://api.opendota.com/api/heroes');
  const voidHero = resp.data.find(h => h.localized_name === 'Faceless Void');
  console.log(JSON.stringify(voidHero, null, 2));
}

main();

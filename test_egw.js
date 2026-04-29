const { fetchHtml } = require('./dist/utils/fetcher.js');
const fs = require('fs');

async function test() {
  const url = 'https://egamersworld.com/counterstrike/matches/live';
  try {
    const html = await fetchHtml(url);
    fs.writeFileSync('egw_test.html', html);
    console.log('Saved to egw_test.html, length:', html.length);
  } catch(e) {
    console.error(e);
  }
}
test();

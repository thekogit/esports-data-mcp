const { fetchHtml } = require('./src/utils/fetcher');
const fs = require('fs');

async function main() {
  const url = 'https://hawk.live/dota-2/matches/dreamleague-division-2-season-4-group-stage/team-lynx-vs-nemiga-gaming#map1';
  try {
    const html = await fetchHtml(url);
    fs.writeFileSync('match_page.html', html);
    console.log('HTML saved to match_page.html');
  } catch (e) {
    console.error(e);
  }
}

main();

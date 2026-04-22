const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('match_page.html', 'utf8');
const $ = cheerio.load(html);
const dataPage = $('#app').attr('data-page');

if (dataPage) {
  const parsed = JSON.parse(dataPage);
  fs.writeFileSync('data_page.json', JSON.stringify(parsed, null, 2));
  console.log('Data saved to data_page.json');
} else {
  console.log('No data-page attribute found');
}

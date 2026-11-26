const fs = require('fs');

const seasons = ['summer', 'autumn', 'winter', 'spring'];
const types = [
  'wide_oak', 'slender_birch', 'bushy_pine', 'curved_willow', 'gnarled_elm',
  'tall_cedar', 'cluster_rowan', 'spiky_fir', 'drooping_larch', 'dense_chestnut'
];

const result = [];
let globalId = 234;

seasons.forEach(season => {
  for (let i = 0; i < 100; i++) {
    const type = types[i % types.length];
    const variant = Math.floor(i / types.length) + 1;
    const filename = type + '_' + variant + '.svg';

    result.push({
      id: globalId++,
      path: 'assets/trees/' + season + '/' + filename,
      type: 'tree',
      group: 'Trees - ' + season.charAt(0).toUpperCase() + season.slice(1),
      tags: [season, type]
    });
  }
});

fs.writeFileSync('trees-batch.json', JSON.stringify(result, null, 2));
console.log('Готово: ' + result.length + ' записей в trees-batch.json');

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {lineResults, parseNbaSearch} from '../lib/nba-explorer';

test('match search extracts a player, a market and an accented time window', () => {
  assert.deepEqual(parseNbaSearch('Brunson, asistencias, últimos 10'), {
    name:'Brunson', criteria:{market:'assists',last:10},
  });
  assert.deepEqual(parseNbaSearch('Tatum, PTS, L20'), {
    name:'Tatum', criteria:{market:'points',last:20},
  });
  assert.deepEqual(parseNbaSearch('Brunson, últimos 30'), {
    name:'Brunson, últimos 30', criteria:{},
  });
});

test('line ranking counts equal results separately and excludes missing data', () => {
  assert.deepEqual(lineResults([null,0,6,8],6), {
    n:3,hits:1,pushes:1,average:14/3,rate:1/3,
  });
  assert.deepEqual(lineResults([null,0,6,8],6,'under'), {
    n:3,hits:1,pushes:1,average:14/3,rate:1/3,
  });
});

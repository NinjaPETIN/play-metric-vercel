import assert from 'node:assert/strict';
import {test} from 'node:test';
import {describeLineProgress,lineResults, parseNbaSearch} from '../lib/nba-explorer';

test('saved lines respect strict thresholds, integer ties and final results',()=>{
  assert.equal(describeLineProgress(4,5.5,'over',false),'Faltan 2');
  assert.equal(describeLineProgress(5,5,'over',false),'Falta 1');
  assert.equal(describeLineProgress(6,5.5,'over',false),'Superó la línea');
  assert.equal(describeLineProgress(5,5.5,'under',false),'En el último valor por debajo de la línea');
  assert.equal(describeLineProgress(5,5,'under',true),'Igualó la línea');
  assert.equal(describeLineProgress(4,5.5,'over',true),'Quedó por debajo de la línea');
});

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

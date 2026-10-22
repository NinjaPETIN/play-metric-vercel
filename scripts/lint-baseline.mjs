import {ESLint} from 'eslint';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {relative} from 'node:path';
const baseline=JSON.parse(await readFile(new URL('../eslint-baseline.json',import.meta.url),'utf8'));
const remaining=new Map();for(const entry of baseline.entries)remaining.set(entry.fingerprint,(remaining.get(entry.fingerprint)??0)+1);
const results=await new ESLint().lintFiles(['.']);const added=[],matched=[];let warnings=0;
for(const result of results){warnings+=result.warningCount;const file=relative(process.cwd(),result.filePath).replaceAll('\\','/');const source=result.source??await readFile(result.filePath,'utf8');const lines=source.split(/\r?\n/);
 for(const message of result.messages){if(message.severity!==2)continue;const fingerprint=createHash('sha256').update([file,message.ruleId??'parse',message.message.split('\n')[0],lines[(message.line??1)-1]?.trim()??''].join('\0')).digest('hex');if(remaining.get(fingerprint)){remaining.set(fingerprint,remaining.get(fingerprint)-1);matched.push({fingerprint,file,rule:message.ruleId});}else added.push({...result,messages:[message]});}
}
console.log(`ESLint: ${matched.length} errores heredados documentados, ${warnings} advertencias, ${added.length} errores nuevos.`);
if(added.length){console.log(await(await new ESLint().loadFormatter('stylish')).format(added));process.exitCode=1;}
else if(process.argv.includes('--prune')){await writeFile(new URL('../eslint-baseline.json',import.meta.url),JSON.stringify({...baseline,entries:matched},null,2)+'\n');console.log('Se quitaron de la base únicamente los errores ya resueltos. No se agregaron excepciones.');}
if(matched.length)console.log('Deuda técnica explícita: eslint-baseline.json. npm run lint:strict muestra todos los errores y falla hasta resolverlos.');

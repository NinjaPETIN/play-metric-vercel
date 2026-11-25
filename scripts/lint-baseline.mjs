// Compatibility entry point: legacy callers receive the same strict checks as npm run lint.
import {ESLint} from 'eslint';
const eslint=new ESLint(),results=await eslint.lintFiles(['.']);
const output=await(await eslint.loadFormatter('stylish')).format(results);
if(output)console.log(output);
if(results.some(result=>result.errorCount||result.warningCount))process.exitCode=1;

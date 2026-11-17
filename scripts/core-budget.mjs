// @ts-check
import { readdirSync,readFileSync } from 'node:fs';
import { join } from 'node:path';
/** @returns {number} */
function count(/** @type {string} */ dir){return readdirSync(dir,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?count(join(dir,e.name)):e.name.endsWith('.ts')?readFileSync(join(dir,e.name),'utf8').split('\n').filter(l=>l.trim()).length:0),0);}
const lines=count('skeleton/src/core');console.log(`Core: ${lines} non-blank lines; budget 1800`);if(lines>1800)process.exitCode=1;

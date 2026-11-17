import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
for(const id of ['todo-afterlife','notice-ghoul']){
  const outdir=`apps/${id}/dist`;await mkdir(outdir,{recursive:true});
  const result=await build({entryPoints:['scripts/aws-entry.ts'],outdir,bundle:true,platform:'node',target:'node22',format:'cjs',metafile:true,define:{'process.env.WRAITH_APP':JSON.stringify(id)}});
  const sources=Object.keys(result.metafile!.inputs).filter(p=>p.includes('skeleton/'));
  if(!sources.some(p=>p==='skeleton/src/core/index.ts')||sources.some(p=>!resolve(p).startsWith(resolve('skeleton/src')+'/')))throw new Error('Bundle contains an invalid skeleton source');
  await writeFile(`${outdir}/package.json`,JSON.stringify({type:"commonjs"}));
  await writeFile(`${outdir}/meta.json`,JSON.stringify(result.metafile,null,2));console.log(`${id}: ${sources.length} shared skeleton source inputs verified`);
}

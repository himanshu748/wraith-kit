import { mkdir, readFile, readdir, rm, writeFile, realpath } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function scaffold(name:string,root=projectRoot):Promise<string>{
  if(!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)||name.length>48)throw new Error('Use a lowercase kebab-case app name, at most 48 characters.');
  const apps=join(root,'apps');await mkdir(apps,{recursive:true});
  if(await realpath(apps)!==apps)throw new Error('Refusing a symlinked apps directory.');
  const destination=join(apps,name);
  try{await mkdir(destination);}catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')throw new Error(`App ${name} already exists; no files were overwritten.`,{cause:error});throw error;}
  const title=name.split('-').map(part=>part[0]!.toUpperCase()+part.slice(1)).join(' ');
  async function copy(from:string,to:string):Promise<void>{
    for(const entry of await readdir(from,{withFileTypes:true})){
      if(entry.isSymbolicLink())throw new Error('Template symlinks are not supported.');
      if(entry.isDirectory()){await mkdir(join(to,entry.name));await copy(join(from,entry.name),join(to,entry.name));continue;}
      const content=(await readFile(join(from,entry.name),'utf8')).replaceAll('__APP_ID__',name).replaceAll('__APP_TITLE__',title);
      await writeFile(join(to,entry.name.replace(/\.tpl$/,'')),content,{flag:'wx'});
    }
  }
  try{await copy(join(projectRoot,'skeleton/template'),destination);}catch(error){await rm(destination,{recursive:true,force:true});throw error;}
  return destination;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const name=process.argv[2];if(!name||process.argv.length!==3)throw new Error('Usage: npm run new-app -- <lowercase-kebab-name>');
    const destination=await scaffold(name);console.log(`Created ${destination}`);
    console.log(`Run: npx tsx apps/${name}/run.ts\nTest: npx vitest run apps/${name}/test`);
  }catch(error){console.error(error instanceof Error?error.message:'Scaffolding failed');process.exitCode=1;}
}

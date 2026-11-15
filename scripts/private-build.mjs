// Next/Turbopack can retain runtime fs references in the Node proxy trace even
// when route tracing exclusions are configured. Remove private runtime inputs
// from deployment manifests; never read, copy, alter or delete the data itself.
import { readdir,readFile,writeFile } from 'node:fs/promises';
import { resolve,relative,dirname,join } from 'node:path';
const project=process.cwd(),build=join(project,'.next');
const isPrivate=file=>{const path=relative(project,file).replaceAll('\\','/');return path==='.demo-data'||path.startsWith('.demo-data/')||/^\.env(?:$|\.)/.test(path);};
async function traces(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())result.push(...await traces(path));else if(entry.name.endsWith('.nft.json'))result.push(path);}return result;}
let removed=0;const files=await traces(build);if(!files.length)throw new Error('No build traces were produced.');
for(const path of files){const trace=JSON.parse(await readFile(path,'utf8'));const keep=trace.files.filter(file=>!isPrivate(resolve(dirname(path),file)));removed+=trace.files.length-keep.length;if(keep.length!==trace.files.length)await writeFile(path,JSON.stringify({...trace,files:keep}));}
for(const path of files){const trace=JSON.parse(await readFile(path,'utf8'));if(trace.files.some(file=>isPrivate(resolve(dirname(path),file))))throw new Error('Private runtime inputs remain in a deployment trace.');}
console.log(`Private build check passed (${files.length} traces; ${removed} runtime references excluded).`);

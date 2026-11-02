import {promises as fs} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {assertNoSecrets} from '../src/sanitize.mjs';
import {validateCatalog} from '../src/model.mjs';
const root=new URL('../',import.meta.url);let scanned=0;
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){assert(!e.isSymbolicLink(),'Symlink rejected');const file=new URL(e.name+(e.isDirectory()?'/':''),dir);if(e.isDirectory()){await walk(file);continue;}if(!/\.(mjs|json|md|yml)$/.test(e.name))continue;const text=await fs.readFile(file,'utf8');assertNoSecrets(text);if(e.name.endsWith('.mjs')){const r=spawnSync(process.execPath,['--check',fileURLToPath(file)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}if(e.name.endsWith('.json'))JSON.parse(text);scanned++;}}
for(const dir of ['src/','scripts/','test/','config/','.github/'])await walk(new URL(dir,root));
for(const folder of ['data/','dist/']){
  let catalog;try{catalog=JSON.parse(await fs.readFile(new URL(folder+'catalog.json',root),'utf8'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
  validateCatalog(catalog);assert(catalog.items.length>=30&&catalog.items.length<=50,'Public catalog must contain 30–50 real listings');
  assert.equal(new Set(catalog.items.map(i=>i.id)).size,catalog.items.length,'Duplicate public product IDs');
  function privateFields(v){if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){assert(!/^(?:cookies?|authorization|headers|storageState|access_token|refresh_token|openid|unionid|buyer_name|creator_name|operator_name|supplier_delivery_address)$/i.test(k),`Private field rejected: ${k}`);privateFields(x);}}
  privateFields(catalog);assertNoSecrets(JSON.stringify(catalog));
  const status=JSON.parse(await fs.readFile(new URL(folder+'status.json',root),'utf8'));assertNoSecrets(JSON.stringify(status));
  if(folder==='dist/') {const html=await fs.readFile(new URL(folder+'index.html',root),'utf8');assert(!/<script\b/i.test(html),'Product HTML must not depend on client JavaScript');assert.equal((html.match(/<tr id="product-/g)??[]).length,catalog.items.length,'HTML rows missing');for(const i of catalog.items)assert(html.includes(`product-${i.id}`));}
}
console.log(JSON.stringify({passed:true,sourceFilesScanned:scanned}));

import {promises as fs} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {assertNoSecrets} from '../src/sanitize.mjs';
import {validateCatalog} from '../src/model.mjs';
import {publicCatalog} from '../src/catalog.mjs';
import {render} from '../src/render.mjs';
import {renderCatalogMarkdown,renderStatusMarkdown} from '../src/markdown.mjs';
const root=new URL('../',import.meta.url);let scanned=0;
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){assert(!e.isSymbolicLink(),'Symlink rejected');const file=new URL(e.name+(e.isDirectory()?'/':''),dir);if(e.isDirectory()){await walk(file);continue;}if(!/\.(mjs|json|md|yml)$/.test(e.name))continue;const text=await fs.readFile(file,'utf8');assertNoSecrets(text);if(e.name.endsWith('.mjs')){const r=spawnSync(process.execPath,['--check',fileURLToPath(file)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}if(e.name.endsWith('.json'))JSON.parse(text);scanned++;}}
for(const dir of ['src/','scripts/','test/','config/','.github/'])await walk(new URL(dir,root));
for(const folder of ['data/','dist/']){
  let catalog;try{catalog=JSON.parse(await fs.readFile(new URL(folder+'catalog.json',root),'utf8'));}catch(e){if(e.code==='ENOENT')continue;throw e;}
  validateCatalog(catalog);assert(catalog.items.length>=30&&catalog.items.length<=10000,'Public catalog must contain real, bounded listings');
  assert.equal(new Set(catalog.items.map(i=>i.id)).size,catalog.items.length,'Duplicate public product IDs');
  function privateFields(v){if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){assert(!/^(?:cookies?|authorization|headers|storageState|access_token|refresh_token|openid|unionid|buyer_name|creator_name|operator_name|supplier_delivery_address)$/i.test(k),`Private field rejected: ${k}`);privateFields(x);}}
  privateFields(catalog);assertNoSecrets(JSON.stringify(catalog));
  const status=JSON.parse(await fs.readFile(new URL(folder+'status.json',root),'utf8'));assertNoSecrets(JSON.stringify(status));
  if(folder==='dist/') {const html=await fs.readFile(new URL(folder+'index.html',root),'utf8');assert(!/<script\b/i.test(html),'Product HTML must not depend on client JavaScript');assert.equal((html.match(/<tr id="product-/g)??[]).length,catalog.items.length,'HTML rows missing');for(const i of catalog.items)assert(html.includes(`product-${i.id}`));}
}
const sourceCatalog=JSON.parse(await fs.readFile(new URL('data/catalog.json',root),'utf8'));
const sourceStatus=JSON.parse(await fs.readFile(new URL('data/status.json',root),'utf8'));
const queue=JSON.parse(await fs.readFile(new URL('data/queue.json',root),'utf8'));
assert.equal(queue.schemaVersion,1);assert(Array.isArray(queue.entries));
assert.equal(new Set(queue.entries.map(entry=>entry.id)).size,queue.entries.length,'Duplicate queue ID');
for(const entry of queue.entries)assert(Number.isSafeInteger(entry.id)&&entry.id>0,'Invalid queue ID');
assertNoSecrets(JSON.stringify(queue));
const published=publicCatalog(sourceCatalog,sourceStatus);
const expected={
  'catalog.json':JSON.stringify(published,null,2)+'\n',
  'status.json':JSON.stringify(sourceStatus,null,2)+'\n',
  'catalog.md':renderCatalogMarkdown(published,sourceStatus),
  'status.md':renderStatusMarkdown(published,sourceStatus),
};
const hasDist=await fs.stat(new URL('dist/index.html',root)).then(()=>true).catch(error=>{if(error.code==='ENOENT')return false;throw error;});
for(const folder of hasDist?['','dist/']:[''])for(const [file,content]of Object.entries(expected)){
  assert.equal(await fs.readFile(new URL(folder+file,root),'utf8'),content,`${folder}${file} differs from the published snapshot`);
}
if(hasDist)for(const [file,filter]of [['index.html','all'],['in-stock.html','available'],['under-200.html','under200'],['france.html','france']]){
  const html=await fs.readFile(new URL('dist/'+file,root),'utf8');
  assert.equal(html,render(published,sourceStatus,{filter}),`${file} differs from the published snapshot`);
  const canonical='https://ataraxiary.github.io/wineradar-catalog/'+(file==='index.html'?'':file);
  assert(html.includes(`<link rel="canonical" href="${canonical}">`),`${file} has no matching canonical URL`);
  assert(html.includes('<meta name="robots" content="index, follow">'),'HTML indexing meta tag missing');
  assert(!/<meta\s+name="robots"[^>]*noindex/i.test(html),'HTML unexpectedly restricts indexing');
}
const markdown=expected['catalog.md'];
assert.equal((markdown.match(/^\| \d+ \|/gm)??[]).length,published.items.reduce((n,item)=>n+item.offers.length,0),'Markdown SKU rows missing');
for(const item of published.items)assert(markdown.includes(`[原商品](${item.url})`),`Markdown source link missing for ${item.id}`);
if(hasDist){
  const sitemap=await fs.readFile(new URL('dist/sitemap.xml',root),'utf8');
  for(const path of ['catalog.md','status.md','index.html'])assert(sitemap.includes(path==='index.html'?'wineradar-catalog/':`wineradar-catalog/${path}`),`${path} missing from sitemap`);
  const robots=await fs.readFile(new URL('dist/robots.txt',root),'utf8');
  assert(robots.includes('Allow: /')&&robots.includes('sitemap.xml'),'Project robots file is missing discovery links');
}
console.log(JSON.stringify({passed:true,sourceFilesScanned:scanned}));

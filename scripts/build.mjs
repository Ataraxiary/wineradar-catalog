import {promises as fs} from 'node:fs';
import {render} from '../src/render.mjs';
import {publicCatalog} from '../src/catalog.mjs';
import {renderCatalogMarkdown,renderStatusMarkdown} from '../src/markdown.mjs';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root);await fs.mkdir(dist,{recursive:true});
let catalog=null;try{catalog=JSON.parse(await fs.readFile(new URL('data/catalog.json',root),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const status=JSON.parse(await fs.readFile(new URL('data/status.json',root),'utf8'));
const published=publicCatalog(catalog,status);
for(const [file,filter]of [['index.html','all'],['in-stock.html','available'],['under-200.html','under200'],['france.html','france']])await fs.writeFile(new URL(file,dist),render(published,status,{filter}));
const outputs={
  'catalog.json':JSON.stringify(published,null,2)+'\n',
  'status.json':JSON.stringify(status,null,2)+'\n',
  'catalog.md':renderCatalogMarkdown(published,status),
  'status.md':renderStatusMarkdown(published,status),
};
for(const [file,content]of Object.entries(outputs)){
  await fs.writeFile(new URL(file,dist),content);
  await fs.writeFile(new URL(file,root),content);
}
await fs.writeFile(new URL('.nojekyll',dist),'');await fs.writeFile(new URL('robots.txt',dist),'User-agent: *\nAllow: /\nSitemap: https://ataraxiary.github.io/wineradar-catalog/sitemap.xml\n');
await fs.writeFile(new URL('sitemap.xml',dist),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['','in-stock.html','under-200.html','france.html','catalog.md','status.md'].map(path=>`<url><loc>https://ataraxiary.github.io/wineradar-catalog/${path}</loc></url>`).join('')+'</urlset>');
console.log(JSON.stringify({built:true,itemCount:catalog?.items?.length??0,state:status.state,directory:'dist/'}));

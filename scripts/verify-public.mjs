import assert from 'node:assert/strict';
import {renderCatalogMarkdown,renderStatusMarkdown} from '../src/markdown.mjs';
const base='https://ataraxiary.github.io/wineradar-catalog/';
const expectedRun=process.env.GITHUB_RUN_ID?`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`:null;
const publicationOnly=process.env.PUBLICATION_ONLY==='true';
let lastError;
for(let attempt=1;attempt<=4;attempt++){
  try{
    const fetchText=async path=>{const response=await fetch(base+path,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});assert.equal(response.status,200,`${path}: HTTP ${response.status}`);assert(!/noindex/i.test(response.headers.get('x-robots-tag')??''),`${path}: X-Robots-Tag blocks indexing`);return response.text();};
    const html=await fetchText('index.html'),catalog=JSON.parse(await fetchText('catalog.json')),status=JSON.parse(await fetchText('status.json'));
    const catalogMd=await fetchText('catalog.md'),statusMd=await fetchText('status.md');
    const sitemap=await fetchText('sitemap.xml'),robots=await fetchText('robots.txt');
    assert(catalog.items.length>=30&&catalog.items.length<=50,'Unexpected public listing count');
    assert(!/<script\b/i.test(html),'Client JavaScript dependency detected');
    assert.equal((html.match(/<tr id="product-/g)??[]).length,catalog.items.length,'Missing server-rendered rows');
    for(const item of catalog.items)assert(html.includes(`product-${item.id}`));
    assert.equal(catalogMd,renderCatalogMarkdown(catalog,status),'Public Markdown catalog differs from JSON');
    assert.equal(statusMd,renderStatusMarkdown(catalog,status),'Public Markdown status differs from JSON');
    assert(html.includes('<link rel="canonical" href="https://ataraxiary.github.io/wineradar-catalog/">'),'Canonical link missing');
    assert(html.includes('href="catalog.md"')&&html.includes('href="status.md"'),'Markdown navigation missing');
    assert(sitemap.includes('/wineradar-catalog/catalog.md')&&sitemap.includes('/wineradar-catalog/status.md'),'Markdown sitemap entries missing');
    assert(robots.includes('Allow: /')&&robots.includes('sitemap.xml'),'Project robots file incomplete');
    if(publicationOnly){
      assert.equal(status.state,'failed','Retained-data publication requires a recorded failed collection');
      assert.equal(status.unknownCount,catalog.items.length,'All current inventory must be unknown after full failure');
      assert(catalog.items.every(item=>item.availability==='unknown'&&item.offers.every(offer=>offer.inventory===null)),'Stale inventory was published as current');
    }else{
      if(expectedRun)assert.equal(status.runUrl,expectedRun,'CDN still serves an older collection');
      assert(status.freshItemCount>=30&&status.state!=='failed','Fresh cloud collection did not reach 30 listings; previous data is retained');
    }
    console.log(JSON.stringify({verified:true,anonymous:true,publicationOnly,url:base,items:catalog.items.length,fresh:status.freshItemCount,generatedAt:catalog.generatedAt,runUrl:status.runUrl}));process.exit(0);
  }catch(e){lastError=e;if(attempt<4)await new Promise(resolve=>setTimeout(resolve,12000));}
}
throw lastError;

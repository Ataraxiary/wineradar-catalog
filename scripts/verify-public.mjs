import assert from 'node:assert/strict';
const base='https://ataraxiary.github.io/wineradar-catalog/';
const expectedRun=process.env.GITHUB_RUN_ID?`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`:null;
const publicationOnly=process.env.PUBLICATION_ONLY==='true';
let lastError;
for(let attempt=1;attempt<=4;attempt++){
  try{
    const fetchText=async path=>{const response=await fetch(base+path,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});assert.equal(response.status,200,`${path}: HTTP ${response.status}`);return response.text();};
    const html=await fetchText('index.html'),catalog=JSON.parse(await fetchText('catalog.json')),status=JSON.parse(await fetchText('status.json'));
    assert(catalog.items.length>=30&&catalog.items.length<=50,'Unexpected public listing count');
    assert(!/<script\b/i.test(html),'Client JavaScript dependency detected');
    assert.equal((html.match(/<tr id="product-/g)??[]).length,catalog.items.length,'Missing server-rendered rows');
    for(const item of catalog.items)assert(html.includes(`product-${item.id}`));
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

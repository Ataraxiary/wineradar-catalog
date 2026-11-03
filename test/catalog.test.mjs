import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildCatalog,validateCatalog} from '../src/model.mjs';
import {assemble,itemView,collectionStatus,publicCatalog} from '../src/catalog.mjs';
import {addVisibleVintage,responseKind,deadline,recoverPublicApis} from '../src/browser.mjs';
import {productCandidates,selectBalanced} from '../src/discovery.mjs';
import {robotsAllows} from '../src/robots.mjs';
import {render,escapeHtml} from '../src/render.mjs';
import {renderCatalogMarkdown,renderStatusMarkdown} from '../src/markdown.mjs';
import {mergeQueue,planBatch,recordQueueAttempt,queueStats,exceedsFailureRate} from '../src/queue.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/197683.json',import.meta.url),'utf8'));
const bundleFixture=JSON.parse(await readFile(new URL('./fixtures/195117.json',import.meta.url),'utf8'));
const recoveryFixture=JSON.parse(await readFile(new URL('./fixtures/194377.json',import.meta.url),'utf8'));
const fresh=()=>buildCatalog(structuredClone(fixture));
const options={startedAt:'2026-11-03T00:00:00.000Z',finishedAt:'2026-11-03T00:01:00.000Z',discovery:{channels:[]}};

test('original three levels and same-SKU conflict survive catalog aggregation',()=>{
  const c=assemble([fresh()],options);validateCatalog(c);
  assert.equal(c.wines[0].sourceProductId,127101);assert.equal(c.listings[0].sourceListingId,197683);assert.equal(c.skus[0].sourcePackageId,394492);
  assert.equal(c.items[0].availability,'available');assert.equal(c.items[0].offers[0].inventory,2);assert.equal(c.conflicts[0].staticQuantity,0);
});
test('real four-wine bundle keeps live names and unknown fields when detail omits two wines',()=>{
  const catalog=buildCatalog(structuredClone(bundleFixture));validateCatalog(catalog);
  assert.equal(catalog.listings[0].sourceListingId,195117);
  assert.deepEqual(catalog.wines.map(w=>w.sourceProductId).sort(),[125908,125909,125910,125911]);
  for(const id of [125909,125911]){
    const wine=catalog.wines.find(w=>w.sourceProductId===id);
    assert.equal(wine.nameSource,'live_sku_product_list');
    assert.equal(wine.country,null);assert.equal(wine.vintage,null);
    assert(wine.name.includes('葡萄酒'));
  }
  assert.equal(catalog.skus[0].components.length,4);
  assert(Number.isSafeInteger(catalog.skus[0].inventory.quantity));
  const published=assemble([catalog],{...options,maxListings:10});
  const status=collectionStatus({catalog:published,...options,successCount:1,attemptedCount:1,errors:[],minimum:1,target:1});
  assert.equal(published.items[0].vintageUnknownCount,2);
  assert.equal(published.items[0].countryUnknownCount,2);
  assert(renderCatalogMarkdown(published,status).includes('2026 / 部分未标示'));
  assert(render(published,status).includes('2026 / 部分未标示'));
});
test('missing both detail and live component name stays a parsing failure',()=>{
  const input=structuredClone(bundleFixture);
  delete input.live.data.packageList[0].product_list.find(w=>w.product_id===125909).product_name;
  assert.throws(()=>buildCatalog(input),/Missing wine details and live product name for product 125909/);
});
test('observed public detail URL recovers one stalled regular product with bounded API reads',async()=>{
  const calls=[],detailUrl='https://img.vinehoo.com/vinehoo/client/commodities/periods/194377.json?t=1&isJson=true&id=194377';
  const context={request:{get:async url=>{
    calls.push(url);
    const payload=url.includes('/periods/194377.json')?recoveryFixture.detail:recoveryFixture.live;
    return {url:()=>url,status:()=>200,body:async()=>Buffer.from(JSON.stringify(payload)),dispose:async()=>{}};
  }}};
  const snapshot=await recoverPublicApis(context,{id:194377,detailUrl,config:{timeoutPerPageMs:45000,minimumPauseMs:8000},pauseFn:async()=>{}});
  assert.equal(snapshot.listings[0].sourceListingId,194377);
  assert.equal(snapshot.listings[0].verificationMethod,'public_api_recovery');
  assert(Number.isSafeInteger(snapshot.skus[0].inventory.quantity));
  assert.equal(calls.length,2);
  assert(calls[1].includes('period=194377&periods_type=0'));
});
test('public API recovery stops on access control without requesting inventory',async()=>{
  const calls=[];
  const context={request:{get:async url=>{calls.push(url);return {url:()=>url,status:()=>429,dispose:async()=>{}};}}};
  await assert.rejects(recoverPublicApis(context,{id:194377,detailUrl:'https://img.vinehoo.com/vinehoo/client/commodities/periods/194377.json',config:{timeoutPerPageMs:45000,minimumPauseMs:8000},pauseFn:async()=>{}}),error=>error.code==='access_control'&&error.stop);
  assert.equal(calls.length,1);
});
test('request failure never becomes sold-out and last known quantity is retained separately',()=>{
  const s=fresh();const item=itemView(s.listings[0],s.skus,s.wines,{code:'request_failed'});
  assert.equal(item.availability,'unknown');assert.equal(item.offers[0].inventory,null);assert.equal(item.offers[0].lastKnownInventory,2);
});
test('only real zero inventories produce sold-out; missing or off-sale values stay unknown',()=>{
  const s=fresh(),l=s.listings[0];s.skus[0].inventory.quantity=0;
  assert.equal(itemView(l,s.skus,s.wines).availability,'sold_out');
  s.skus[0].inventory.quantity=null;s.skus[0].inventory.availability='unknown';assert.equal(itemView(l,s.skus,s.wines).availability,'unknown');
});
test('updating an existing listing does not duplicate the listing, SKU or wine',()=>{
  const previous=assemble([fresh()],options),snapshot=fresh();
  snapshot.skus[0].price.amount='2000.00';const next=assemble([snapshot],{...options,previous});
  assert.equal(next.items.length,1);assert.equal(next.skus.length,1);assert.equal(next.items[0].minPrice,2000);
});
test('partial update preserves old listing data and marks failed listing unknown',()=>{
  const previous=assemble([fresh()],options);
  const next=assemble([],{...options,previous,errors:[{id:197683,code:'response_timeout'}]});
  assert.equal(next.items.length,1);assert.equal(next.items[0].availability,'unknown');assert.equal(next.items[0].offers[0].lastKnownInventory,2);
});
test('complete collection failure retains last success timestamp and suspended state',()=>{
  const c=assemble([fresh()],options);const status=collectionStatus({catalog:c,previousStatus:{lastSuccessAt:'2026-11-02T00:00:00.000Z',collectionSuspended:true},...options,successCount:0,attemptedCount:1,errors:[{code:'request_failed'}],minimum:1});
  assert.equal(status.state,'failed');assert.equal(status.retainedPreviousData,true);assert.equal(status.lastSuccessAt,'2026-11-02T00:00:00.000Z');assert.equal(status.collectionSuspended,true);
});
test('partial collection records its successful observation time',()=>{
  const c=assemble([fresh()],options);
  const status=collectionStatus({catalog:c,previousStatus:{lastSuccessAt:'2026-11-02T00:00:00.000Z'},...options,successCount:1,attemptedCount:2,errors:[{code:'response_timeout'}],minimum:1,target:2});
  assert.equal(status.state,'partial');
  assert.equal(status.lastSuccessAt,options.finishedAt);
  assert.equal(status.detailSuccessRate,0.5);
  assert.equal(status.durationSeconds,60);
});
test('failed publication retains observations but makes all current inventory unknown',()=>{
  const c=assemble([fresh()],options),status=collectionStatus({catalog:c,previousStatus:{lastSuccessAt:options.finishedAt},...options,successCount:0,attemptedCount:3,errors:[{code:'response_timeout'}],minimum:1});
  const published=publicCatalog(c,status);
  assert.equal(status.availableCount,0);assert.equal(status.unknownCount,1);
  assert.equal(published.items[0].availability,'unknown');assert.equal(published.items[0].offers[0].inventory,null);
  assert.equal(published.items[0].offers[0].lastKnownInventory,2);
  assert.equal(c.items[0].availability,'available');assert.equal(c.items[0].offers[0].inventory,2);
});
test('unrefreshed listing in a partial batch stays unknown',()=>{
  const previous=assemble([fresh()],options);
  const next=assemble([],{...options,previous,errors:[]});
  assert.equal(next.items[0].availability,'unknown');assert.equal(next.items[0].collectionStatus,'failed');
});
test('discovery deduplicates and round-robins across actual source channels',()=>{
  const products=productCandidates({data:{list:[{id:197683,title:'Wine',price:1999,periods_type:0},{id:1,title:'News',price:2},{id:197684,title:'Not wine',price:10,periods_type:1,product_category:['咖啡']}]}});
  assert.deepEqual(products.map(p=>p.id),[197683]);
  const selected=selectBalanced([{id:1,sources:[{channel:'home'},{channel:'activity'}]},{id:2,sources:[{channel:'home'}]},{id:3,sources:[{channel:'category'}]}],3);
  assert.equal(new Set(selected.map(p=>p.id)).size,3);assert(selected.some(p=>p.id===3));
});
test('both ordinary and flash live SKU response paths are accepted only for the exact ID',()=>{
  for(const suffix of ['getPeriodsPackageInventory','getPeriodsSecondPackageInventory'])assert.equal(responseKind(`https://h5.vinehoo.com/api/commodities/v3/package/${suffix}?period=197683`,197683),'inventory');
  assert.equal(responseKind('https://evil.example/api/commodities/v3/package/getPeriodsPackageInventory?period=197683',197683),null);
  assert.equal(responseKind('https://h5.vinehoo.com/api/commodities/v3/package/getPeriodsPackageInventory?period=197684',197683),null);
});
test('year enrichment uses a matching visible wine name and does not guess from unrelated prose',()=>{
  const s=fresh();s.wines[0].name='Specific Wine';s.wines[0].vintage=null;
  addVisibleVintage(s,'Unrelated 2024 article. Specific Wine 2018');assert.equal(s.wines[0].vintage,2018);assert.equal(s.wines[0].vintageSource,'visible_product_heading');
  s.wines[0].vintage=null;addVisibleVintage(s,'Unrelated Wine 2024');assert.equal(s.wines[0].vintage,null);
  s.wines[0].name='2022 Specific Wine';addVisibleVintage(s,'');assert.equal(s.wines[0].vintage,2022);assert.equal(s.wines[0].vintageSource,'leading_year_in_product_name');
});
test('robots policy follows longest matching allow/disallow rule',()=>{
  const robots='User-agent: *\nDisallow: /private\nAllow: /private/public\n';
  assert.equal(robotsAllows(robots,'/pages/goods-detail/goods-detail'),true);assert.equal(robotsAllows(robots,'/private/test'),false);assert.equal(robotsAllows(robots,'/private/public/test'),true);
  assert.equal(robotsAllows('User-agent: WineRadarCatalog\nDisallow: /\n','/'),false);
});
test('rendered HTML contains actual rows without JavaScript and escapes retailer strings',()=>{
  const c=assemble([fresh()],options);c.items[0].wineNames=['<img src=x onerror=alert(1)>'];
  const status=collectionStatus({catalog:c,...options,successCount:1,attemptedCount:1,errors:[],minimum:1,target:1});
  const html=render(c,status);assert(html.includes('product-197683'));assert(html.includes('¥1999.00'));assert(html.includes('2010'));assert(html.includes('库存 2'));assert(!/<script\b/i.test(html));assert(!html.includes('<img src=x'));assert.equal(escapeHtml('"<&'), '&quot;&lt;&amp;');
});
test('failed refresh HTML marks current availability unknown while preserving product content',()=>{
  const c=assemble([fresh()],options);const html=render(c,{state:'failed',itemCount:1,errors:[]});
  assert(html.includes('保留上一份有效数据'));assert(html.includes('product-197683'));assert(html.includes('badge unknown'));
});
test('static filters are generated from data rather than browser scripts',()=>{
  const c=assemble([fresh()],options),status={state:'ok',errors:[]};
  assert(!render(c,status,{filter:'under200'}).includes('<tr id="product-197683"'));
  assert(render(c,status,{filter:'available'}).includes('<tr id="product-197683"'));
});
test('Markdown records SKU stock and last verified time without presenting retained stock as current',()=>{
  const c=assemble([fresh()],options),status=collectionStatus({catalog:c,...options,successCount:0,attemptedCount:1,errors:[{code:'response_timeout'}],minimum:1});
  const published=publicCatalog(c,status),markdown=renderCatalogMarkdown(published,status),state=renderStatusMarkdown(published,status);
  assert(markdown.includes('| 197683 |'));assert(markdown.includes('¥1999.00'));
  assert(markdown.includes('| 未知 | 未知 | 未知 |'));
  assert(markdown.includes('https://h5.vinehoo.com/pages/goods-detail/goods-detail?id=197683'));
  assert(markdown.includes('库存最后验证时间（北京时间）'));
  assert(state.includes('| 采集状态 | failed |'));
  assert(state.includes('| 当前库存未知商品数 | 1 |'));
});
test('persistent queue deduplicates discovery and cools failed products without losing verified history',()=>{
  const now='2026-11-03T00:00:00.000Z';
  const queue=mergeQueue(null,[{id:197683,title:'Wine',sources:[]},{id:197683,title:'Wine',sources:[]},{id:197684,title:'Other',sources:[]}],[],now);
  assert.equal(queueStats(queue).discoveredCount,2);
  recordQueueAttempt(queue,197683,{at:now,success:true});
  recordQueueAttempt(queue,197684,{at:now,code:'response_timeout'});
  assert.equal(queueStats(queue).verifiedCount,1);
  assert.deepEqual(planBatch(queue,{maxAttempts:2,now}),[{id:197683,title:'Wine',sources:[]}]);
  assert.equal(planBatch(queue,{maxAttempts:2,now:'2026-11-03T13:00:00.000Z'})[0].id,197684);
});
test('narrower discovery cannot discard candidates found in earlier workflows',()=>{
  const first=mergeQueue(null,[{id:190001,title:'A',sources:[]},{id:190002,title:'B',sources:[]},{id:190003,title:'C',sources:[]}],[],'2026-11-03T00:00:00.000Z');
  recordQueueAttempt(first,190001,{at:'2026-11-03T00:01:00.000Z',success:true});
  const second=mergeQueue(first,[{id:190003,title:'C',sources:[]}],[],'2026-11-03T12:00:00.000Z');
  assert.deepEqual(second.entries.map(entry=>entry.id),[190001,190002,190003]);
  assert.equal(queueStats(second).discoveredCount,3);
  assert.equal(queueStats(second).unverifiedCandidateCount,2);
  assert.equal(queueStats(second).verifiedCount,1);
  assert.equal(second.entries[0].lastVerifiedAt,'2026-11-03T00:01:00.000Z');
});
test('bounded collection stops on sustained failures but ignores excluded non-wine products',()=>{
  const threshold={minimumSample:8,maximumRate:0.4};
  assert.equal(exceedsFailureRate(Array(4).fill({code:'response_timeout'}),7,threshold),false);
  assert.equal(exceedsFailureRate(Array(3).fill({code:'response_timeout'}),8,threshold),false);
  assert.equal(exceedsFailureRate(Array(4).fill({code:'response_timeout'}),8,threshold),true);
  assert.equal(exceedsFailureRate([{code:'not_wine'},...Array(3).fill({code:'response_timeout'})],8,threshold),false);
});
test('incremental queue reserves some capacity for oldest verified products',()=>{
  const at='2026-11-03T00:00:00.000Z';
  const candidates=Array.from({length:10},(_,i)=>({id:197680+i,title:`Wine ${i}`,sources:[]}));
  const queue=mergeQueue(null,candidates,[],at);
  for(const entry of candidates.slice(0,5))recordQueueAttempt(queue,entry.id,{at,success:true});
  const planned=planBatch(queue,{maxAttempts:5,now:'2026-11-03T01:00:00.000Z'});
  assert.equal(planned.length,5);
  assert.equal(planned.filter(entry=>entry.id<197685).length,1);
  assert.equal(planned.filter(entry=>entry.id>=197685).length,4);
});
test('discovery response waits have a finite, classified deadline',async()=>{
  await assert.rejects(deadline(new Promise(()=>{}),10,'discovery_response_timeout'),error=>error.code==='discovery_response_timeout');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildCatalog,validateCatalog} from '../src/model.mjs';
import {assemble,itemView,collectionStatus,publicCatalog} from '../src/catalog.mjs';
import {addVisibleVintage,responseKind} from '../src/browser.mjs';
import {productCandidates,selectBalanced} from '../src/discovery.mjs';
import {robotsAllows} from '../src/robots.mjs';
import {render,escapeHtml} from '../src/render.mjs';
import {renderCatalogMarkdown,renderStatusMarkdown} from '../src/markdown.mjs';
import {mergeQueue,planBatch,recordQueueAttempt,queueStats} from '../src/queue.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/197683.json',import.meta.url),'utf8'));
const fresh=()=>buildCatalog(structuredClone(fixture));
const options={startedAt:'2026-11-03T00:00:00.000Z',finishedAt:'2026-11-03T00:01:00.000Z',discovery:{channels:[]}};

test('original three levels and same-SKU conflict survive catalog aggregation',()=>{
  const c=assemble([fresh()],options);validateCatalog(c);
  assert.equal(c.wines[0].sourceProductId,127101);assert.equal(c.listings[0].sourceListingId,197683);assert.equal(c.skus[0].sourcePackageId,394492);
  assert.equal(c.items[0].availability,'available');assert.equal(c.items[0].offers[0].inventory,2);assert.equal(c.conflicts[0].staticQuantity,0);
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

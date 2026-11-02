import {promises as fs} from 'node:fs';
import assert from 'node:assert/strict';
import {openBrowser,observeProduct,pause} from '../src/browser.mjs';
import {discover} from '../src/discovery.mjs';
import {assemble,collectionStatus} from '../src/catalog.mjs';
import {checkRobots} from '../src/robots.mjs';
import {clean,assertNoSecrets} from '../src/sanitize.mjs';
import {mergeQueue,planBatch,recordQueueAttempt,queueStats} from '../src/queue.mjs';
const root=new URL('../',import.meta.url),data=new URL('data/',root),artifacts=new URL('artifacts/',root);
await fs.mkdir(data,{recursive:true});await fs.mkdir(artifacts,{recursive:true});
async function read(name){try{return JSON.parse(await fs.readFile(new URL(name,data),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;return null;}}
async function write(name,value){const text=JSON.stringify(clean(value),null,2)+'\n';assertNoSecrets(text);const target=new URL(name,data),temporary=new URL(name+'.tmp',data);await fs.writeFile(temporary,text);await fs.rename(temporary,target);}
const previous=await read('catalog.json'),previousStatus=await read('status.json'),previousQueue=await read('queue.json');
const config=JSON.parse(await fs.readFile(new URL('config/collection.json',root),'utf8'));
config.previousListings=previous?.items??[];
assert(config.target>=5&&config.target<=50&&config.maximumAttempts<=50&&config.minimumPauseMs>=4000);
assert(config.maximumDiscoveryPages<=14&&config.maximumScrollsPerChannel<=2&&config.maximumDiscoveryCandidates<=10000);
const startedAt=new Date().toISOString(),snapshots=[],errors=[];let discovery={channels:[],scope:'not_started'},robots=null,attemptedCount=0,stoppedReason=null,browser,queue=previousQueue,catalog=previous;
const runUrl=process.env.GITHUB_ACTIONS==='true'?`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`:null;
try {
  if(previousStatus?.collectionSuspended)throw Object.assign(new Error('Collection remains suspended after an access-control response; manual review required'),{code:'collection_suspended',stop:true});
  const opened=await openBrowser();browser=opened.browser;const context=opened.context;
  robots=await checkRobots(context,['/pages/miaofa/miaofa','/','/activities-v3/ColumnActivity','/pages/goods-detail/goods-detail']);
  discovery=await discover(context,config);discovery.robots=robots;
  await fs.writeFile(new URL('discovery.json',artifacts),JSON.stringify(clean(discovery),null,2)+'\n');
  queue=mergeQueue(previousQueue,discovery.candidates,previous?.items,startedAt);
  await write('queue.json',queue);
  let consecutive=0;
  for(const candidate of planBatch(queue,{maxAttempts:config.maximumAttempts,now:startedAt})){
    if(snapshots.length>=config.target||attemptedCount>=config.maximumAttempts)break;
    attemptedCount++;
    try {const snapshot=await observeProduct(context,candidate,config);
      const {candidates:omitted,...checkpointCoverage}=discovery;
      const checkpoint=assemble([...snapshots,snapshot],{previous,errors,discovery:checkpointCoverage,startedAt,finishedAt:new Date().toISOString(),runUrl,maxListings:config.maximumCatalogListings});
      await write('catalog.json',checkpoint);catalog=checkpoint;snapshots.push(snapshot);
      recordQueueAttempt(queue,candidate.id,{at:new Date().toISOString(),success:true});await write('queue.json',queue);
      await fs.writeFile(new URL('snapshots.json',artifacts),JSON.stringify(snapshots,null,2)+'\n');
      consecutive=0;console.log(JSON.stringify({id:candidate.id,status:'ok',successCount:snapshots.length,attemptedCount,skus:snapshot.skus.length}));}
    catch(e){const error={id:candidate.id,code:e.code??'request_failed',message:clean(String(e.message).split('\n')[0].slice(0,220)),diagnostics:clean(e.diagnostics??null),at:new Date().toISOString()};errors.push(error);recordQueueAttempt(queue,candidate.id,{at:error.at,code:error.code});await write('queue.json',queue);console.log(JSON.stringify({...error,status:'unknown'}));if(e.code!=='not_wine')consecutive++;if(e.stop||consecutive>=config.maximumConsecutiveFailures){stoppedReason=error;break;}if(e.code==='response_timeout')await pause(30000);}
    await pause(config.minimumPauseMs);
  }
}catch(e){stoppedReason={code:e.code??'collection_failed',message:clean(String(e.message).split('\n')[0].slice(0,220)),at:new Date().toISOString()};errors.push(stoppedReason);}
finally {if(browser)await browser.close().catch(()=>{});}
const finishedAt=new Date().toISOString();
const {candidates:discardedCandidates,...coverage}=discovery;discovery=coverage;
if(snapshots.length&&(previous||snapshots.length>=config.minimumFirstBatch)){
  catalog=assemble(snapshots,{previous,errors,discovery,startedAt,finishedAt,runUrl,maxListings:config.maximumCatalogListings});await write('catalog.json',catalog);
}
const status=collectionStatus({catalog,previousStatus,startedAt,finishedAt,successCount:snapshots.length,attemptedCount,errors,discovery,minimum:config.minimumFirstBatch,target:config.target,stoppedReason,runUrl});
if(queue)status.queue=queueStats(queue);
status.detailVerifiedCount=catalog?.listings?.length??0;
status.skuEverVerifiedCount=catalog?.skus?.filter(s=>Number.isSafeInteger(s.inventory.quantity)).length??0;
status.freshSkuVerifiedCount=snapshots.reduce((n,s)=>n+s.skus.filter(k=>Number.isSafeInteger(k.inventory.quantity)).length,0);
status.countryCounts=Object.entries((catalog?.items??[]).reduce((counts,item)=>{
  for(const country of new Set(item.countries.length?item.countries:['未标示']))counts[country]=(counts[country]??0)+1;
  return counts;
},{})).map(([country,count])=>({country,count})).sort((a,b)=>b.count-a.count||a.country.localeCompare(b.country));
if(robots)status.robots=robots;
await write('status.json',status);
await fs.writeFile(new URL('collection-result.json',artifacts),JSON.stringify(status,null,2)+'\n');
console.log(JSON.stringify({state:status.state,freshItemCount:status.freshItemCount,itemCount:status.itemCount,failedCount:status.failedCount,stoppedReason}));
if(status.state==='failed')process.exitCode=1;

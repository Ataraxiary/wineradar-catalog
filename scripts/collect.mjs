import {promises as fs} from 'node:fs';
import assert from 'node:assert/strict';
import {openBrowser,observeProduct,pause} from '../src/browser.mjs';
import {discover} from '../src/discovery.mjs';
import {assemble,collectionStatus} from '../src/catalog.mjs';
import {checkRobots} from '../src/robots.mjs';
import {clean,assertNoSecrets} from '../src/sanitize.mjs';
const root=new URL('../',import.meta.url),data=new URL('data/',root),artifacts=new URL('artifacts/',root);
await fs.mkdir(data,{recursive:true});await fs.mkdir(artifacts,{recursive:true});
async function read(name){try{return JSON.parse(await fs.readFile(new URL(name,data),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;return null;}}
async function write(name,value){const text=JSON.stringify(clean(value),null,2)+'\n';assertNoSecrets(text);const target=new URL(name,data),temporary=new URL(name+'.tmp',data);await fs.writeFile(temporary,text);await fs.rename(temporary,target);}
const previous=await read('catalog.json'),previousStatus=await read('status.json');
const config=JSON.parse(await fs.readFile(new URL('config/collection.json',root),'utf8'));
config.previousListings=previous?.items??[];
assert(config.target>=30&&config.target<=50&&config.maximumAttempts<=50&&config.minimumPauseMs>=4000);
const startedAt=new Date().toISOString(),snapshots=[],errors=[];let discovery={channels:[],scope:'not_started'},robots=null,attemptedCount=0,stoppedReason=null,browser;
const runUrl=process.env.GITHUB_ACTIONS==='true'?`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`:null;
try {
  if(previousStatus?.collectionSuspended)throw Object.assign(new Error('Collection remains suspended after an access-control response; manual review required'),{code:'collection_suspended',stop:true});
  const opened=await openBrowser();browser=opened.browser;const context=opened.context;
  robots=await checkRobots(context,['/pages/miaofa/miaofa','/','/activities-v3/ColumnActivity','/pages/goods-detail/goods-detail']);
  discovery=await discover(context,config);discovery.robots=robots;
  await fs.writeFile(new URL('discovery.json',artifacts),JSON.stringify(clean(discovery),null,2)+'\n');
  let consecutive=0;
  for(const candidate of discovery.candidates){
    if(snapshots.length>=config.target||attemptedCount>=config.maximumAttempts)break;
    attemptedCount++;
    try {const snapshot=await observeProduct(context,candidate,config);snapshots.push(snapshot);await fs.writeFile(new URL('snapshots.json',artifacts),JSON.stringify(snapshots,null,2)+'\n');consecutive=0;console.log(JSON.stringify({id:candidate.id,status:'ok',successCount:snapshots.length,attemptedCount,skus:snapshot.skus.length}));}
    catch(e){const error={id:candidate.id,code:e.code??'request_failed',message:clean(String(e.message).split('\n')[0].slice(0,220)),diagnostics:clean(e.diagnostics??null),at:new Date().toISOString()};errors.push(error);console.log(JSON.stringify({...error,status:'unknown'}));if(e.code!=='not_wine')consecutive++;if(e.stop||consecutive>=config.maximumConsecutiveFailures){stoppedReason=error;break;}if(e.code==='response_timeout')await pause(30000);}
    await pause(config.minimumPauseMs);
  }
}catch(e){stoppedReason={code:e.code??'collection_failed',message:clean(String(e.message).split('\n')[0].slice(0,220)),at:new Date().toISOString()};errors.push(stoppedReason);}
finally {if(browser)await browser.close().catch(()=>{});}
const finishedAt=new Date().toISOString();let catalog=previous;
const {candidates:discardedCandidates,...coverage}=discovery;discovery=coverage;
if(snapshots.length&&(previous||snapshots.length>=config.minimumFirstBatch)){
  catalog=assemble(snapshots,{previous,errors,discovery,startedAt,finishedAt,runUrl,maxListings:50});await write('catalog.json',catalog);
}
const status=collectionStatus({catalog,previousStatus,startedAt,finishedAt,successCount:snapshots.length,attemptedCount,errors,discovery,minimum:config.minimumFirstBatch,target:config.target,stoppedReason,runUrl});
if(robots)status.robots=robots;
await write('status.json',status);
await fs.writeFile(new URL('collection-result.json',artifacts),JSON.stringify(status,null,2)+'\n');
console.log(JSON.stringify({state:status.state,freshItemCount:status.freshItemCount,itemCount:status.itemCount,failedCount:status.failedCount,stoppedReason}));
if(status.state==='failed')process.exitCode=1;

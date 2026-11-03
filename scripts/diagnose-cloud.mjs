import {promises as fs} from 'node:fs';
import assert from 'node:assert/strict';
import {openBrowser,observeProduct,pause,responseKind} from '../src/browser.mjs';
import {assertNoSecrets,clean} from '../src/sanitize.mjs';

// Existing published or queued IDs only. This probe does not discover IDs or publish data.
const requested=process.env.WINERADAR_DIAGNOSTIC_IDS?.trim();
const known=[197683,190510,196542,197686,189792];
const ids=requested?requested.split(',').map(value=>Number(value.trim())):known;
const queue=JSON.parse(await fs.readFile(new URL('../data/queue.json',import.meta.url),'utf8'));
const allowed=new Set(queue.entries.map(entry=>entry.id));
assert(ids.length>=1&&ids.length<=5&&new Set(ids).size===ids.length&&ids.every(id=>Number.isSafeInteger(id)&&allowed.has(id)),'Diagnostic IDs must be one to five distinct queued public products');
const limit=Math.min(5,Math.max(1,Number(process.env.WINERADAR_DIAGNOSTIC_LIMIT)||5));
const config=JSON.parse(await fs.readFile(new URL('../config/collection.json',import.meta.url),'utf8'));
const output=new URL('../artifacts/',import.meta.url);
await fs.mkdir(output,{recursive:true});
const report={schemaVersion:1,purpose:'bounded anonymous cloud diagnosis',startedAt:new Date().toISOString(),
  environment:process.env.GITHUB_ACTIONS==='true'?'github-actions':'local',platform:process.platform,node:process.version,
  maximumProducts:limit,minimumPauseMs:config.minimumPauseMs,attempts:[]};
let browser,context,current=null,consecutiveFailures=0;
function event(phase,request,status=null) {
  if(!current||current.network.length>=100)return;
  let url;try{url=new URL(request.url());}catch{return;}
  if(!['https://h5.vinehoo.com','https://img.vinehoo.com'].includes(url.origin))return;
  const kind=responseKind(request.url(),current.id);
  const path=/^\/(?:pages\/goods-detail\/goods-detail|vinehoo\/client\/commodities\/periods\/\d+\.json|api\/commodities\/v3\/package\/)/.test(url.pathname)?url.pathname:'[other first-party path]';
  current.network.push({phase,elapsedMs:Date.now()-current.startedMs,host:url.host,path,
    type:request.resourceType(),method:request.method(),kind:kind??'other',...(status===null?{}:{status})});
  if(status!==null&&[401,403,429].includes(status))current.restricted=true;
}
try {
  const opened=await openBrowser();browser=opened.browser;context=opened.context;
  report.browserVersion=browser.version();
  context.on('request',request=>event('request',request));
  context.on('response',response=>event('response',response.request(),response.status()));
  context.on('requestfailed',request=>event('failed',request));
  for(const id of ids.slice(0,limit)) {
    const attempt={id,startedAt:new Date().toISOString(),startedMs:Date.now(),network:[],restricted:false};current=attempt;
    try {
      const snapshot=await observeProduct(context,{id,sources:[]},config);
      attempt.outcome='success';attempt.listings=snapshot.listings.length;
      attempt.wines=snapshot.wines.length;attempt.verificationMethod=snapshot.listings[0].verificationMethod??'page_xhr_visible_price';
      attempt.validatedSkus=snapshot.skus.filter(s=>Number.isSafeInteger(s.inventory.quantity)&&s.inventory.observedAt).length;
      attempt.detailObservedAt=snapshot.wines[0]?.observedAt??null;
      attempt.inventoryObservedAt=snapshot.skus[0]?.inventory.observedAt??null;
      consecutiveFailures=0;
    }catch(error){
      attempt.outcome='failed';attempt.errorCode=error.code??'unexpected_error';
      attempt.received=error.diagnostics?.received??[];
      attempt.requestFailureCount=error.diagnostics?.requestFailures?.length??0;
      attempt.pageErrorCount=error.diagnostics?.pageErrors?.length??0;
      consecutiveFailures++;
    }finally{
      attempt.finishedAt=new Date().toISOString();delete attempt.startedMs;
      attempt.networkCounts={requests:attempt.network.filter(e=>e.phase==='request').length,
        responses:attempt.network.filter(e=>e.phase==='response').length,
        detailRequests:attempt.network.filter(e=>e.phase==='request'&&e.kind==='detail').length,
        detailResponses:attempt.network.filter(e=>e.phase==='response'&&e.kind==='detail').length,
        inventoryRequests:attempt.network.filter(e=>e.phase==='request'&&e.kind==='inventory').length,
        inventoryResponses:attempt.network.filter(e=>e.phase==='response'&&e.kind==='inventory').length};
      report.attempts.push(attempt);current=null;
    }
    if(attempt.restricted||attempt.errorCode==='access_control') {report.stoppedReason='access_control';break;}
    if(consecutiveFailures>=3) {report.stoppedReason='three_consecutive_failures';break;}
    if(report.attempts.length<limit)await pause(config.minimumPauseMs);
  }
}catch(error){report.stoppedReason=error.code??'setup_failed';report.setupError=clean(String(error.message).split('\n')[0].slice(0,160));}
finally{if(browser)await browser.close().catch(()=>{});}
report.finishedAt=new Date().toISOString();
report.successfulProducts=report.attempts.filter(a=>a.outcome==='success').length;
report.validatedSkus=report.attempts.reduce((n,a)=>n+(a.validatedSkus??0),0);
const serialized=JSON.stringify(report,null,2)+'\n';assertNoSecrets(serialized);
await fs.writeFile(new URL('cloud-diagnostic.json',output),serialized);
console.log(JSON.stringify({successfulProducts:report.successfulProducts,validatedSkus:report.validatedSkus,
  attempted:report.attempts.length,stoppedReason:report.stoppedReason??null,
  events:report.attempts.map(a=>({id:a.id,outcome:a.outcome,errorCode:a.errorCode??null,received:a.received??[],restricted:a.restricted,counts:a.networkCounts}))}));

import {pause,checkAccess,SourceError,deadline} from './browser.mjs';
import {cleanUrl} from './sanitize.mjs';
export function productCandidates(value,output=[],depth=0) {
  if(!value||typeof value!=='object'||depth>12)return output;
  if(Array.isArray(value)){for(const v of value)productCandidates(v,output,depth+1);return output;}
  const name=value.title??value.product_name??value.en_product_name;
  if(Number.isSafeInteger(value.id)&&value.id>10000&&value.id<1000000000&&value.price!==undefined&&name&&(value.periods_type!==undefined||value.onsale_status!==undefined)) {
    const category=value.product_category;
    if(!Array.isArray(category)||!category.length||category.some(c=>/葡萄酒|起泡|香槟/.test(c)))output.push({id:value.id,title:typeof name==='string'?name:'',periodsType:value.periods_type??null});
  }
  for(const [key,v] of Object.entries(value))if(!/user|coupon|staff|buyer|creator|operator|supplier/i.test(key))productCandidates(v,output,depth+1);
  return output;
}
export function selectBalanced(candidates,limit=50) {
  const groups=new Map();for(const c of candidates)for(const s of c.sources){if(!groups.has(s.channel))groups.set(s.channel,[]);groups.get(s.channel).push(c);}
  const selected=new Map();let progress=true;
  while(selected.size<limit&&progress){progress=false;for(const group of groups.values()){while(group.length&&selected.has(group[0].id))group.shift();if(group.length){const c=group.shift();selected.set(c.id,c);progress=true;}if(selected.size>=limit)break;}}
  return [...selected.values()];
}
export async function discover(context,config) {
  const page=await context.newPage();page.setDefaultTimeout(config.timeoutPerPageMs);const map=new Map(),routes=new Map(),channels=[],pending=new Set(),requestSources=new WeakMap();let active={channel:'现货速发',url:config.landing},blocked=null,parseFailures=0;
  page.on('request',request=>requestSources.set(request,{...active,url:cleanUrl(page.url())}));
  page.on('response',r=>{
    if(!['xhr','fetch'].includes(r.request().resourceType())||new URL(r.url()).origin!==config.origin)return;
    const source={...(requestSources.get(r.request())??active),api:cleanUrl(r.url())};
    if([401,403,429].includes(r.status())){blocked=new SourceError('access_control',`Discovery HTTP ${r.status()}`,{stop:true});return;}
    const task=(async()=>{try{if(r.status()!==200)return;const j=await deadline(r.json(),15000,'discovery_response_timeout');if(j?.error_code!==0)return;
      for(const found of productCandidates(j)){const previous=map.get(found.id)??{...found,sources:[]};if(!previous.sources.some(s=>s.channel===source.channel))previous.sources.push(source);map.set(found.id,previous);}
      for(const column of j.data?.column??[]){if(typeof column.path==='string'&&column.path.startsWith('/activities-v3/'))routes.set(column.name,{channel:'分类·'+column.name,url:new URL(column.path,config.origin).href});}
    }catch{parseFailures++;}})();
    pending.add(task);task.finally(()=>pending.delete(task));
  });
  async function settle(source,action,{scroll=false}={}) {
    if(channels.length>=config.maximumDiscoveryPages)return;
    active=source;const before=new Set(map.keys()),started=Date.now(),failuresBefore=parseFailures;let error=null;
    try {
      await action();await page.waitForTimeout(5000);await checkAccess(page);if(blocked)throw blocked;
      if(scroll)for(let i=0;i<(config.maximumScrollsPerChannel??1);i++){
        await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
        await pause(config.minimumPauseMs);
        await Promise.allSettled([...pending]);
      }
      await Promise.allSettled([...pending]);if(blocked)throw blocked;source.url=cleanUrl(page.url());
    }catch(e){error={code:e.code??'discovery_navigation_failed',message:String(e.message).split('\n')[0].slice(0,220)};if(e.stop)throw e;}
    const found=[...map.values()].filter(c=>c.sources.some(s=>s.channel===source.channel));
    channels.push({channel:source.channel,url:source.url,newCandidates:found.filter(c=>!before.has(c.id)).length,observedCandidates:found.length,elapsedMs:Date.now()-started,responseParseFailures:parseFailures-failuresBefore,error});
    console.log(JSON.stringify({stage:'discovery_channel',channel:source.channel,elapsedMs:Date.now()-started,candidates:found.length,responseParseFailures:parseFailures-failuresBefore,errorCode:error?.code??null}));
    await pause(config.minimumPauseMs);
  }
  try {
    await settle(active,()=>page.goto(config.landing,{waitUntil:'domcontentloaded',timeout:config.timeoutPerPageMs}));
    await settle({channel:'普通商城',url:config.origin+'/'},()=>page.getByText('首页',{exact:true}).last().tap(),{scroll:true});
    // Follow an actual homepage activity card, instead of inventing activity IDs.
    const activity=page.getByText(/全部\s*\d+款/).first();
    if(await activity.count())await settle({channel:'首页专题活动',url:page.url()},()=>activity.tap(),{scroll:true});
    for(const country of routes.keys()) {
      if(channels.length>=config.maximumDiscoveryPages)break;
      await settle({channel:'分类·'+country,url:config.landing},async()=>{
        const categorySource=active;active={channel:'现货速发',url:config.landing};
        await page.goto(config.landing,{waitUntil:'commit',timeout:config.timeoutPerPageMs});
        await page.getByText(country,{exact:true}).first().waitFor();active=categorySource;
        await page.getByText(country,{exact:true}).first().tap();
      },{scroll:true});
    }
    const candidates=[...map.values()],balanced=selectBalanced(candidates,config.maximumDiscoveryCandidates??config.maximumAttempts);
    if(config.referenceListingId){const reference=map.get(config.referenceListingId)??{id:config.referenceListingId,title:'User-specified regression product',sources:[{channel:'用户指定回归商品',url:`https://h5.vinehoo.com/pages/goods-detail/goods-detail?id=${config.referenceListingId}`}]};balanced.unshift(reference);}
    const previous=(config.previousListings??[]).map(old=>map.get(old.id)??{id:old.id,title:old.title,sources:old.discoverySources??[{channel:'上一份有效目录',url:old.url}]}).sort((a,b)=>{
      const oldA=config.previousListings.find(i=>i.id===a.id),oldB=config.previousListings.find(i=>i.id===b.id);return oldA.observedAt.localeCompare(oldB.observedAt);
    });
    const unique=[...new Map([...balanced.filter(c=>c.id===config.referenceListingId),...previous,...balanced].map(c=>[c.id,c])).values()].slice(0,config.maximumDiscoveryCandidates??config.maximumAttempts);
    return {discoveredAt:new Date().toISOString(),totalUnique:candidates.length,candidates:unique,channels,scope:'Bounded anonymous public homepage, visible category links and activity cards plus user-specified regression product; not exhaustive'};
  }finally{await page.close();}
}

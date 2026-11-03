import {chromium} from 'playwright';
import {buildCatalog,validateCatalog} from './model.mjs';
import {projectResponse} from './projection.mjs';
import {cleanUrl} from './sanitize.mjs';
export class SourceError extends Error { constructor(code,message,{stop=false}={}) {super(message);this.code=code;this.stop=stop;} }
export const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function deadline(promise,ms,code='response_timeout') {
  let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new SourceError(code,'Single-attempt time budget exceeded')),ms);})]);}finally{clearTimeout(timer);}
}
export async function openBrowser() {
  const options={headless:true,timeout:30000};
  if(process.platform==='win32') options.channel='msedge';
  if(process.env.WINERADAR_PROXY) options.proxy={server:process.env.WINERADAR_PROXY};
  const browser=await chromium.launch(options);
  const context=await browser.newContext({locale:'zh-CN',viewport:{width:430,height:932},isMobile:true,hasTouch:true});
  // Keep Chromium's HTTP cache available across product pages. Playwright routing
  // disables it for the entire context, including first-party bootstrap scripts.
  return {browser,context};
}
export async function checkAccess(page) {
  if(/\/login|\/captcha|\/verify/i.test(new URL(page.url()).pathname)) throw new SourceError('access_control','Login/verification redirect; collection stopped',{stop:true});
  for(const locator of [page.locator('input[type="password"]'),page.getByText(/请完成安全验证|拖动滑块完成验证|访问过于频繁|请先登录/)]) {
    for(const match of await locator.all()) if(await match.isVisible()) throw new SourceError('access_control','Visible access control; collection stopped',{stop:true});
  }
}
export function responseKind(url,id) {
  let u;try{u=new URL(url);}catch{return null;}
  if(u.username||u.password)return null;
  if(u.origin==='https://img.vinehoo.com'&&u.pathname===`/vinehoo/client/commodities/periods/${id}.json`)return'detail';
  if(u.origin==='https://h5.vinehoo.com'&&/^\/api\/commodities\/v3\/package\/getPeriods(?:Second)?PackageInventory$/.test(u.pathname)&&u.searchParams.getAll('period').length===1&&u.searchParams.get('period')===String(id))return'inventory';
  return null;
}
export async function recoverPublicApis(context,{id,detailUrl,config,pauseFn=pause}) {
  if(responseKind(detailUrl,id)!=='detail')throw new SourceError('fallback_invalid_url','Recovery requires the detail URL observed on the public page');
  const limit=Math.min(config.timeoutPerPageMs,15000);
  async function read(kind,url){
    if(responseKind(url,id)!==kind)throw new SourceError('fallback_invalid_url',`Invalid ${kind} recovery URL`);
    let response;
    try{response=await context.request.get(url,{timeout:limit});}
    catch(error){throw new SourceError(/timeout/i.test(String(error?.name)+' '+String(error?.message))?'fallback_request_timeout':'fallback_request_failed',`${kind} public API recovery request failed`);}
    try{
      const returned=new URL(response.url());
      if(returned.origin!==new URL(url).origin||/\/login|\/captcha|\/verify/i.test(returned.pathname))throw new SourceError('access_control',`${kind} redirected to access control`,{stop:true});
      if([401,403,429].includes(response.status()))throw new SourceError('access_control',`${kind} HTTP ${response.status()}`,{stop:true});
      if(response.status()!==200)throw new SourceError('source_http_error',`${kind} HTTP ${response.status()}`);
      const buffer=await deadline(response.body(),limit,'fallback_response_timeout');
      if(buffer.length>3000000)throw new SourceError('response_too_large',`${kind} source JSON exceeds limit`);
      let body;try{body=JSON.parse(buffer.toString('utf8'));}catch{throw new SourceError('invalid_json',`${kind} source returned non-JSON`);}
      if(body?.error_code!==0)throw new SourceError('source_business_error',`${kind} source error code ${String(body?.error_code).slice(0,30)}`);
      return {body,observedAt:new Date().toISOString(),url:cleanUrl(response.url())};
    }finally{await response.dispose().catch(()=>{});}
  }
  const detail=await read('detail',detailUrl);
  if(detail.body?.data?.id!==id)throw new SourceError('fallback_id_mismatch','Recovered detail belongs to a different listing');
  if(detail.body?.data?.periods_type!==0)throw new SourceError('fallback_unsupported_type','No observed direct-inventory pattern for this product type');
  await pauseFn(config.minimumPauseMs);
  const inventoryUrl=`https://h5.vinehoo.com/api/commodities/v3/package/getPeriodsPackageInventory?period=${id}&periods_type=0`;
  const inventory=await read('inventory',inventoryUrl);
  const snapshot=buildCatalog({detail:projectResponse('detail',detail.body),live:projectResponse('inventory',inventory.body),detailAt:detail.observedAt,liveAt:inventory.observedAt,
    runId:new Date().toISOString().replace(/[:.]/g,'-'),environment:process.env.GITHUB_ACTIONS==='true'?'github-actions':'local',
    evidence:{detail:{url:detail.url,observedAt:detail.observedAt},inventory:{url:inventory.url,observedAt:inventory.observedAt}}});
  snapshot.listings[0].verificationMethod='public_api_recovery';
  const categories=detail.body.data?.product_category??[];
  if(categories.length&&!categories.some(c=>/葡萄酒|起泡|香槟/.test(c)))throw new SourceError('not_wine','Non-wine product omitted');
  snapshot.listings[0].categories=categories.filter(c=>typeof c==='string');
  return snapshot;
}
export function addVisibleVintage(snapshot,header) {
  const normalized=header.replace(/\s+/g,' ');
  for(const wine of snapshot.wines) {
    if(wine.vintage!==null)continue;
    const leading=wine.name.match(/^((?:19|20)\d{2})\s+/);
    if(leading){wine.vintage=Number(leading[1]);wine.vintageSource='leading_year_in_product_name';continue;}
    const name=wine.name.replace(/\s+/g,' ').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const match=normalized.match(new RegExp(name+'\\s+((?:19|20)\\d{2})\\b','i'));
    if(match){wine.vintage=Number(match[1]);wine.vintageSource='visible_product_heading';}
  }
  return validateCatalog(snapshot);
}
export async function observeProduct(context,candidate,config) {
  const id=candidate.id,page=await context.newPage();page.setDefaultTimeout(config.timeoutPerPageMs);
  const values={},meta={},pending=[],claimed=new Set(),failures=[],pageErrors=[],network=[],requestUrls={};let resolve,reject,accept=true;
  const started=Date.now();
  function trace(phase,request,status=null){
    if(network.length>=60)return;
    let url;try{url=new URL(request.url());}catch{return;}
    if(!['https://h5.vinehoo.com','https://img.vinehoo.com'].includes(url.origin))return;
    const kind=responseKind(request.url(),id);
    const relevant=kind||request.isNavigationRequest()||request.resourceType()==='script'||/\/(?:api\/commodities|vinehoo\/client\/commodities)\//.test(url.pathname);
    if(!relevant)return;
    const path=kind?url.pathname:request.isNavigationRequest()&&url.pathname==='/pages/goods-detail/goods-detail'?url.pathname:request.isNavigationRequest()?'[other navigation]':'[first-party script or commodity endpoint]';
    network.push({phase,elapsedMs:Date.now()-started,host:url.host,path,type:request.resourceType(),kind:kind??'other',...(status===null?{}:{status})});
  }
  page.on('request',r=>{trace('request',r);const kind=responseKind(r.url(),id);if(kind&&['xhr','fetch'].includes(r.resourceType()))requestUrls[kind]=r.url();});
  page.on('domcontentloaded',()=>network.push({phase:'domcontentloaded',elapsedMs:Date.now()-started}));
  page.on('load',()=>network.push({phase:'load',elapsedMs:Date.now()-started}));
  page.on('requestfailed',r=>{if(responseKind(r.url(),id)||r.isNavigationRequest())failures.push({url:cleanUrl(r.url()),reason:r.failure()?.errorText??'request_failed'});});
  page.on('pageerror',e=>pageErrors.push(String(e.message).split('\n')[0].slice(0,150)));
  const ready=new Promise((res,rej)=>{resolve=res;reject=rej;});ready.catch(()=>{});
  page.on('response',r=>{
    trace('response',r.request(),r.status());
    if(!accept||!['xhr','fetch'].includes(r.request().resourceType()))return;
    const kind=responseKind(r.url(),id);if(!kind||claimed.has(kind))return;claimed.add(kind);
    pending.push((async()=>{
      if([401,403,429].includes(r.status()))throw new SourceError('access_control',`${kind} HTTP ${r.status()}`,{stop:true});
      if(r.status()!==200)throw new SourceError('source_http_error',`${kind} HTTP ${r.status()}`);
      const buffer=await deadline(r.body(),config.timeoutPerPageMs);
      if(buffer.length>3000000)throw new SourceError('response_too_large','Source JSON exceeds limit');
      let body;try{body=JSON.parse(buffer.toString('utf8'));}catch{throw new SourceError('invalid_json','Source returned non-JSON');}
      if(body?.error_code!==0)throw new SourceError('source_business_error',`Source error code ${String(body?.error_code).slice(0,30)}`);
      values[kind]=body;meta[kind]={url:cleanUrl(r.url()),observedAt:new Date().toISOString()};
      if(values.detail&&values.inventory)resolve();
    })().catch(reject));
  });
  try {
    const url=`https://h5.vinehoo.com/pages/goods-detail/goods-detail?id=${id}`;
    const navigation=page.goto(url,{waitUntil:'commit',timeout:config.timeoutPerPageMs});
    const response=await Promise.race([navigation,ready.then(()=>new Promise(()=>{}))]);
    if([401,403,429].includes(response?.status()))throw new SourceError('access_control',`Page HTTP ${response.status()}`,{stop:true});
    if(response?.status()!==200)throw new SourceError('page_http_error',`Page HTTP ${response?.status()}`);
    await checkAccess(page);await deadline(ready,config.timeoutPerPageMs);await checkAccess(page);
    const categories=values.detail.data?.product_category??[];
    if(categories.length&&!categories.some(c=>/葡萄酒|起泡|香槟/.test(c)))throw new SourceError('not_wine','Non-wine product omitted');
    await page.waitForFunction(()=>/¥\s*[\d,.]+/.test(document.body.innerText),null,{timeout:10000});
    const body=await page.locator('body').innerText();
    const snapshot=buildCatalog({detail:projectResponse('detail',values.detail),live:projectResponse('inventory',values.inventory),detailAt:meta.detail.observedAt,liveAt:meta.inventory.observedAt,runId:new Date().toISOString().replace(/[:.]/g,'-'),environment:process.env.GITHUB_ACTIONS==='true'?'github-actions':'local',evidence:meta});
    const price=body.match(/¥\s*([\d,.]+)/)?.[1]?.replaceAll(',','');
    if(Number(price)!==Number(snapshot.listings[0].displayedPrice.amount))throw new SourceError('page_data_mismatch','Displayed price differs from live response');
    addVisibleVintage(snapshot,body.split(/商品详情|商品参数/)[0].slice(0,2200));
    snapshot.listings[0].discoverySources=candidate.sources;
    snapshot.listings[0].categories=categories.filter(c=>typeof c==='string');
    snapshot.listings[0].verificationMethod='page_xhr_visible_price';
    return snapshot;
  } catch(e) {
    let recoveryFailure=null;
    if(e.code==='response_timeout'){
      await checkAccess(page);
      if(requestUrls.detail&&!values.detail&&!requestUrls.inventory){
        await page.close().catch(()=>{});
        await pause(config.minimumPauseMs);
        try{const snapshot=await recoverPublicApis(context,{id,detailUrl:requestUrls.detail,config});snapshot.listings[0].discoverySources=candidate.sources;return snapshot;}
        catch(recoveryError){
          recoveryFailure={code:recoveryError.code??'fallback_failed',message:String(recoveryError.message).slice(0,140)};
          if(recoveryError.code==='not_wine')throw recoveryError;
          if(recoveryError.stop){recoveryError.diagnostics={received:Object.keys(values),requestFailures:failures,pageErrors,network,recovery:recoveryFailure};throw recoveryError;}
        }
      }
      const missing=['detail','inventory'].filter(k=>!values[k]);
      e.message=`Timed out waiting for ${missing.join('+')||'page'}; ${failures.map(f=>f.reason).join('; ')||'no transport failure reported'}${pageErrors.length?'; page: '+pageErrors.join('; '):''}${recoveryFailure?'; recovery: '+recoveryFailure.code:''}`;
    }
    e.diagnostics={received:Object.keys(values),requestFailures:failures,pageErrors,network,...(recoveryFailure?{recovery:recoveryFailure}:{})};throw e;
  } finally {accept=false;await page.close().catch(()=>{});await deadline(Promise.allSettled(pending),2000).catch(()=>{});}
}

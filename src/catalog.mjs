import {validateCatalog} from './model.mjs';
export function itemView(listing,skus,wines,error=null) {
  const offers=skus.filter(s=>s.listingId===listing.listingId&&s.inventory.rawFlags.isHidden!==1&&s.inventory.rawFlags.isHiddenPackage!==1);
  const associated=wines.filter(w=>listing.wineIds.includes(w.wineId));
  let availability='unknown';
  if(!error&&offers.some(s=>s.inventory.quantity>0&&s.inventory.availability==='available_reported_by_api'))availability='available';
  else if(!error&&offers.length&&offers.every(s=>s.inventory.quantity===0))availability='sold_out';
  const prices=offers.filter(s=>s.price).map(s=>Number(s.price.amount));
  return {
    id:listing.sourceListingId,title:listing.title,url:listing.sourcePage,
    wineNames:associated.map(w=>w.name),wineNamesZh:associated.map(w=>w.nameZh).filter(Boolean),
    vintages:[...new Set(associated.map(w=>w.vintage).filter(v=>v!==null))],
    countries:[...new Set(associated.map(w=>w.country).filter(Boolean))],
    regions:[...new Set(associated.map(w=>w.region).filter(Boolean))],
    capacities:[...new Set(associated.map(w=>w.bottleCapacity).filter(Boolean))],
    minPrice:prices.length?Math.min(...prices):null,currency:'CNY',availability,
    observedAt:listing.observedAt,collectionStatus:error?'failed':'success',lastAttemptError:error,
    discoverySources:listing.discoverySources??[],
    offers:offers.map(s=>({skuId:s.sourcePackageId,name:s.name,price:s.price.amount,currency:s.price.currency,
      inventory:error?null:s.inventory.quantity,lastKnownInventory:s.inventory.quantity,
      availability:error?'unknown':s.inventory.availability,observedAt:s.inventory.observedAt,
      inventoryConflict:s.inventory.conflict,components:s.components,
    })),
  };
}
export function assemble(snapshots,{previous=null,errors=[],discovery,startedAt,finishedAt,runUrl=null,maxListings=50}={}) {
  const listingMap=new Map(),skuMap=new Map(),wineMap=new Map(),fresh=new Set();
  if(previous){for(const l of previous.listings)listingMap.set(l.listingId,l);for(const s of previous.skus)skuMap.set(s.skuId,s);for(const w of previous.wines)wineMap.set(w.wineId,w);}
  for(const snapshot of snapshots) {
    validateCatalog(snapshot);
    for(const listing of snapshot.listings){for(const [key,sku]of skuMap)if(sku.listingId===listing.listingId)skuMap.delete(key);listingMap.set(listing.listingId,listing);fresh.add(listing.listingId);}
    for(const sku of snapshot.skus)skuMap.set(sku.skuId,sku);
    for(const wine of snapshot.wines)wineMap.set(wine.wineId,wine);
  }
  const listings=[...listingMap.values()].sort((a,b)=>Number(fresh.has(b.listingId))-Number(fresh.has(a.listingId))||b.observedAt.localeCompare(a.observedAt)).slice(0,maxListings);
  const ids=new Set(listings.map(l=>l.listingId));
  const skus=[...skuMap.values()].filter(s=>ids.has(s.listingId));const referenced=new Set(skus.flatMap(s=>s.components.map(c=>c.wineId)));
  const wines=[...wineMap.values()].filter(w=>referenced.has(w.wineId));
  const catalog={schemaVersion:2,catalogVersion:1,provider:'vinehoo',observation:{runId:startedAt.replace(/[:.]/g,'-'),environment:process.env.GITHUB_ACTIONS==='true'?'github-actions':'local',capturedAt:finishedAt},
    generatedAt:finishedAt,lastCollectionStartedAt:startedAt,wines,listings,skus,
    inventoryPolicy:{primarySource:'live_sku_inventory_response',staticFallbackAllowed:false,missingLiveInventory:'unknown',compareOnlySameSku:true},
    conflicts:skus.filter(s=>s.inventory.conflict).map(s=>({type:'same_sku_inventory_mismatch',skuId:s.skuId,staticQuantity:s.inventory.staticSnapshot.quantity,liveQuantity:s.inventory.quantity,staticObservedAt:s.inventory.staticSnapshot.observedAt,liveObservedAt:s.inventory.observedAt})),
    coverage:discovery,collectionErrors:errors,runUrl,
  };
  if(listings.length)validateCatalog(catalog);
  catalog.items=listings.map(l=>itemView(l,skus,wines,errors.find(e=>e.id===l.sourceListingId)??(fresh.has(l.listingId)?null:{code:'not_refreshed',message:'Retained from an earlier observation'})));
  return catalog;
}
export function publicCatalog(catalog,status) {
  if(!catalog)return null;
  const published=structuredClone(catalog);
  const failed= status.state==='failed';
  for(const item of published.items??[]) {
    const stale=failed||!item.observedAt||!status.lastAttemptAt||Date.parse(item.observedAt)<Date.parse(status.lastAttemptAt);
    if(!stale)continue;
    item.availability='unknown';
    if(item.collectionStatus==='success')item.collectionStatus='retained';
    item.lastAttemptError??={code:'not_refreshed',message:'Inventory was not refreshed in this collection'};
    for(const offer of item.offers??[]){offer.inventory=null;offer.availability='unknown';}
  }
  return published;
}
export function collectionStatus({catalog,previousStatus,startedAt,finishedAt,successCount,attemptedCount,errors,discovery,minimum=30,target=40,stoppedReason=null,runUrl=null}) {
  const accepted=catalog?.items?.length>=minimum;
  const state=!accepted||successCount===0?'failed':successCount<target||errors.length?'partial':'ok';
  return {schemaVersion:1,state,lastAttemptAt:startedAt,finishedAt,lastSuccessAt:state!=='failed'&&successCount>0?finishedAt:previousStatus?.lastSuccessAt??null,
    dataGeneratedAt:catalog?.generatedAt??null,dataStaleAfter:catalog?.generatedAt?new Date(Date.parse(catalog.generatedAt)+18*3600000).toISOString():null,
    itemCount:catalog?.items?.length??0,freshItemCount:successCount,attemptedCount,failedCount:errors.filter(e=>e.code!=='not_wine').length,
    retainedPreviousData:successCount===0||((catalog?.items?.length??0)>successCount),
    availableCount:successCount===0?0:catalog?.items?.filter(i=>i.availability==='available').length??0,soldOutCount:successCount===0?0:catalog?.items?.filter(i=>i.availability==='sold_out').length??0,unknownCount:successCount===0?(catalog?.items?.length??0):catalog?.items?.filter(i=>i.availability==='unknown').length??0,
    errors,recentFailures:[...(previousStatus?.recentFailures??[]),...errors].slice(-20),stoppedReason,collectionSuspended:Boolean(previousStatus?.collectionSuspended)||errors.some(e=>e.code==='access_control'||e.code==='robots_disallowed'),
    coverage:discovery,schedule:{enabled:true,timezone:'Asia/Shanghai',times:['09:17','21:17'],cronUtc:'17 1,13 * * *',timing:'GitHub scheduling can be delayed'},runUrl,
  };
}

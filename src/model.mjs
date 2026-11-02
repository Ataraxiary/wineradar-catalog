import assert from 'node:assert/strict';

const quantity = v => (Number.isSafeInteger(v) && v >= 0) ? v : null;
const stamp = value => { assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString()===value, 'Missing valid UTC observation timestamp'); return value; };
const id = (kind, value) => `vinehoo:${kind}:${value}`;
function money(value, observedAt) {
  assert((typeof value==='number' || typeof value==='string') && /^\d+(?:\.\d{1,2})?$/.test(String(value)), 'Missing or invalid live price');
  const amount = Number(value);
  assert(Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(Math.round(amount*100)), 'Invalid live price');
  return { amount: amount.toFixed(2), currency: 'CNY', source: 'live_sku_inventory_response', observedAt };
}
const availability = (q,f) => f.isOnsale===0 || f.isHidden===1 || f.isHiddenPackage===1 ? 'unavailable' : q===0 ? 'out_of_stock' : f.isOnsale===1 && f.isHidden===0 && f.isHiddenPackage===0 && q>0 ? 'available_reported_by_api' : 'unknown';

export function buildCatalog({ detail, live, detailAt, liveAt, runId, environment = 'local', evidence = {} }) {
  assert.equal(detail?.error_code, 0, 'Detail API did not succeed');
  assert.equal(live?.error_code, 0, 'Live inventory API did not succeed');
  const d = detail.data, current = live.data;
  assert(Number.isSafeInteger(d?.id) && d.id > 0, 'Invalid listing ID');
  assert.equal(current?.id, d.id, 'Static and live listing IDs differ');
  assert(Array.isArray(current.packageList) && current.packageList.length > 0, 'Missing live SKU list');
  assert(Array.isArray(d.product_info) && new Set(d.product_info.map(w=>w.id)).size===d.product_info.length,'Missing or duplicate wine details');
  assert(d.package===undefined || (Array.isArray(d.package) && new Set(d.package.map(p=>p.id)).size===d.package.length),'Invalid or duplicate static SKU details');
  stamp(detailAt); stamp(liveAt);
  const listingId = id('listing', d.id), wines = new Map();
  const skus = current.packageList.map(p => {
    assert(Number.isSafeInteger(p.id) && p.id > 0, 'Invalid SKU ID');
    assert.equal(p.period_id, d.id, 'SKU refers to a different listing');
    assert(Array.isArray(p.product_list) && p.product_list.length, 'SKU has no underlying wine components');
    const components = p.product_list.map(product => {
      const wine = d.product_info?.find(w => w.id === product.product_id);
      assert(wine, `Missing wine details for product ${product.product_id}`);
      assert(typeof wine.en_product_name === 'string' && wine.en_product_name.trim(), 'Missing wine name');
      assert(Number.isSafeInteger(wine.id) && wine.id>0,'Invalid wine ID');
      assert(Number.isSafeInteger(product.nums) && product.nums > 0, 'Invalid bottles per SKU');
      const wineId = id('wine', wine.id);
      if (!wines.has(wineId)) {
        const vintage = wine.en_product_name.match(/\b((?:19|20)\d{2})\s*$/)?.[1];
        wines.set(wineId, {
          wineId, sourceProductId: wine.id,
          name: wine.en_product_name.trim(), nameZh: wine.cn_product_name ?? null,
          vintage: vintage ? Number(vintage) : null,
          vintageSource: vintage ? 'trailing_year_in_product_name' : 'not_available',
          bottleCapacity: wine.capacity ?? null, country: wine.country_name ?? null,
          region: wine.producing_area_name ?? null, winery: wine.chateau_name ?? null,
          observedAt: detailAt,
        });
      }
      return { wineId, bottlesPerSku: product.nums, reportedProductInventory: quantity(product.inventory) };
    });
    const staticSku = d.package?.find(item => item.id === p.id);
    const liveQuantity = quantity(p.inventory), staticQuantity = quantity(staticSku?.inventory);
    const comparable = liveQuantity !== null && staticQuantity !== null;
    const mismatch = comparable && liveQuantity !== staticQuantity;
    const rawFlags={ isOnsale: p.is_onsale ?? null, isHidden: p.is_hidden ?? null, isHiddenPackage: p.is_hidden_package ?? null, unlimited: p.unlimited ?? null };
    return {
      skuId: id('sku', p.id), sourcePackageId: p.id, listingId,
      name: p.package_name ?? null, components,
      price: money(p.price, liveAt),
      inventory: {
        primarySource: 'live_sku_inventory_response', quantity: liveQuantity, observedAt: liveAt,
        unit: 'sellable_sku_units', availability:availability(liveQuantity,rawFlags),
        staticSnapshot: { quantity: staticQuantity, observedAt: detailAt },
        comparison: comparable ? (mismatch ? 'different' : 'equal') : 'not_comparable',
        conflict: mismatch, difference: comparable ? liveQuantity - staticQuantity : null,
        rawFlags,
        checkoutVerified: false,
      },
    };
  });
  const catalog = {
    schemaVersion: 2, provider: 'vinehoo', observation: { runId, environment, capturedAt: liveAt },
    wines: [...wines.values()],
    listings: [{ listingId, sourceListingId: d.id, sourcePage: `https://h5.vinehoo.com/pages/goods-detail/goods-detail?id=${d.id}`, title: d.title,
      wineIds: [...wines.keys()], skuIds: skus.map(s=>s.skuId),
      observedAt: liveAt, displayedPrice: money(current.price, liveAt),
      soldCount: quantity(current.purchased), predictedShipmentDate: current.shipment_time ?? null,
      saleWindow: { start: current.onsale_time ?? null, end: current.sold_out_time ?? null, timezone: 'not_supplied_by_source' },
      onsaleStatusRaw: current.onsale_status ?? null,
      staticListingInventory: { quantity: quantity(d.inventory), observedAt: detailAt, note: 'different level; never substituted for live SKU inventory' },
    }],
    skus,
    inventoryPolicy: { primarySource: 'live_sku_inventory_response', staticFallbackAllowed: false, missingLiveInventory: 'unknown', compareOnlySameSku: true },
    conflicts: skus.filter(s=>s.inventory.conflict).map(s=>({ type: 'same_sku_inventory_mismatch', skuId: s.skuId, staticQuantity: s.inventory.staticSnapshot.quantity, liveQuantity: s.inventory.quantity, staticObservedAt: detailAt, liveObservedAt: liveAt })),
    evidence,
  };
  validateCatalog(catalog);
  return catalog;
}

export function validateCatalog(catalog) {
  assert.equal(catalog.schemaVersion, 2);
  assert.equal(catalog.provider,'vinehoo');
  const unique = (items, key) => { assert(Array.isArray(items) && items.length>0,'Empty catalog'); const keys = items.map(x=>x[key]); assert(keys.every(k=>typeof k==='string'&&k.length>0),'Missing entity ID'); assert.equal(new Set(keys).size,keys.length, `Duplicate ${key}`); return new Set(keys); };
  const wineIds = unique(catalog.wines,'wineId'), listingIds = unique(catalog.listings,'listingId'), skuIds = unique(catalog.skus,'skuId');
  assert(wineIds.size && listingIds.size && skuIds.size, 'Empty catalog');
  stamp(catalog.observation.capturedAt);
  assert(typeof catalog.observation.runId==='string' && catalog.observation.runId.length>0,'Missing run ID');
  assert.deepEqual(catalog.inventoryPolicy,{primarySource:'live_sku_inventory_response',staticFallbackAllowed:false,missingLiveInventory:'unknown',compareOnlySameSku:true},'Invalid inventory policy');
  const positiveId = v => assert(Number.isSafeInteger(v)&&v>0,'Invalid source ID');
  const validatePrice = p => {assert(p && /^\d+\.\d{2}$/.test(p.amount),'Missing or invalid price'); assert.equal(p.currency,'CNY'); assert.equal(p.source,'live_sku_inventory_response'); stamp(p.observedAt);};
  for(const wine of catalog.wines) {
    positiveId(wine.sourceProductId); assert.equal(wine.wineId,id('wine',wine.sourceProductId));
    assert(typeof wine.name==='string' && wine.name.trim(),'Missing wine name');
    assert(wine.vintage===null || (Number.isInteger(wine.vintage)&&wine.vintage>=1900&&wine.vintage<=2099),'Invalid vintage');
    stamp(wine.observedAt);
  }
  for (const listing of catalog.listings) {
    positiveId(listing.sourceListingId); assert.equal(listing.listingId,id('listing',listing.sourceListingId));
    assert.equal(listing.sourcePage,`https://h5.vinehoo.com/pages/goods-detail/goods-detail?id=${listing.sourceListingId}`);
    assert(typeof listing.title==='string' && listing.title.trim(),'Missing listing title');
    validatePrice(listing.displayedPrice); stamp(listing.observedAt);
    assert(listing.skuIds.length && listing.wineIds.length);
    assert.equal(new Set(listing.skuIds).size,listing.skuIds.length,'Duplicate SKU reference');
    for (const ref of listing.skuIds) assert(skuIds.has(ref), 'Broken listing -> SKU reference');
    for (const ref of listing.wineIds) assert(wineIds.has(ref), 'Broken listing -> wine reference');
  }
  for (const sku of catalog.skus) {
    positiveId(sku.sourcePackageId); assert.equal(sku.skuId,id('sku',sku.sourcePackageId)); validatePrice(sku.price);
    assert(listingIds.has(sku.listingId), 'Broken SKU -> listing reference');
    const listing = catalog.listings.find(l=>l.listingId===sku.listingId);
    assert(listing.skuIds.includes(sku.skuId), 'SKU is missing from its listing');
    assert(Array.isArray(sku.components)&&sku.components.length>0,'Missing SKU components');
    assert.equal(new Set(sku.components.map(p=>p.wineId)).size,sku.components.length,'Duplicate SKU wine component');
    for (const ref of sku.components) assert(wineIds.has(ref.wineId) && listing.wineIds.includes(ref.wineId), 'Broken SKU -> wine reference');
    for(const component of sku.components) assert(Number.isSafeInteger(component.bottlesPerSku)&&component.bottlesPerSku>0,'Invalid bottles per SKU');
    assert.equal(sku.inventory.primarySource,'live_sku_inventory_response');
    assert(sku.inventory.quantity === null || quantity(sku.inventory.quantity) !== null);
    stamp(sku.inventory.observedAt);
    stamp(sku.inventory.staticSnapshot.observedAt);
    const q=sku.inventory.quantity,s=sku.inventory.staticSnapshot.quantity;
    assert(s===null || quantity(s)!==null,'Invalid static inventory');
    const comparable=q!==null&&s!==null,conflict=comparable&&q!==s;
    assert.equal(sku.inventory.comparison,comparable?(conflict?'different':'equal'):'not_comparable');
    assert.equal(sku.inventory.conflict,conflict);
    assert.equal(sku.inventory.difference,comparable?q-s:null);
    assert.equal(sku.inventory.availability,availability(q,sku.inventory.rawFlags));
    assert.equal(sku.inventory.checkoutVerified,false);
    assert.equal(sku.inventory.unit,'sellable_sku_units');
  }
  assert.deepEqual(catalog.conflicts,catalog.skus.filter(s=>s.inventory.conflict).map(s=>({type:'same_sku_inventory_mismatch',skuId:s.skuId,staticQuantity:s.inventory.staticSnapshot.quantity,liveQuantity:s.inventory.quantity,staticObservedAt:s.inventory.staticSnapshot.observedAt,liveObservedAt:s.inventory.observedAt})),'Conflict summary inconsistent with SKU evidence');
  return catalog;
}

export function compareBaseline(catalog, baseline) {
  validateCatalog(catalog); validateCatalog(baseline);
  const identity = c => ({
    listings: c.listings.map(l=>({ id:l.listingId, wineIds:[...l.wineIds].sort(), skuIds:[...l.skuIds].sort() })).sort((a,b)=>a.id.localeCompare(b.id)),
    wines: c.wines.map(w=>({id:w.wineId,name:w.name.replace(/\s+/g,' ').trim(),vintage:w.vintage,capacity:w.bottleCapacity})).sort((a,b)=>a.id.localeCompare(b.id)),
    skus: c.skus.map(s=>({id:s.skuId,listingId:s.listingId,components:s.components.map(p=>({wineId:p.wineId,bottlesPerSku:p.bottlesPerSku})).sort((a,b)=>a.wineId.localeCompare(b.wineId))})).sort((a,b)=>a.id.localeCompare(b.id)),
  });
  assert.deepEqual(identity(catalog),identity(baseline),'Wine/listing/SKU identity differs from local baseline');
  return { identityMatches: true, baselineObservedAt: baseline.observation.capturedAt,
    dynamicDifferences: catalog.skus.flatMap(s=>{
      const previous=baseline.skus.find(p=>p.skuId===s.skuId);
      return ['price','inventory'].flatMap(field=>{
        const before=field==='price'?previous.price?.amount:previous.inventory.quantity;
        const after=field==='price'?s.price?.amount:s.inventory.quantity;
        return before===after?[]:[{skuId:s.skuId,field,before,after}];
      });
    }),
  };
}

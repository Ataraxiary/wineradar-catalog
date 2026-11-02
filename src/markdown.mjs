import {chinaTime} from './render.mjs';

const base='https://ataraxiary.github.io/wineradar-catalog/';
const cell=value=>String(value??'').replace(/\\/g,'\\\\').replace(/\|/g,'\\|').replace(/\r?\n/g,' ');
const table=(headers,rows)=>[
  `| ${headers.map(cell).join(' | ')} |`,
  `| ${headers.map(()=>'---').join(' | ')} |`,
  ...rows.map(row=>`| ${row.map(cell).join(' | ')} |`),
].join('\n');
const date=value=>value?`${chinaTime(value)} +08:00`:'未验证';
const state=value=>({available:'在售',sold_out:'售罄',unknown:'未知'}[value]??'未知');
const skuState=offer=>offer.inventory===null?'未知':({available_reported_by_api:'在售',out_of_stock:'售罄'}[offer.availability]??'未知');
const sourceLink=url=>`[原商品](${url})`;

export function renderCatalogMarkdown(catalog,status) {
  const rows=(catalog?.items??[]).flatMap(item=>item.offers.map(offer=>[
    item.id,
    item.wineNames.join(' / ')||item.title,
    item.vintages.length?item.vintages.join(' / '):'未标示',
    `${offer.name||'规格'}（SKU ${offer.skuId}）`,
    `¥${offer.price}`,
    state(item.availability),
    skuState(offer),
    offer.inventory===null?'未知':offer.inventory,
    offer.lastKnownInventory===null?'未验证':date(offer.observedAt),
    sourceLink(item.url),
  ]));
  return [
    '# WineRadar 完整商品目录',
    '',
    `数据快照：${date(catalog?.generatedAt)}；本轮状态：${status.state}；商品 ${catalog?.items?.length??0} 款，规格 ${rows.length} 条。`,
    '',
    `结构化权威数据：[catalog.json](${base}catalog.json)；[更新与失败状态](${base}status.md)。价格为规格总价。库存“未知”不等于售罄；最后验证时间表示历史成功读取时间，不表示当前仍有库存。`,
    '',
    table(['商品 ID','名称','年份','规格 / SKU','价格（CNY）','商品库存状态','SKU 库存状态','当前 SKU 库存','库存最后验证时间（北京时间）','原商品链接'],rows),
    '',
  ].join('\n');
}

export function renderStatusMarkdown(catalog,status) {
  const summary=[
    ['采集状态',status.state],
    ['目录商品数',status.itemCount],
    ...(status.queue?[['已发现候选商品数',status.queue.discoveredCount],['历史已验证详情商品数',status.detailVerifiedCount??status.queue.verifiedCount],['历史已验证库存 SKU 数',status.skuEverVerifiedCount??0]]:[]),
    ['本轮成功更新',status.freshItemCount],
    ...(status.queue?[['本轮已验证库存 SKU 数',status.freshSkuVerifiedCount??0]]:[]),
    ['本轮失败',status.failedCount],
    ['当前库存未知商品数',status.unknownCount],
    ['保留历史数据',status.retainedPreviousData?'是':'否'],
    ['商品目录快照时间（北京时间）',date(catalog?.generatedAt)],
    ['最近成功采集时间（北京时间）',date(status.lastSuccessAt)],
    ['最近采集结束时间（北京时间）',date(status.finishedAt)],
    ['数据新鲜度界限（北京时间）',date(status.dataStaleAfter)],
    ['最近采集运行链接',status.runUrl?`[GitHub Actions](${status.runUrl})`:'本地快照'],
  ];
  const errors=(status.errors??[]).map(error=>[error.id??'—',error.code??'未知',error.message??'未提供',date(error.at)]);
  const sources=(status.coverage?.channels??[]).map(source=>[source.channel,source.observedCandidates??0,source.error?.code??'无']);
  const countries=(status.countryCounts??[]).map(row=>[row.country,row.count]);
  return [
    '# WineRadar 更新状态',
    '',
    `本文件与 [完整商品目录](${base}catalog.md)、[权威 JSON](${base}catalog.json)、[机器状态](${base}status.json) 来自同一份已保存快照。`,
    '',
    table(['字段','值'],summary),
    '',
    '## 本轮失败记录',
    '',
    table(['商品 ID','代码','原因','时间（北京时间）'],errors),
    '',
    '## 本轮发现入口',
    '',
    table(['入口','观察到的候选数','入口错误'],sources),
    '',
    '## 已验证详情商品的产国',
    '',
    table(['产国','商品数'],countries),
    '',
    '候选商品数不等于成功采集数。历史价格和最后验证时间可以用于筛选，库存“未知”不能当作实时在售。',
    '',
  ].join('\n');
}

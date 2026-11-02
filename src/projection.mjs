// Retain only fields consumed by the model; omit staff data, coupons and HTML descriptions.
const pick = (value, keys) => Object.fromEntries(keys.filter(key=>Object.hasOwn(value??{},key)).map(key=>[key,value[key]]));
export function projectResponse(kind, response) {
  const root = pick(response,['error_code','error_msg']);
  if (!response?.data || typeof response.data !== 'object') return root;
  if (kind === 'detail') {
    root.data = pick(response.data,['id','title','inventory']);
    if (Array.isArray(response.data.package)) root.data.package=response.data.package.map(p=>pick(p,['id','inventory']));
    if (Array.isArray(response.data.product_info)) root.data.product_info=response.data.product_info.map(w=>pick(w,['id','en_product_name','cn_product_name','capacity','country_name','producing_area_name','chateau_name']));
  } else if (kind === 'inventory') {
    root.data=pick(response.data,['id','price','purchased','shipment_time','onsale_time','sold_out_time','onsale_status']);
    if(Array.isArray(response.data.packageList)) root.data.packageList=response.data.packageList.map(p=>({
      ...pick(p,['id','period_id','package_name','price','inventory','is_onsale','is_hidden','is_hidden_package','unlimited']),
      ...(Array.isArray(p.product_list)?{product_list:p.product_list.map(w=>pick(w,['product_id','nums','inventory']))}:{}),
    }));
  } else throw new Error('Unknown response kind');
  return root;
}

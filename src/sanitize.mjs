const sensitiveKey = /token|secret|password|authorization|cookie|session|openid|unionid|user_?id|member_?id|phone|mobile|email|address|nickname|avatar|realname|signature|(^|_)sign($|_)|(^|_)uid($|_)|^(buyer|creator|operation|operation_review|design)_(id|name)$|^purchasing_said_(name|desc|image)$/i;
const credentialPattern = /\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16})\b/g;
const publicQuery = new Set(['id','cid','period','periods','periods_type','t','isJson','client','type','bection']);

export function cleanUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:','https:'].includes(url.protocol)) return '[omitted URL]';
    url.username = ''; url.password = ''; url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if(key==='mdStr'){url.searchParams.delete(key);continue;}
      const v = url.searchParams.get(key);
      if (!publicQuery.has(key) || sensitiveKey.test(key) || (!/^(?:\d+|true|false)$/.test(v)&&!(key==='type'&&['colum','card'].includes(v)))) url.searchParams.set(key,'[REDACTED]');
    }
    return url.toString();
  } catch { return '[invalid URL]'; }
}

export function clean(value, key = '') {
  if (sensitiveKey.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map(item=>clean(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clean(v,k)]));
  if (typeof value !== 'string') return value;
  return value
    .replace(/https?:\/\/[^\s"<>]+/g, url=>cleanUrl(url))
    .replace(/Bearer\s+[^\s"<>]+/gi,'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[REDACTED_JWT]')
    .replace(credentialPattern,'[REDACTED_CREDENTIAL]')
    .replace(/\b(token|password|secret|session|authorization|cookie)\s*[:=]\s*(?!\[REDACTED)([^\s,;"<>]+)/gi,'$1=[REDACTED]');
}

export function assertNoSecrets(text) {
  if (text.match(credentialPattern) || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) throw new Error('Potential credential detected; artifact/export rejected');
}

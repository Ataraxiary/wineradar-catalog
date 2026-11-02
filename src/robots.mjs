export function robotsAllows(text,path,agent='WineRadarCatalog') {
  const groups=[];let current=null,hasRules=false;
  for(const raw of text.split(/\r?\n/)) {
    const line=raw.split('#')[0].trim();if(!line)continue;
    const match=line.match(/^([\w-]+)\s*:\s*(.*)$/);if(!match)continue;
    const key=match[1].toLowerCase(),value=match[2].trim();
    if(key==='user-agent'){if(!current||hasRules){current={agents:[],rules:[]};groups.push(current);hasRules=false;}current.agents.push(value.toLowerCase());}
    else if(current&&['allow','disallow'].includes(key)){current.rules.push({allow:key==='allow',path:value});hasRules=true;}
  }
  const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&agent.toLowerCase().includes(a)));
  const active=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
  const matches=active.flatMap(g=>g.rules).filter(r=>r.path&&new RegExp('^'+r.path.replace(/[.+?^{}()|[\]\\]/g,'\\$&').replaceAll('*','.*')).test(path)).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
  return !matches.length||matches[0].allow;
}
export async function checkRobots(context,paths) {
  const response=await context.request.get('https://h5.vinehoo.com/robots.txt',{timeout:20000,maxRedirects:3});
  if([401,403,429].includes(response.status()))throw Object.assign(new Error('robots.txt access restricted'),{code:'robots_disallowed',stop:true});
  if(response.status()>=500)throw Object.assign(new Error(`robots.txt HTTP ${response.status()}`),{code:'robots_unavailable',stop:true});
  const text=await response.text();
  if(/<!doctype|<html/i.test(text))return {status:response.status(),provided:false,note:'Site returned SPA HTML instead of robots directives',checkedAt:new Date().toISOString()};
  const denied=paths.filter(path=>!robotsAllows(text,path));
  if(denied.length)throw Object.assign(new Error('robots.txt disallows requested collection paths'),{code:'robots_disallowed',stop:true});
  return {status:response.status(),provided:response.status()===200,allowed:true,checkedAt:new Date().toISOString()};
}

const hours=ms=>new Date(ms).toISOString();
export const isRequestFailure=error=>!['not_wine','price_not_public'].includes(error.code);
export function exceedsFailureRate(errors,attemptedCount,{minimumSample,maximumRate}) {
  const eligible=attemptedCount-errors.filter(error=>!isRequestFailure(error)).length;
  if(eligible<minimumSample)return false;
  return errors.filter(isRequestFailure).length/eligible>=maximumRate;
}
export function mergeQueue(previous,discovered,items,now) {
  const entries=new Map((previous?.entries??[]).map(entry=>[entry.id,structuredClone(entry)]));
  for(const item of items??[])if(!entries.has(item.id))entries.set(item.id,{id:item.id,title:item.title,
    sources:item.discoverySources??[],firstSeenAt:item.observedAt,lastVerifiedAt:item.observedAt,attempts:0,state:'verified'});
  for(const candidate of discovered??[]){
    const entry=entries.get(candidate.id)??{id:candidate.id,firstSeenAt:now,attempts:0,state:'pending'};
    entry.title=String(candidate.title??entry.title??'').slice(0,180);
    entry.sources=candidate.sources??entry.sources??[];
    entries.set(candidate.id,entry);
  }
  return {schemaVersion:1,updatedAt:now,entries:[...entries.values()].sort((a,b)=>a.id-b.id)};
}
export function planBatch(queue,{maxAttempts,now}) {
  const ready=queue.entries.filter(entry=>entry.state!=='excluded'&&(!entry.nextEligibleAt||entry.nextEligibleAt<=now));
  const pending=ready.filter(entry=>!entry.lastVerifiedAt).sort((a,b)=>a.firstSeenAt.localeCompare(b.firstSeenAt)||a.id-b.id);
  const refresh=ready.filter(entry=>entry.lastVerifiedAt).sort((a,b)=>a.lastVerifiedAt.localeCompare(b.lastVerifiedAt)||a.id-b.id);
  const reserved=Math.min(Math.floor(maxAttempts/5),refresh.length);
  const chosenPending=pending.slice(0,maxAttempts-reserved),chosenRefresh=refresh.slice(0,reserved),ordered=[];
  for(let slot=0;slot<maxAttempts;slot++){
    if(slot%5===0&&chosenRefresh.length)ordered.push(chosenRefresh.shift());
    else if(chosenPending.length)ordered.push(chosenPending.shift());
    else if(chosenRefresh.length)ordered.push(chosenRefresh.shift());
  }
  return [...ordered,...pending.slice(maxAttempts-reserved),...refresh.slice(reserved)]
    .slice(0,maxAttempts).map(entry=>({id:entry.id,title:entry.title,sources:entry.sources??[]}));
}
export function recordQueueAttempt(queue,id,{at,success=false,code=null}) {
  const entry=queue.entries.find(item=>item.id===id);
  if(!entry)throw new Error(`Queue entry missing: ${id}`);
  entry.attempts=(entry.attempts??0)+1;entry.lastAttemptAt=at;
  if(success){entry.state='verified';entry.lastVerifiedAt=at;delete entry.nextEligibleAt;delete entry.lastErrorCode;}
  else if(code==='not_wine'){entry.state='excluded';entry.lastErrorCode=code;}
  else if(code==='price_not_public'){entry.state='pending';entry.lastErrorCode=code;entry.nextEligibleAt=hours(Date.parse(at)+7*24*3600000);}
  else{entry.state='pending';entry.lastErrorCode=code??'request_failed';entry.nextEligibleAt=hours(Date.parse(at)+12*3600000);}
  queue.updatedAt=at;
  return queue;
}
export function queueStats(queue) {
  return {discoveredCount:queue.entries.length,verifiedCount:queue.entries.filter(e=>Boolean(e.lastVerifiedAt)).length,
    pendingCount:queue.entries.filter(e=>e.state==='pending').length,
    unverifiedCandidateCount:queue.entries.filter(e=>e.state==='pending'&&!e.lastVerifiedAt).length,
    previouslyVerifiedRetryCount:queue.entries.filter(e=>e.state==='pending'&&Boolean(e.lastVerifiedAt)).length,
    priceHiddenCount:queue.entries.filter(e=>e.lastErrorCode==='price_not_public').length,
    excludedCount:queue.entries.filter(e=>e.state==='excluded').length};
}

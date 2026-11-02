import {promises as fs} from 'node:fs';
import {clean} from '../src/sanitize.mjs';
const root=new URL('../data/',import.meta.url);await fs.mkdir(root,{recursive:true});
let status={},catalog=null;
try{status=JSON.parse(await fs.readFile(new URL('status.json',root),'utf8'));}catch{}
try{catalog=JSON.parse(await fs.readFile(new URL('catalog.json',root),'utf8'));}catch{}
const runUrl=`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
if(status.runUrl!==runUrl){const error={code:'workflow_'+(process.env.FAILURE_STAGE??'collection')+'_failed',message:'Workflow step failed before a successful collection; inspect the linked run',at:new Date().toISOString()};status={...status,state:'failed',lastAttemptAt:error.at,finishedAt:error.at,freshItemCount:0,retainedPreviousData:Boolean(catalog),errors:[error],runUrl,dataGeneratedAt:catalog?.generatedAt??null,itemCount:catalog?.items?.length??0,availableCount:0,soldOutCount:0,unknownCount:catalog?.items?.length??0};}
await fs.writeFile(new URL('status.json',root),JSON.stringify(clean(status),null,2)+'\n');
console.log(JSON.stringify({state:status.state,previousCatalogRetained:Boolean(catalog),errorCodes:status.errors?.map(e=>e.code)}));

import {promises as fs} from 'node:fs';
const status=JSON.parse(await fs.readFile(new URL('../data/status.json',import.meta.url),'utf8'));
if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,`state=${status.state}\n`);
if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,`## WineRadar\n\n- Collection: ${status.state}\n- Fresh successful listings: ${status.freshItemCount}\n- Published listings: ${status.itemCount}\n- Failures: ${status.failedCount}\n- Previous data retained: ${status.retainedPreviousData}\n- Observation: ${status.dataGeneratedAt}\n\n[Public catalog](https://ataraxiary.github.io/wineradar-catalog/)\n`);
console.log(JSON.stringify({state:status.state,items:status.itemCount,fresh:status.freshItemCount}));

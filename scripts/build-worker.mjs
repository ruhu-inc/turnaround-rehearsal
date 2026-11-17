import {mkdir,copyFile,writeFile,readFile} from 'node:fs/promises';
// Owner-specific hosting metadata is optional and never committed publicly.
let hosting={d1:'VOICE_BUDGET'};
try {
 hosting=JSON.parse(await readFile('.openai/hosting.json','utf8'));
 await mkdir('dist/.openai',{recursive:true});
 await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
} catch(error) {
 if(error.code!=='ENOENT')throw error;
}
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'turnaround-rehearsal',main:'index.js',compatibility_date:'2026-11-13',d1_databases:hosting.d1?[{binding:hosting.d1,database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000'}]:[],assets:{directory:'../client',binding:'ASSETS',run_worker_first:['/api/*']}}));

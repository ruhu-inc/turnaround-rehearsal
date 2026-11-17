import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {reserveVoice,type VoiceDatabase} from '../server/voice-budget';
import {speechResponse,resetSpeechLimits} from '../server/speech';
const input={caseId:'bay-a',event:false,start:2700,stage:'result'};
function database(){const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0000_voice_budget.sql',import.meta.url),'utf8'));return {db,adapter:{prepare(sql:string){return {bind(...args:number[]){return {async first(){return db.prepare(sql).get(...args)??null;}};}};}} satisfies VoiceDatabase};}
test('durable budget caps an hour, resets windows, and never resets its campaign total',async()=>{
 const {db,adapter}=database();
 for(let i=0;i<200;i++)assert.equal(await reserveVoice(adapter,0),true);
 assert.equal(await reserveVoice(adapter,0),false);
 assert.equal(await reserveVoice(adapter,3600000),true);
 db.exec('UPDATE voice_budget SET day_count=500');
 assert.equal(await reserveVoice(adapter,7200000),false);
 assert.equal(await reserveVoice(adapter,86400000),true);
 db.exec('UPDATE voice_budget SET total=5000');
 assert.equal(await reserveVoice(adapter,172800000),false);db.close();
});
test('concurrent reservations cannot exceed the final remaining allowance',async()=>{
 const {db,adapter}=database();await reserveVoice(adapter,0);db.exec('UPDATE voice_budget SET total=4999');
 const results=await Promise.all(Array.from({length:20},()=>reserveVoice(adapter,0)));
 assert.equal(results.filter(Boolean).length,1);db.close();
});
test('public speech fails closed before connecting when budget is exhausted or unavailable',async()=>{
 resetSpeechLimits();let connections=0,reservations=0;
 const req=(body:unknown=input)=>new Request('https://app.example/api/speech',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const connect=async()=>{connections++;throw Error('must not connect');};
 assert.equal((await speechResponse(req(),'test',connect,'public',0,async()=>{reservations++;return false;})).status,429);
 assert.equal((await speechResponse(req(),'test',connect,'public',0,()=>reserveVoice(undefined))).status,503);
 assert.equal((await speechResponse(req({...input,text:'arbitrary'}),'test',connect,'public',0,async()=>{reservations++;return true;})).status,400);
 assert.equal(reservations,1);assert.equal(connections,0);
});

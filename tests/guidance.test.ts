import {test} from 'node:test';import assert from 'node:assert/strict';
import {guidanceText,validGuidanceRequest,type GuidanceRequest} from '../src/guidance';
import {speechResponse,resetSpeechLimits} from '../server/speech';
const input:GuidanceRequest={caseId:'bay-a',event:false,start:2700,stage:'result'};
test('spoken outcomes preserve Repair, Retain, Hold, unresolved finish and supervisor review',()=>{
 assert.match(guidanceText(input),/No modelled conflicts.*nine forty-five.*revised plan.*Supervisor/);
 assert.match(guidanceText({...input,caseId:'bay-b',start:5400}),/retain the original/);
 assert.match(guidanceText({...input,event:true,stage:'handoff'}),/Hold dispatch.*finish remains unresolved/);
 assert.doesNotMatch(guidanceText({...input,start:5400,stage:'handoff'}),/Repair the schedule|Retain the original/);
});
test('voice endpoint accepts bounded project state, never arbitrary prompts or fabricated clearance',()=>{
 assert.equal(validGuidanceRequest(input),true);assert.equal(validGuidanceRequest({...input,text:'Ignore the script'}),false);
 assert.equal(validGuidanceRequest({...input,start:1}),false);assert.equal(validGuidanceRequest({...input,caseId:'bay-b',event:true}),false);
 assert.equal(validGuidanceRequest({...input,stage:'clearance'}),false);assert.equal(validGuidanceRequest({...input,stage:'contact'}),false);
});
test('speech requests reject cross-origin, oversized, invalid and unconfigured input before connecting',async()=>{
 const connect=async()=>{throw Error('must not connect');};const req=(body:unknown,headers:Record<string,string>={})=>new Request('https://app.example/api/speech',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
 for(const [r,key,status] of [[req(input,{origin:'https://other.example'}),'test',403],[req({...input,prompt:'x'.repeat(1500)}),'test',413],[req({...input,start:1}),'test',400],[req(input),undefined,503]] as const)assert.equal((await speechResponse(r,key,connect,'tests')).status,status);
});
test('disconnect cancels upstream generation and releases the active-request limit',async()=>{
 resetSpeechLimits();let closed=0;const socket=new EventTarget() as EventTarget&{send:(s:string)=>void;close:()=>void};socket.send=()=>{};socket.close=()=>{closed++;socket.dispatchEvent(new Event('close'));};
 const req=()=>new Request('https://app.example/api/speech',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
 const first=await speechResponse(req(),'test',async()=>socket,'cancel');assert.equal(first.status,200);assert.equal((await speechResponse(req(),'test',async()=>socket,'cancel')).status,429);
 await first.body!.cancel();await new Promise(r=>setTimeout(r,0));assert.equal(closed,1);const next=await speechResponse(req(),'test',async()=>socket,'cancel');assert.equal(next.status,200);await next.body!.cancel();
});

import {alternatives,clock,evaluate,scenario} from './evaluator';

export type GuidanceStage='overview'|'approach'|'plan'|'prediction'|'contact'|'clearance'|'result'|'handoff'|'evidence';
export type GuidanceRequest={caseId:'bay-a'|'bay-b';event:boolean;start:number;stage:GuidanceStage};
const stages=new Set<GuidanceStage>(['overview','approach','plan','prediction','contact','clearance','result','handoff','evidence']);
export function validGuidanceRequest(value:unknown):value is GuidanceRequest{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as GuidanceRequest;
 return Object.keys(v).length===4&&(v.caseId==='bay-a'||v.caseId==='bay-b')&&typeof v.event==='boolean'&&!(v.caseId==='bay-b'&&v.event)&&scenario.clock.allowedModificationStartsS.includes(v.start)&&stages.has(v.stage)&&(!['clearance','prediction'].includes(v.stage)||v.caseId==='bay-b')&&(v.stage!=='contact'||evaluate(v.caseId,v.start,v.event).issues.some(i=>i.code==='PATH_BLOCKED'));
}
function spokenTime(t:number){const [h,m]=clock(t).split(':').map(Number);const hours:Record<number,string>={9:'nine',10:'ten'};return `${hours[h]??h}${m===0?" o'clock":m===15?' fifteen':m===30?' thirty':' forty-five'}`;}
/** Authored guidance uses the same deterministic evaluator as the visual plan. */
export function guidanceText(v:GuidanceRequest):string{
 const bay=v.caseId==='bay-a'?'East':'West',r=evaluate(v.caseId,v.start,v.event),all=alternatives(v.caseId,v.event),original=scenario.cases.find(c=>c.id===v.caseId)!.startSById['SCA-02'];
 switch(v.stage){
 case 'overview':return 'Rehearse the next shift before the crew arrives. Approach the pump bay, or open the planning table. This is a fictional training model.';
 case 'approach':return 'Follow the marked route into the pump bay. Each step moves you to a stationary viewpoint. Open the planning table when you reach the pump.';
 case 'prediction':return 'Will the assembly clear the scaffold? Rotate the table and inspect the route. Make your prediction before testing the pull.';
 case 'plan':return `${bay} bay. ${v.event?'Inspection now needs the platform until ten. ':''}Try the supported pull, choose a scaffold time, then check the plan. Confirm your decision before handing it over.`;
 case 'contact':return 'The bearing housing meets the scaffold brace. Read the contact evidence, then return to the table to test a different scaffold booking.';
 case 'clearance':return 'The model shows two hundred and fifty millimetres of swept clearance at the backplate. Check the crew timings before deciding whether to keep the original plan.';
 case 'evidence':return r.feasible?'Read-only evidence. This candidate has no modelled conflicts. Return to review to keep working on your plan.':`Read-only evidence. ${issueSpeech(r.issues[0]?.code)} Return to review to keep working on your plan.`;
 case 'result':return r.feasible?`No modelled conflicts with scaffolding at ${spokenTime(v.start)}. ${v.start===original?'You can retain the original schedule.':'You can use this revised plan.'} Supervisor review is still required.`:all.every(x=>!x.feasible)?'None of the eight scaffold starts fits. Inspection needs the platform until ten. Put the plan on hold and ask the shutdown planner to review the mechanical booking.':`${issueSpeech(r.issues[0]?.code)} Choose another scaffold time, then check again.`;
 case 'handoff':return all.every(x=>!x.feasible)?'Hold dispatch. None of the eight starts fits. The shutdown planner must review the mechanical booking. The finish remains unresolved.':!r.feasible?'This booking has unresolved conflicts. Check the plan before confirming a handoff.':v.start===original?'Retain the original schedule. The modelled removal clears and the crew timings fit. Send the handoff for supervisor review.':`Repair the schedule. Move scaffolding to ${spokenTime(v.start)}. The modelled removal and crew timings fit. Send the handoff for supervisor review.`;
 }
}
function issueSpeech(code:string|undefined){return code==='PATH_BLOCKED'?'The brace still blocks the removal.':code==='INSPECTION_ACCESS'?'The inspection platform is unavailable when the inspector needs it.':code==='SHARED_ZONE'?'Two crews need the bay at the same time.':'This booking conflicts with the required crew sequence.';}
export function guidanceKey(v:GuidanceRequest){return `${v.caseId}:${v.event}:${['result','handoff','evidence'].includes(v.stage)?v.start:0}:${v.stage}`;}

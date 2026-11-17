import {alternatives,evaluate,scenario,clock,type Result,type Window} from './evaluator';
export type CaseId='bay-a'|'bay-b';
export type Snapshot=Readonly<{fixtureVersion:string;caseId:CaseId;event:boolean;eventId:string|null;start:number;label:'Original plan'|'Accepted plan'|'Rejected alternative';sourceRevision:number|null;windows:Readonly<Record<string,Readonly<Window>>>}>;
export type Handoff=Readonly<{schema:1;fixtureVersion:string;caseId:CaseId;eventId:string|null;revision:number;disposition:'repair'|'retain'|'hold';original:Snapshot;confirmedInputs:Snapshot;evidence:ReadonlyArray<Snapshot>;findings:ReadonlyArray<Result>;deadline:number;lastFinish:number|null;bookingToReview:Readonly<Window>|null;slotsChecked:number;reviewNote:string}>;
export function freezePlain<T>(value:T):T {if(value&&typeof value==='object'){Object.values(value).forEach(freezePlain);Object.freeze(value);}return value;}
export function makeSnapshot(caseId:CaseId,start:number,event:boolean,label:Snapshot['label'],revision:number|null):Snapshot {
 const r=evaluate(caseId,start,event);
 return freezePlain({fixtureVersion:r.fixtureVersion,caseId,event,eventId:r.eventId,start,label,sourceRevision:label==='Accepted plan'?revision:null,windows:structuredClone(r.windows)});
}
export function makeHandoff(caseId:CaseId,start:number,event:boolean,revision:number,disposition:Handoff['disposition']):Handoff {
 const r=evaluate(caseId,start,event),received=scenario.cases.find(c=>c.id===caseId)!.startSById['SCA-02'];
 const choices=alternatives(caseId,event);
 if(disposition==='hold'?choices.some(r=>r.feasible):!r.feasible)throw Error('Handoff requires a checked decision');
 const original=makeSnapshot(caseId,received,false,'Original plan',null),confirmedInputs=makeSnapshot(caseId,start,event,disposition==='hold'?'Rejected alternative':'Accepted plan',revision);
 const evidence=disposition==='hold'?choices.map(r=>makeSnapshot(caseId,r.start,event,'Rejected alternative',null)):[original,confirmedInputs];
 return freezePlain({schema:1,fixtureVersion:r.fixtureVersion,caseId,eventId:r.eventId,revision,disposition,original,confirmedInputs,evidence,findings:structuredClone(disposition==='hold'?choices:[evaluate(caseId,received,false),r]),deadline:r.deadline,lastFinish:disposition==='hold'?null:r.lastFinish,bookingToReview:disposition==='hold'?structuredClone(r.windows['PMP-03']):null,slotsChecked:choices.length,reviewNote:'Fictional model. Supervisor review requested; surveyed geometry, permits and plant approval remain external.'});
}
export function handoffText(h:Handoff):string {
 const name=h.caseId==='bay-a'?'East bay':'West bay',w=h.confirmedInputs.windows;
 const span=(o:Readonly<Window>)=>clock(o.start).slice(0,5)+'–'+clock(o.finish).slice(0,5);
 const lines=[`${name} · Proposed shift handoff · Revision ${h.revision}`];
 if(h.disposition==='hold')lines.push(`Hold PMP-03, ${span(w['PMP-03'])}, for replanning.`,`INS-01 needs the original platform until ${clock(w['INS-01'].finish).slice(0,5)}.`,`None of the ${h.slotsChecked} scaffold starts preserves inspection access and clears the assembly for the booked mechanical work.`,`Shutdown planner to review the mechanical booking before dispatch.`,`Finish time pending replanning.`);
 else {lines.push(`Keep INS-01 at ${span(w['INS-01'])} and PMP-03 at ${span(w['PMP-03'])}.`,h.disposition==='retain'?`Retain SCA-02 at ${span(w['SCA-02'])}.`:`Move SCA-02 from ${span(h.original.windows['SCA-02'])} to ${span(w['SCA-02'])}.`,...(h.disposition==='repair'&&h.findings[0].issues.some(i=>i.code==='PATH_BLOCKED')?[`The original brace blocked withdrawal at ${clock(h.findings[0].issues.find(i=>i.code==='PATH_BLOCKED')!.time)}. Inspection now finishes before the scaffold changes.`]:[]),`The checked withdrawal clears all modelled obstructions.`,`Last job finishes at ${clock(h.lastFinish!).slice(0,5)}. Handover due ${clock(h.deadline).slice(0,5)}.`);}
 lines.push('Supervisor review requested.');return lines.join('\n');
}

/** Short first-read decision; full text and immutable evidence stay available. */
export function handoffSummary(h:Handoff){
 const w=h.confirmedInputs.windows,span=(key:string)=>clock(w[key].start).slice(0,5)+'–'+clock(w[key].finish).slice(0,5);
 return h.disposition==='hold'?{title:'HOLD / REVIEW MECHANICAL BOOKING',lines:[`${h.slotsChecked} starts checked · 0 feasible`,`Inspection needs the platform until ${clock(w['INS-01'].finish).slice(0,5)}.`,`Planner: review PMP-03 ${span('PMP-03')}.`,'Finish pending replanning · supervisor review.']}:
 {title:h.disposition==='repair'?'REPAIR / MOVE THE SCAFFOLD':'RETAIN / KEEP THE BOOKING',lines:[`Scaffold ${span('SCA-02')}`,h.disposition==='repair'?'Inspection finishes before the scaffold changes.':'250 mm modelled clearance at the backplate.',`Last finish ${clock(h.lastFinish!).slice(0,5)} · handover ${clock(h.deadline).slice(0,5)}`,'Supervisor review requested.']};
}

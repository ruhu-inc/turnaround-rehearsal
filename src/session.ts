import {alternatives,evaluate,scenario,type Result} from './evaluator';
import type {WorkOrderId} from './equipment';
import {makeSnapshot,makeHandoff,freezePlain,type CaseId,type Snapshot,type Handoff} from './handoff';
export type {CaseId,Snapshot,Handoff} from './handoff';
export type View='table'|'contact'|'clearance'|'inspection'|'pump';
export type Prediction='Clear'|'Blocked';
export type RecordState={start:number;originalStart:number;accepted:number|null;revision:number;prediction:Prediction|null;hints:number;hold:boolean;undo:number|null;checked:boolean;decisionStart:number|null;handoff:Handoff|null};
export type Evidence={snapshot:Snapshot;returnProgress:number;returnSecond:number;returnMode:'pull'|'shift';returnView:View;returnRotation:number;returnSelection:{job:WorkOrderId|null;equipment:string|null}};
export interface StorageLike {getItem(key:string):string|null;setItem(key:string,value:string):void}
const STORAGE_KEY='turnaround-session-v1';
const received=(caseId:CaseId)=>scenario.cases.find(c=>c.id===caseId)!.startSById['SCA-02'];
const fresh=(start=received('bay-a')):RecordState=>({start,originalStart:start,accepted:null,revision:0,prediction:null,hints:0,hold:false,undo:null,checked:false,decisionStart:null,handoff:null});
const slot=(n:unknown):n is number=>typeof n==='number'&&scenario.clock.allowedModificationStartsS.includes(n);
const keys=['bay-a:base','bay-b:base','bay-a:overrun'];
function validRecord(r:unknown):r is RecordState {
 if(!r||typeof r!=='object')return false;const x=r as RecordState;
 return slot(x.start)&&slot(x.originalStart)&&(x.accepted===null||slot(x.accepted))&&Number.isSafeInteger(x.revision)&&x.revision>=0&&[null,'Clear','Blocked'].includes(x.prediction)&&Number.isSafeInteger(x.hints)&&x.hints>=0&&typeof x.hold==='boolean'&&(x.undo===null||slot(x.undo))&&typeof x.checked==='boolean'&&(x.decisionStart===null||slot(x.decisionStart))&&(x.handoff===null||typeof x.handoff==='object');
}
export class Session {
 caseId:CaseId='bay-a';event=false;records:Record<string,RecordState>={};checked:Result|null=null;
 private _progress=0;private _shiftSecond=NaN;
 playbackMode:'pull'|'shift'='pull';playing=false;speed=20;view:View='table';rotation=0;
 selectedWorkOrder:WorkOrderId|null=null;selectedEquipment:string|null=null;
 evidence:Evidence|null=null;needsResume=false;storageAvailable=true;
 constructor(private storage?:StorageLike){this.restore();}
 get key(){return this.caseId+(this.event?':overrun':':base');}
 get state(){return this.records[this.key]??(this.records[this.key]=fresh(received(this.caseId)));}
 get locked(){return this.caseId==='bay-b'&&this.state.prediction===null;}
 get effective(){const s=this.evidence?.snapshot;return evaluate(s?.caseId??this.caseId,s?.start??this.state.start,s?.event??this.event);}
 get progress(){return this._progress;}
 set progress(value:number){this._progress=value;if(this.playbackMode==='pull'){const s=this.effective.stroke;this._shiftSecond=s.start+value*s.duration;}}
 get shiftSecond(){return Number.isFinite(this._shiftSecond)?this._shiftSecond:this.effective.stroke.start;}
 get playbackRate(){return this.playbackMode==='shift'?scenario.clock.viewEndsS/12:this.speed;}
 get scaffoldState(){const w=this.effective.windows['SCA-02'],t=this.shiftSecond;return t<w.start?'original':t<w.finish?'reconfiguring':'reconfigured';}
 get handoffVisible(){const s=this.state;return !this.evidence&&s.checked&&s.handoff!==null&&s.revision>0&&s.decisionStart===s.start&&(s.hold||s.accepted===s.start);}
 get options(){return alternatives(this.caseId,this.event);}
 get canHold(){return !!this.checked&&this.checked.start===this.state.start&&this.options.length===scenario.clock.allowedModificationStartsS.length&&this.options.every(r=>!r.feasible);}
 get dirty(){return this.state.start!==(this.state.decisionStart??this.state.originalStart);}
 selectEquipment(job:WorkOrderId,equipment:string){if(this.locked)return false;this.selectedWorkOrder=job;this.selectedEquipment=equipment;return true;}
 private planning(){return !this.evidence&&!this.locked;}
 choose(start:number){if(!this.planning())return false;evaluate(this.caseId,start,this.event);if(start===this.state.start)return true;this.state.undo=this.state.start;this.state.start=start;this.invalidate();this.persist();return true;}
 check(){if(!this.planning())return null;this.checked=evaluate(this.caseId,this.state.start,this.event);this.state.checked=true;this.playing=false;this.persist();return this.checked;}
 accept(){
  if(!this.planning()||!this.checked?.feasible||this.checked.start!==this.state.start)return false;const s=this.state;
  if(s.accepted!==s.start||s.hold||s.revision===0){s.revision++;s.handoff=makeHandoff(this.caseId,s.start,this.event,s.revision,s.start===received(this.caseId)?'retain':'repair');}
  s.accepted=s.start;s.hold=false;s.decisionStart=s.start;this.persist();return true;
 }
 confirmHold(){if(!this.planning()||!this.canHold)return false;const s=this.state;if(!s.hold||s.decisionStart!==s.start||s.revision===0){s.revision++;s.handoff=makeHandoff(this.caseId,s.start,this.event,s.revision,'hold');}s.hold=true;s.accepted=null;s.decisionStart=s.start;this.persist();return true;}
 undo(){if(!this.planning()||this.state.undo===null)return false;const p=this.state.start;this.state.start=this.state.undo;this.state.undo=p;this.invalidate();this.persist();return true;}
 private invalidate(){this.checked=null;this.state.checked=false;this.playing=false;this.playbackMode='pull';this.progress=0;}
 predict(prediction:Prediction){if(this.evidence||!this.locked)return false;this.state.prediction=prediction;this.persist();return true;}
 resetConfirmed(){if(this.evidence)return false;this.records[this.key]=fresh(this.event?this.records['bay-a:base']?.accepted??received(this.caseId):received(this.caseId));this.invalidate();this.needsResume=false;this.view='table';this.persist();return true;}
 discardDraft(){if(this.evidence)return false;this.state.start=this.state.decisionStart??this.state.originalStart;this.state.undo=null;this.state.checked=this.state.revision>0;this.checked=this.state.checked?evaluate(this.caseId,this.state.start,this.event):null;this.playbackMode='pull';this.progress=0;this.playing=false;this.persist();return true;}
 switchCase(caseId:CaseId,event=false){
  if(this.evidence||(event&&caseId!=='bay-a')||event&&this.records['bay-a:base']?.accepted==null)return false;
  this.caseId=caseId;this.event=event;this.selectedWorkOrder=null;this.selectedEquipment=null;if(!this.records[this.key])this.records[this.key]=fresh(event?this.records['bay-a:base'].accepted!:received(caseId));
  this.playbackMode='pull';this.progress=0;this.playing=false;this.needsResume=false;this.view='table';this.rotation=0;this.checked=this.state.checked?evaluate(caseId,this.state.start,event):null;this.persist();return true;
 }
 startPull(play:boolean){if(this.locked||this.needsResume)return false;this.playbackMode='pull';this.progress=0;this.playing=play;return true;}
 private pullPosition(progress:number){const limit=this.effective.issues.find(i=>i.code==='PATH_BLOCKED')?.progress??1;this.progress=Math.min(Math.max(progress,0),limit);if(this.progress>=limit)this.playing=false;}
 seek(progress:number){if(this.locked||!Number.isFinite(progress))return false;this.playbackMode='pull';this.playing=false;this.pullPosition(progress);return true;}
 private shiftPosition(second:number){this._shiftSecond=Math.min(Math.max(second,0),scenario.clock.viewEndsS);const s=this.effective.stroke,raw=Math.min(1,Math.max(0,(this._shiftSecond-s.start)/s.duration)),limit=this.effective.issues.find(i=>i.code==='PATH_BLOCKED')?.progress??1;this._progress=Math.min(raw,limit);}
 seekShift(second:number){if(this.locked||!Number.isFinite(second))return false;this.playbackMode='shift';this.playing=false;this.shiftPosition(second);return true;}
 playShift(fromStart=true){if(this.locked||this.needsResume)return false;this.playbackMode='shift';if(fromStart)this.shiftPosition(0);this.playing=true;return true;}
 jumpToIssue(index=0){if(this.locked)return false;const issue=this.effective.issues[index];if(!issue)return false;this.seekShift(issue.time);this.view=issue.code==='INSPECTION_ACCESS'?'inspection':issue.code==='PATH_BLOCKED'?'contact':'table';return true;}
 tick(delta:number){
  if(!this.playing||this.needsResume||!Number.isFinite(delta)||delta<0)return;
  if(this.playbackMode==='pull'){this.pullPosition(this.progress+delta*this.speed/this.effective.stroke.duration);return;}
  const next=Math.min(scenario.clock.viewEndsS,this.shiftSecond+delta*this.playbackRate),issue=this.effective.issues.find(i=>i.time>this.shiftSecond&&i.time<=next);
  this.shiftPosition(issue?.time??next);if(issue||next===scenario.clock.viewEndsS)this.playing=false;
 }
 suspend(){this.playing=false;this.needsResume=true;}resume(){this.needsResume=false;}
 snapshot(start:number,label:Snapshot['label'],event=this.event){return makeSnapshot(this.caseId,start,event,label,this.state.revision);}
 openEvidence(start:number,label:Snapshot['label'],event=this.event){
  if(this.evidence||this.locked)return false;
  const saved=this.state.handoff?.evidence.find(s=>s.start===start&&s.event===event&&s.label===label),snapshot=saved??this.snapshot(start,label,event);
  this.evidence={snapshot,returnProgress:this.progress,returnSecond:this.shiftSecond,returnMode:this.playbackMode,returnView:this.view,returnRotation:this.rotation,returnSelection:{job:this.selectedWorkOrder,equipment:this.selectedEquipment}};this.playing=false;
  const r=this.effective,issue=r.issues.find(i=>i.code==='PATH_BLOCKED')??r.issues[0];
  if(issue)this.jumpToIssue(r.issues.indexOf(issue));else {this.seek(r.clearance?.progress??1);if(r.clearance)this.view='clearance';}
  return true;
 }
 closeEvidence(){if(!this.evidence)return false;const e=this.evidence;this.playbackMode=e.returnMode;this._progress=e.returnProgress;this._shiftSecond=e.returnSecond;this.view=e.returnView;this.rotation=e.returnRotation;this.selectedWorkOrder=e.returnSelection.job;this.selectedEquipment=e.returnSelection.equipment;this.evidence=null;this.playing=false;return true;}
 exportHandoff(){return this.handoffVisible?structuredClone(this.state.handoff):null;}
 addHint(){if(this.locked||this.evidence)return;this.state.hints++;this.persist();}
 persist(){if(!this.storage)return;try{this.storage.setItem(STORAGE_KEY,JSON.stringify({schema:2,fixtureVersion:scenario.scenarioVersion,activeKey:this.key,records:this.records}));}catch{this.storageAvailable=false;}}
 private restore(){
  if(!this.storage)return;
  try{
   const text=this.storage.getItem(STORAGE_KEY);if(!text)return;const data=JSON.parse(text);
   if(data.schema!==2||data.fixtureVersion!==scenario.scenarioVersion||!keys.includes(data.activeKey)||!data.records||typeof data.records!=='object')return;
   if(Object.entries(data.records).some(([k,r])=>!keys.includes(k)||!validRecord(r)))return;
   this.records=data.records;this.caseId=data.activeKey.startsWith('bay-b')?'bay-b':'bay-a';this.event=data.activeKey.endsWith(':overrun');
   for(const [key,s] of Object.entries(this.records)){
    if(s.revision===0){s.handoff=null;continue;}
    const c:CaseId=key.startsWith('bay-b')?'bay-b':'bay-a',e=key.endsWith(':overrun');
    let valid=false;
    if(s.decisionStart!==null&&s.handoff){try{valid=JSON.stringify(s.handoff)===JSON.stringify(makeHandoff(c,s.decisionStart,e,s.revision,s.hold?'hold':s.accepted===received(c)?'retain':'repair'));}catch{valid=false;}}
    if(!valid){s.accepted=null;s.hold=false;s.revision=0;s.decisionStart=null;s.handoff=null;s.checked=false;}else freezePlain(s.handoff);
   }
   this.checked=this.state.checked?evaluate(this.caseId,this.state.start,this.event):null;
  }catch{this.records={};this.caseId='bay-a';this.event=false;this.checked=null;this.storageAvailable=false;}
 }
}

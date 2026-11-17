import {scenario,loadScenario,type Scenario} from './scenario';
export {scenario};
export type Box = {id?: string; min:number[]; max:number[]};
export type Issue = {code:string; time:number; jobs:string[]; text:string; part?:string; obstacle?:string; progress?:number; point?:number[]};
export type Window={start:number;duration:number;finish:number};
export type Clearance={distanceMm:number;partId:string;obstacleId:string;progress:number};
export type Result={caseId:string;event:boolean;eventId:string|null;fixtureVersion:string;start:number;feasible:boolean;issues:Issue[];lastFinish:number;deadline:number;windows:Record<string,Window>;stroke:{start:number;duration:number;travelMm:number};clearance:Clearance|null};
export function contactInterval(part:Box,obstacle:Box,travel=scenario.bay.assemblyTravelMm[0]):[number,number]|null {
 if([...part.min,...part.max,...obstacle.min,...obstacle.max,travel].some(v=>!Number.isFinite(v))||travel<=0||part.min.length!==3||obstacle.min.length!==3)throw Error('Invalid geometry');
 if([0,1,2].some(k=>part.min[k]>=part.max[k]||obstacle.min[k]>=obstacle.max[k]))throw Error('Invalid geometry bounds');
 if([1,2].some(k=>Math.min(part.max[k],obstacle.max[k])<Math.max(part.min[k],obstacle.min[k])))return null;
 const lo=Math.max(0,(obstacle.min[0]-part.max[0])/travel),hi=Math.min(1,(obstacle.max[0]-part.min[0])/travel);return lo<=hi?[lo,hi]:null;
}
export function forbiddenContact(part:Box,obstacle:Box,travel=scenario.bay.assemblyTravelMm[0],allowances=scenario.bay.allowedContactPairs):boolean {
 const span=contactInterval(part,obstacle,travel);if(!span)return false;
 const pair=allowances.find(p=>p.movingPartId===part.id&&p.fixedPartId===obstacle.id);
 const positiveYZ=[1,2].every(k=>Math.min(part.max[k],obstacle.max[k])>Math.max(part.min[k],obstacle.min[k]));
 const penetration=positiveYZ&&Math.max(0,(obstacle.min[0]-part.max[0])/travel)<Math.min(1,(obstacle.max[0]-part.min[0])/travel);
 if(!pair||penetration)return true;
 return pair.atStrokeEndOnly?!(span[0]===1&&span[1]===1&&part.max[0]+travel===obstacle.min[0]&&positiveYZ):false;
}
export function clock(seconds:number,shiftStartsAt=scenario.clock.shiftStartsAt){const offset=shiftStartsAt.split(':').reduce((n,v)=>n*60+Number(v),0),s=Math.round(seconds)+offset;return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(x=>String(x).padStart(2,'0')).join(':');}
export function effectiveWindows(caseId:string,start:number,event=false,data:Scenario=scenario){
 const bay=data.cases.find(c=>c.id===caseId);
 if(!bay||!Number.isFinite(start)||!data.clock.allowedModificationStartsS.includes(start))throw Error('Choose a supported bay and a 15-minute scaffold slot');
 const update=event?data.events.find(e=>e.caseId===caseId):undefined;if(event&&!update)throw Error('No inspection update belongs to this bay');
 const windows:Record<string,Window>={};
 for(const o of data.workOrders){const t=o.id==='SCA-02'?start:bay.startSById[o.id as keyof typeof bay.startSById],duration=update?.workOrderId===o.id?update.setDurationS:o.durationS;windows[o.id]={start:t,duration,finish:t+duration};}
 return {bay,windows,eventId:update?.id??null};
}
function sweptClearance(data:Scenario,brace:Box):Clearance|null {
 const travel=data.bay.assemblyTravelMm[0];let closest:Clearance|null=null;
 for(const part of data.bay.movingPartsAtRestMm){
  if(part.min[0]>brace.max[0]||part.max[0]+travel<brace.min[0]||part.min[1]>brace.max[1]||part.max[1]<brace.min[1])continue;
  const gap=Math.max(brace.min[2]-part.max[2],part.min[2]-brace.max[2],0);
  if(gap>0&&(!closest||gap<closest.distanceMm))closest={distanceMm:gap,partId:part.id,obstacleId:data.bay.lowerBraceId,progress:Math.min(1,Math.max(0,((brace.min[0]+brace.max[0]-part.min[0]-part.max[0])/2)/travel))};
 }
 return closest;
}
function evaluatePlan(data:Scenario,caseId:string,start:number,event:boolean):Result {
 const {bay,windows,eventId}=effectiveWindows(caseId,start,event,data),ins=windows['INS-01'],mod=windows['SCA-02'],mech=windows['PMP-03'];
 const mechanical=data.workOrders.find(o=>o.id==='PMP-03')!,inspection=data.workOrders.find(o=>o.id==='INS-01')!;
 const stroke={start:mech.start+mechanical.strokeOffsetS!,duration:mechanical.strokeDurationS!,travelMm:data.bay.assemblyTravelMm[0]};
 const format=(t:number)=>clock(t,data.clock.shiftStartsAt),issues:Issue[]=[];
 if(inspection.requiresOriginalScaffold&&mod.start<ins.finish)issues.push({code:'INSPECTION_ACCESS',time:Math.max(mod.start,ins.start),jobs:['INS-01','SCA-02'],text:`Inspection needs the original platform until ${format(ins.finish)}. Scaffold changes begin ${format(mod.start)}.`});
 const scaffold=data.workOrders.find(o=>o.id==='SCA-02')!,shared=scaffold.sharesWorkZoneWith&&windows[scaffold.sharesWorkZoneWith];
 if(shared&&Math.max(mod.start,shared.start)<Math.min(mod.finish,shared.finish))issues.push({code:'SHARED_ZONE',time:Math.max(mod.start,shared.start),jobs:['SCA-02',scaffold.sharesWorkZoneWith!],text:'Scaffold and mechanical crews reserve the same work area.'});
 const obstacles=[...data.bay.fixedPartsMm.map(o=>({...o,from:-Infinity,until:Infinity})),{...bay.braceMm,id:data.bay.lowerBraceId,from:-Infinity,until:mod.finish},{...data.bay.braceAfterModificationMm,id:data.bay.lowerBraceId+'-parked',from:mod.finish,until:Infinity}];
 const collisions:Issue[]=[];
 for(const part of data.bay.movingPartsAtRestMm)for(const obstacle of obstacles){
  if(!forbiddenContact(part,obstacle,stroke.travelMm,data.bay.allowedContactPairs))continue;
  const [lo,hi]=contactInterval(part,obstacle,stroke.travelMm)!;
  const time=Math.max(stroke.start+lo*stroke.duration,obstacle.from);
  if(time>stroke.start+hi*stroke.duration||time>=obstacle.until)continue;
  const progress=(time-stroke.start)/stroke.duration;
  const point=[Math.max(obstacle.min[0],Math.min(obstacle.max[0],part.max[0]+stroke.travelMm*progress)),...[1,2].map(k=>(Math.max(part.min[k],obstacle.min[k])+Math.min(part.max[k],obstacle.max[k]))/2)];
  const scaffoldObstacle=obstacle.id.startsWith(data.bay.lowerBraceId);
  collisions.push({code:'PATH_BLOCKED',time,jobs:scaffoldObstacle?['PMP-03','SCA-02']:['PMP-03'],part:part.id,obstacle:obstacle.id,progress,point,text:`${part.label} contacts ${scaffoldObstacle?'the scaffold member':obstacle.id} at ${format(time)}.`});
 }
 collisions.sort((a,b)=>a.time-b.time||a.part!.localeCompare(b.part!));if(collisions[0])issues.push(collisions[0]);
 const lastFinish=Math.max(...Object.values(windows).map(w=>w.finish)),late=Object.entries(windows).filter(([,w])=>w.finish>data.clock.handoverS).map(([id])=>id);
 if(late.length)issues.push({code:'LATE_HANDOVER',time:data.clock.handoverS,jobs:late,text:`Last finish ${format(lastFinish)} exceeds handover ${format(data.clock.handoverS)}.`});
 issues.sort((a,b)=>a.time-b.time||a.code.localeCompare(b.code));
 return {caseId,event,eventId,fixtureVersion:data.scenarioVersion,start,feasible:issues.length===0,issues,lastFinish,deadline:data.clock.handoverS,windows,stroke,clearance:sweptClearance(data,bay.braceMm)};
}
export function evaluate(caseId:string,start:number,event=false){return evaluatePlan(scenario,caseId,start,event);}
export function alternatives(caseId:string,event=false){return scenario.clock.allowedModificationStartsS.map(t=>evaluate(caseId,t,event));}
export function createEvaluator(input:unknown){const data=loadScenario(input);return {evaluate:(caseId:string,start:number,event=false)=>evaluatePlan(data,caseId,start,event),alternatives:(caseId:string,event=false)=>data.clock.allowedModificationStartsS.map(t=>evaluatePlan(data,caseId,t,event))};}

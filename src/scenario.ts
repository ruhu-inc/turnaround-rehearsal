import authored from '../scenarios.json';
export type Scenario = typeof authored;
function require(condition:unknown,message:string):asserts condition {if(!condition)throw Error('Scenario input: '+message);}
function finite(n:unknown){return typeof n==='number'&&Number.isFinite(n);}
function vector(v:unknown,name:string){require(Array.isArray(v)&&v.length===3&&v.every(finite),name+' must contain three finite coordinates');}
function box(b:any,name:string){require(b&&typeof b==='object',name+' is missing');vector(b.min,name+'.min');vector(b.max,name+'.max');require(b.min.every((v:number,k:number)=>v<b.max[k]),name+' must have positive bounds');}
function unique(values:unknown[],name:string){require(values.every(v=>typeof v==='string'&&v.length>0),name+' IDs must be nonempty strings');require(new Set(values).size===values.length,'duplicate '+name+' ID');}
function freeze<T>(value:T):T {if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
/** Validate once at the boundary; the evaluator consumes an immutable scenario. */
export function loadScenario(input:unknown):Scenario {
 const f:any=structuredClone(input);
 require(f&&f.schemaVersion===4,'unsupported schema version; expected 4');
 require(typeof f.scenarioVersion==='string'&&f.scenarioVersion.length>0,'missing scenario version');
 require(f.clock&&/^\d\d:\d\d:\d\d$/.test(f.clock.shiftStartsAt),'invalid shift start');
 require(f.clock.shiftStartsAt.split(':').every((v:string,i:number)=>Number(v)<(i===0?24:60)),'invalid shift start');
 require(finite(f.clock.handoverS)&&f.clock.handoverS>0&&finite(f.clock.viewEndsS)&&f.clock.viewEndsS>=f.clock.handoverS,'invalid clock bounds');
 const slots=f.clock.allowedModificationStartsS;
 require(Array.isArray(slots)&&slots.length>0&&slots.every((s:unknown)=>finite(s)&&Number(s)>=0&&Number(s)<=f.clock.handoverS&&Number(s)%900===0),'scaffold starts must be in-range 15-minute slots');
 require(new Set(slots).size===slots.length&&slots.every((v:number,i:number)=>i===0||v>slots[i-1]),'scaffold starts must be unique and ordered');
 const b=f.bay;require(b,'missing bay');vector(b.sizeMm,'bay size');require(b.sizeMm.every((v:number)=>v>0),'bay dimensions must be positive');
 require(finite(b.tableScale)&&b.tableScale>0,'invalid tabletop scale');
 vector(b.assemblyTravelMm,'assembly travel');require(b.assemblyTravelMm[0]>0&&b.assemblyTravelMm[1]===0&&b.assemblyTravelMm[2]===0,'only positive-X straight withdrawal is supported');
 require(finite(b.assemblyAxisMm?.y)&&finite(b.assemblyAxisMm?.z)&&finite(b.casingExitPlaneXmm),'invalid assembly axis or exit plane');
 require(b.physicalContactCounts===true,'physical touching must count as contact');
 require(Array.isArray(b.movingPartsAtRestMm)&&b.movingPartsAtRestMm.length>0&&Array.isArray(b.fixedPartsMm),'missing clearance solids');
 unique([...b.movingPartsAtRestMm,...b.fixedPartsMm].map(p=>p.id),'geometry');
 for(const p of [...b.movingPartsAtRestMm,...b.fixedPartsMm])box(p,p.id);
 box(b.braceAfterModificationMm,'parked scaffold');box(b.originalInspectionDeckMm,'inspection deck');
 require(typeof b.lowerBraceId==='string'&&!b.fixedPartsMm.some((p:any)=>p.id===b.lowerBraceId),'invalid scaffold member ID');
 require(Array.isArray(b.allowedContactPairs),'missing contact allowances');
 const pairs=new Set<string>();
 for(const p of b.allowedContactPairs){
  require(p&&Object.keys(p).every(k=>['movingPartId','fixedPartId','contactOnly','atStrokeEndOnly'].includes(k)),'unknown contact restriction');
  require(p.contactOnly===true&&(p.atStrokeEndOnly===undefined||typeof p.atStrokeEndOnly==='boolean'),'malformed contact restriction');
  require(b.movingPartsAtRestMm.some((m:any)=>m.id===p.movingPartId)&&b.fixedPartsMm.some((m:any)=>m.id===p.fixedPartId),'contact allowance references a missing part');
  const key=p.movingPartId+'/'+p.fixedPartId;require(!pairs.has(key),'duplicate contact allowance');pairs.add(key);
 }
 require(Array.isArray(f.workOrders),'missing work orders');unique(f.workOrders.map((o:any)=>o.id),'work order');
 for(const id of ['INS-01','SCA-02','PMP-03'])require(f.workOrders.some((o:any)=>o.id===id),'missing required work order '+id);
 require(f.workOrders.length===3,'only the three authored work-order roles are supported');
 for(const o of f.workOrders){require(finite(o.durationS)&&o.durationS>0,'nonpositive or invalid duration for '+o.id);require(typeof o.label==='string'&&typeof o.startEditable==='boolean','invalid work order '+o.id);if(o.sharesWorkZoneWith)require(f.workOrders.some((p:any)=>p.id===o.sharesWorkZoneWith),'missing shared-zone work order');}
 const mechanical=f.workOrders.find((o:any)=>o.id==='PMP-03');require(finite(mechanical.strokeOffsetS)&&mechanical.strokeOffsetS>=0&&finite(mechanical.strokeDurationS)&&mechanical.strokeDurationS>0&&mechanical.strokeOffsetS+mechanical.strokeDurationS<=mechanical.durationS,'withdrawal stroke must fit inside mechanical booking');
 require(Array.isArray(f.cases)&&f.cases.length>0,'missing cases');unique(f.cases.map((c:any)=>c.id),'case');
 for(const c of f.cases){require(['bay-a','bay-b'].includes(c.id),'unsupported case '+c.id);box(c.braceMm,c.id+' scaffold');require(c.startSById,'missing work starts');for(const o of f.workOrders)require(finite(c.startSById[o.id])&&c.startSById[o.id]>=0&&c.startSById[o.id]<=f.clock.viewEndsS,'missing or out-of-range start for '+o.id);require(slots.includes(c.startSById['SCA-02']),'received scaffold start is off-grid');}
 require(Array.isArray(f.events),'missing events array');unique(f.events.map((e:any)=>e.id),'event');
 for(const e of f.events)require(f.cases.some((c:any)=>c.id===e.caseId)&&f.workOrders.some((o:any)=>o.id===e.workOrderId)&&finite(e.setDurationS)&&e.setDurationS>0,'invalid event target or duration');
 return freeze(f as Scenario);
}
export const scenario=loadScenario(authored);

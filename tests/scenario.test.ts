import {test} from 'node:test';import assert from 'node:assert/strict';import {scenario,loadScenario} from '../src/scenario';import {createEvaluator,clock} from '../src/evaluator';
const clone=()=>structuredClone(scenario);
test('scenario loading rejects malformed geometry, schedules and unsupported contact restrictions',()=>{
 const changes:((s:ReturnType<typeof clone>)=>void)[]=[s=>{s.schemaVersion=3;},s=>{s.workOrders.push(structuredClone(s.workOrders[0]));},s=>{s.workOrders[0].durationS=0;},s=>{s.bay.movingPartsAtRestMm[0].min[0]=NaN;},s=>{s.bay.fixedPartsMm[0].max[0]=s.bay.fixedPartsMm[0].min[0];},s=>{s.clock.allowedModificationStartsS[0]=1;},s=>{s.cases[0].startSById['PMP-03']=undefined as unknown as number;},s=>{(s.bay.allowedContactPairs[0] as unknown as Record<string,unknown>).ignoreAllCollisions=true;},s=>{s.bay.allowedContactPairs[0].fixedPartId='missing';}];
 for(const change of changes){const input=clone();change(input);assert.throws(()=>loadScenario(input),/Scenario input/);}
});
test('loader returns an immutable copy without freezing caller data',()=>{const input=clone(),loaded=loadScenario(input);input.workOrders[0].durationS=1;assert.equal(loaded.workOrders[0].durationS,1800);assert.throws(()=>{loaded.workOrders[0].durationS=2;});});
test('durations, event updates, stroke timing and bay geometry drive verdicts',()=>{
 const longer=clone();longer.workOrders.find(o=>o.id==='SCA-02')!.durationS=1800;assert.equal(createEvaluator(longer).alternatives('bay-a').filter(r=>r.feasible).length,0);
 const overrun=clone();overrun.events[0].setDurationS=3600;assert.equal(createEvaluator(overrun).evaluate('bay-a',2700,true).windows['INS-01'].finish,4500);
 const timing=clone();timing.workOrders.find(o=>o.id==='PMP-03')!.strokeOffsetS=0;assert.equal(createEvaluator(timing).evaluate('bay-a',5400).issues[0].time,3645);
 const clear=clone();clear.cases[0].braceMm=structuredClone(clear.cases[1].braceMm);assert.equal(createEvaluator(clear).evaluate('bay-a',5400).feasible,true);
});
test('scaffold state is updated before an equal-timestamp contact',()=>{const data=clone();data.workOrders.find(o=>o.id==='SCA-02')!.durationS=645;assert.deepEqual(createEvaluator(data).evaluate('bay-a',3600).issues.map(i=>i.code),['SHARED_ZONE']);data.workOrders.find(o=>o.id==='SCA-02')!.durationS=645.1;assert.deepEqual(createEvaluator(data).evaluate('bay-a',3600).issues.map(i=>i.code),['SHARED_ZONE','PATH_BLOCKED']);});
test('continuous sweeps find a thin fixed obstacle before the scaffold',()=>{const data=clone();data.bay.fixedPartsMm.push({id:'thin-obstacle',group:'test',min:[2761,950,1995],max:[2762,1050,2005]});const hit=createEvaluator(data).evaluate('bay-a',2700).issues.find(i=>i.code==='PATH_BLOCKED')!;assert.equal(hit.part,'shaft');assert.ok(Math.abs(hit.time-4226.1)<1e-7);});
test('parking the brace in the removal route is also evaluated',()=>{const data=clone();data.bay.braceAfterModificationMm=structuredClone(data.cases[0].braceMm);const hit=createEvaluator(data).evaluate('bay-a',2700).issues.find(i=>i.code==='PATH_BLOCKED')!;assert.equal(hit.obstacle,'lower-brace-parked');assert.equal(hit.time,4245);});
test('clock formatting uses the configured shift origin',()=>{assert.equal(clock(4245),'10:10:45');assert.equal(clock(4245,'07:00:00'),'08:10:45');});

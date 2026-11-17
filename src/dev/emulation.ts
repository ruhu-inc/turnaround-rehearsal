import {XRDevice,metaQuest3} from 'iwer';
import * as T from 'three';
import type {World} from '@iwsdk/core';import type {Session} from '../session';
import type {FrameMetrics} from '../performance';
import {panelLocalPoint} from '../task-ui';
import {navigationPath} from '../xr-navigation';
import {installRehearsal} from './rehearsal';
import type {PanelButton} from '../xr-input';
export function installEmulation(config:{stereoEnabled?:boolean}={}){
 const device=new XRDevice(metaQuest3,{stereoEnabled:config.stereoEnabled??false});device.position.set(0,1.25,0);device.primaryInputMode='hand';device.installRuntime({forceInstall:true});
 return {device,attachHarness(options:{world:World;session:Session;panel:T.Mesh;visibleButtons:()=>PanelButton[];model:T.Group;events:unknown[];metrics:FrameMetrics;soundEnabled:()=>boolean;buttonPage:(label:string)=>number;ready:()=>boolean;briefingVisible:()=>boolean}){
  const {world,session,panel}=options;
  const box=document.createElement('section');box.className='emulator-tools';box.innerHTML='<b>IMMERSIVE WEB EMULATOR · QUEST 3 · HANDS</b><button id="xr-smoke">RUN HANDS-ONLY SMOKE TEST</button><pre id="xr-report">Test uses temporary case records. Physical headset behavior remains unverified.</pre>';document.body.append(box);
  const output=box.querySelector('pre')!,button=box.querySelector('button')!;const benchmark=document.createElement('button');benchmark.id='xr-performance';benchmark.textContent='RUN FIVE-MINUTE STEREO PROFILE';benchmark.hidden=!config.stereoEnabled;box.insertBefore(benchmark,output);
  const steps:{hand:string;check:string;passed:boolean}[]=[];
  function log(text:string){output.textContent=text;console.info('[XR smoke]',text);}
  const frames=(n=2)=>new Promise<void>(resolve=>{let count=0;const stop=world.onXRFrame(()=>{if(++count>=n){stop();resolve();}});});
  const wait=async(test:()=>boolean,message:string,timeout=10000)=>{const started=performance.now();while(!test()){if(performance.now()-started>timeout)throw Error(message);await new Promise<void>(r=>requestAnimationFrame(()=>r()));}};
  const assert=(test:boolean,hand:string,check:string)=>{steps.push({hand,check,passed:test});if(!test)throw Error(hand+': '+check);log(hand+' / '+check);};
  async function pinch(hand:'left'|'right',point:T.Vector3,near:boolean){
   const id='hand-'+hand;
   await device.remote.dispatch('set_select_value',{device:id,value:0});
   // Approach spatial controls from the side and below, keeping the wrist end
   // turned away from the spectator camera. Native joints/selection stay intact.
   const offset=Math.abs(panel.position.x)<.1?new T.Vector3(hand==='right'?.32:-.32,-.14,.35):new T.Vector3(0,0,.35);
   const position=near?point:point.clone().add(offset);
   await device.remote.dispatch('set_transform',{device:id,anchor:near?'grasp':'target-ray',position:{x:position.x,y:position.y,z:position.z},orientation:near?'auto':{x:0,y:0,z:0,w:1}});
   if(!near)await device.remote.dispatch('look_at',{device:id,target:{x:point.x,y:point.y,z:point.z}});
   await device.remote.dispatch('set_select_value',{device:id,value:1,duration:.15});
   await device.remote.dispatch('set_select_value',{device:id,value:0,duration:.15});
   await frames();
  }
  async function tap(hand:'left'|'right',label:string,near=false){
   await wait(options.ready,'View transition did not complete');
   for(let page=0;page<16;page++){
    await wait(options.ready,'Navigation view transition did not finish');
    let rows=options.visibleButtons(),index=rows.findIndex(r=>r.enabled&&r.label.startsWith(label));
    if(index>=0){const rect=rows[index].rect!,x=rect.x+rect.width/2,y=rect.y+rect.height/2,point=panel.localToWorld(new T.Vector3().copy(panelLocalPoint(x,y,panel.userData.canvasHeight??1792)));await pinch(hand,point,near);return;}
    const desired=options.buttonPage(label),current=Number(rows.find(r=>r.label.startsWith('PREVIOUS /'))?.label.match(/(\d+) OF/)?.[1]??1)-1;
    const route=['09:45 ACCESS FAILURE','10:30 BLOCKED PULL','ORIGINAL EVIDENCE','ACCEPTED PULL','FULL HANDOFF DETAILS','DECISION SUMMARY'].some(s=>label.startsWith(s))?['READ HANDOFF']:navigationPath(label);
    let nav=desired>=0?rows.findIndex(r=>r.label.startsWith(desired<current?'PREVIOUS':'NEXT')&&r.enabled):-1;
    if(nav<0)nav=rows.findIndex(r=>r.enabled&&r.label==='RETURN TO PLANNING');
    if(nav<0)nav=rows.findIndex(r=>r.enabled&&route.includes(r.label));
    if(nav<0)nav=rows.findIndex(r=>r.enabled&&['RETURN TO REHEARSAL','BACK TO TOOLS'].includes(r.label));
    if(nav<0)throw Error('Cannot find enabled XR control: '+label);
    const rect=rows[nav].rect!,x=rect.x+rect.width/2,y=rect.y+rect.height/2;await pinch(hand,panel.localToWorld(new T.Vector3().copy(panelLocalPoint(x,y,panel.userData.canvasHeight??1792))),near);
   }
   throw Error('XR paging could not reach: '+label);
  }
  if(new URLSearchParams(location.search).has('plant-review')){box.remove();void import('./plant-review').then(({installPlantReview})=>installPlantReview({...options,device,tap,frames,wait}));return;}
  if(new URLSearchParams(location.search).has('record')){box.remove();void import('./recording').then(({installRecording})=>installRecording({...options,device,tap,frames,wait}));return;}
  if(new URLSearchParams(location.search).has('rehearsal'))installRehearsal({...options,device,tap,frames,wait});
  benchmark.onclick=()=>{
   benchmark.disabled=button.disabled=true;world.launchXR();
   void(async()=>{try{
    await wait(()=>world.renderer.xr.isPresenting,'XR session did not start');await device.remote.dispatch('set_input_mode',{mode:'hand'});await device.remote.dispatch('set_connected',{device:'hand-left',connected:false});await device.remote.dispatch('set_connected',{device:'hand-right',connected:true});
    await tap('right','OPEN PLANNING TABLE');await tap('right','EAST BAY');await tap('right','RESET CASE');await tap('right','RESET CASE / DISCARD WORK');await tap('right','SCA-02 09:45');await tap('right','CHECK PLAN');await tap('right','USE THIS PLAN');await wait(options.ready,'Initial fade');await frames(60);
    await tap('right','SOUND OFF');await wait(options.soundEnabled,'Audio did not enable');
    options.metrics.start('IWER 2.8.0 / Quest 3 stereo / CPU rendered-frame cadence');
    let cycles=0;const views:string[]=[];
    while(options.metrics.summary().durationSeconds<300){
     await tap('right',cycles%2===0?'EAST BAY':'WEST BAY');if(session.locked){await tap('right','PREDICT: CLEAR');await tap('right','CHECK PLAN');await tap('right','RETAIN ORIGINAL SCHEDULE');}views.push(session.caseId+':table');
     await tap('right','PLANT OVERVIEW');await frames(60);views.push('plant:overview');await tap('right','EYE-LEVEL APPROACH');await frames(90);views.push('plant:entrance');await tap('right','STEP INTO UNIT');await frames(90);views.push('plant:aisle');await tap('right','ENTER PUMP BAY');await frames(90);views.push('plant:pump');await tap('right','OPEN PLANNING TABLE');
     await tap('right','PLAY PULL');await wait(()=>session.progress===1,'Withdrawal stalled',20000);await tap('right',session.view==='table'?'INSPECT AT FULL SIZE':'RETURN TO TABLE');await wait(options.ready,'View fade stalled');await frames(90);views.push(session.caseId+':'+session.view);if(session.caseId==='bay-a'){await tap('right','ORIGINAL EVIDENCE');await frames(90);views.push('bay-a:original-contact');await tap('right','RETURN TO REVIEW');}cycles++;log('Stereo profile '+Math.floor(options.metrics.summary().durationSeconds)+' / 300 seconds · '+cycles+' withdrawals');
    }
    const measurement=options.metrics.stop(),report={status:measurement.completeFiveMinutes?'recorded':'failed',runtime:'IWER 2.8.0 / Quest 3',physicalHeadset:false,stereo:true,audioEnabled:options.soundEnabled(),measurement,cycles,views:[...new Set(views)],consoleErrors:'Inspect browser console alongside this report; this payload does not collect console logs.'};log(JSON.stringify(report,null,2));await fetch('/__xr-performance-result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(report)});
   }catch(error){options.metrics.interrupt(String(error));const report={status:'failed',error:String(error),measurement:options.metrics.stop()};log(JSON.stringify(report,null,2));await fetch('/__xr-performance-result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(report)}).catch(()=>{});}})();
  };
  button.onclick=()=>{
   button.disabled=true;world.launchXR();
   void(async()=>{
    try{
     await wait(()=>world.renderer.xr.isPresenting,'XR session did not start');
     await device.remote.dispatch('set_input_mode',{mode:'hand'});
     for(const hand of ['right','left'] as const){
      await device.remote.dispatch('set_connected',{device:'hand-'+(hand==='right'?'left':'right'),connected:false});
      await device.remote.dispatch('set_connected',{device:'hand-'+hand,connected:true});
      await tap(hand,'PLANT OVERVIEW');await tap(hand,'EYE-LEVEL APPROACH');await wait(options.ready,'Entrance fade');assert(options.model.scale.x===1&&Math.abs(options.model.position.y+.4)<.001,hand,'eye-level entrance preserves 1:1 scale and seated origin');await tap(hand,'STEP INTO UNIT');await tap(hand,'ENTER PUMP BAY');await wait(options.ready,'Pump approach fade');assert(options.model.userData.tourLookAt?.[2]<0,hand,'three approach stations face the pump');await tap(hand,'OPEN PLANNING TABLE');assert(session.view==='table'&&session.state.start===session.state.originalStart,hand,'approach returns without changing the received plan');assert(options.visibleButtons().some(b=>b.label==='CHECK PLAN')&&options.visibleButtons().filter(b=>b.label.startsWith('SCA-02 ')).length===8&&!options.visibleButtons().some(b=>b.label.startsWith('NEXT /')&&b.enabled),hand,'core pull, check and all eight starts share one page');
      await tap(hand,'EAST BAY');await tap(hand,'RESET CASE');await tap(hand,'RESET CASE / DISCARD WORK');
      if(session.needsResume)await tap(hand,'RESUME');
      await wait(options.ready,'Table view did not finish fading');
      await tap(hand,'SOUND OFF');await wait(options.soundEnabled,'Optional audio did not enable');assert(options.soundEnabled(),hand,'optional audio enables through spatial control');await tap(hand,'SOUND ON');await wait(()=>!options.soundEnabled(),'Sound did not mute');assert(!options.soundEnabled(),hand,'silent mode restores');
      const handVisual=world.input.xr.visualAdapters.hand[hand].visual;const skins:T.SkinnedMesh[]=[];handVisual?.model.traverse(object=>{if(object instanceof T.SkinnedMesh)skins.push(object);});assert(handVisual?.model.name==='tracked-shaded-hand'&&skins.length===1&&skins.every(mesh=>mesh.material instanceof T.MeshStandardMaterial&&mesh.material.depthTest&&mesh.material.depthWrite&&!mesh.material.transparent),hand,'one opaque shaded tracked skin uses normal depth occlusion without an outline pass');
      await tap(hand,'GUIDE OFF');await wait(()=>document.querySelector<HTMLElement>('#voice-caption')?.dataset.voiceStatus==='speaking','OpenAI live speech did not reach playback',20000);assert(document.querySelector<HTMLElement>('#voice-caption')?.dataset.voiceSource==='OpenAI live speech',hand,'live OpenAI speech plays through a tracked-hand control');await tap(hand,'GUIDE ON');assert(document.querySelector<HTMLElement>('#voice-caption')?.hidden===true,hand,'tracked-hand mute cancels speech and hides the caption');
      await tap(hand,'EARLIER SCA-02');await tap(hand,'LATER SCA-02');assert(session.state.start===5400,hand,'time steppers restore the received slot');await tap(hand,'TRY THE PULL');assert(panel.userData.compact===true&&(panel.userData.canvasHeight*.5/1024)<.31&&options.visibleButtons().some(b=>b.label==='RETURN TO PLANNING'),hand,'compact task card preserves full-sized targets and a visible planning return');
      const bracePoint=options.model.localToWorld(new T.Vector3(2.84,1.1,2.08));await pinch(hand,bracePoint,false);assert(session.selectedWorkOrder==='SCA-02'&&session.selectedEquipment==='lower-brace',hand,'ray-selected scaffold links its work order');await tap(hand,'RETURN TO REHEARSAL');await tap(hand,'SELECT PMP-03');assert(session.selectedEquipment==='withdrawal-assembly',hand,'work order selects the withdrawal assembly');await tap(hand,'RETURN TO REHEARSAL');
      const handle=options.model.getObjectByName('pinch-handle')!;
      const point=handle.getWorldPosition(new T.Vector3());
      await device.remote.dispatch('set_transform',{device:'hand-'+hand,anchor:'grasp',position:{x:point.x,y:point.y,z:point.z},orientation:'auto'});
      await wait(()=>handle.userData.gripState==='ready','Ready grip feedback did not settle',2000);await frames(3);assert(handle.userData.gripState==='ready'&&document.querySelector<HTMLElement>('#task-coach')?.dataset.stage==='pinch',hand,'ready highlight and contextual pinch cue appear at the handle ('+handle.userData.gripState+'/'+document.querySelector<HTMLElement>('#task-coach')?.dataset.stage+'/'+session.needsResume+')');
      await device.remote.dispatch('set_select_value',{device:'hand-'+hand,value:1,duration:.15});
      await frames(3);assert(options.model.getObjectByName('pinch-handle')?.userData.gripState==='held',hand,'handle feedback confirms an owned pinch before the pull');assert(document.querySelector<HTMLElement>('#task-coach')?.dataset.stage==='held',hand,'contextual cue confirms the owned pinch');
      const end=point.clone().add(new T.Vector3(.10,0,0).applyQuaternion(options.model.getWorldQuaternion(new T.Quaternion())));
      await device.remote.dispatch('animate_to',{device:'hand-'+hand,anchor:'grasp',position:{x:end.x,y:end.y,z:end.z},duration:.6});
      await device.remote.dispatch('set_select_value',{device:'hand-'+hand,value:0,duration:.15});
      await frames(3);assert(options.model.getObjectByName('pinch-handle')?.userData.gripState!=='held',hand,'opening the pinch clears held feedback');assert(handle.userData.gripState==='released'&&document.querySelector<HTMLElement>('#task-coach')?.dataset.stage==='contact',hand,'release feedback and obstruction coaching retain the physical stop');
      assert(Math.abs(session.progress-.375)<.001,hand,'manual grab stops at bearing contact');await tap(hand,'READ CONTACT EVIDENCE');assert(String(panel.userData.clockLabel).includes('READ-ONLY EVIDENCE')&&!String(panel.userData.clockLabel).includes('600x'),hand,'static evidence clock identifies a read-only snapshot instead of a replay speed');const originalContact=session.evidence?.snapshot.label==='Original plan'&&session.evidence.snapshot.start===5400&&!options.model.getObjectByName('contact-callout-label')?.visible;await tap(hand,'RETURN TO REVIEW');assert(originalContact&&Math.abs(session.progress-.375)<.001,hand,'contact reference is read-only and restores the original pull');
      await wait(options.ready,'Evidence return fade did not finish');const partialStart=session.progress,graspPoint=handle.getWorldPosition(new T.Vector3());
      await device.remote.dispatch('set_transform',{device:'hand-'+hand,anchor:'grasp',position:{x:graspPoint.x,y:graspPoint.y,z:graspPoint.z},orientation:'auto'});
      await device.remote.dispatch('set_select_value',{device:'hand-'+hand,value:1,duration:.15});
      await device.remote.dispatch('animate_to',{device:'hand-'+hand,anchor:'grasp',position:{x:graspPoint.x-.025,y:graspPoint.y,z:graspPoint.z},duration:.3});
      await device.remote.dispatch('set_connected',{device:'hand-'+hand,connected:false});await frames();
      assert(session.needsResume&&Math.abs(session.progress-partialStart)<.001,hand,'tracking loss discards uncommitted drag');
      await device.remote.dispatch('set_connected',{device:'hand-'+hand,connected:true});await device.remote.dispatch('set_select_value',{device:'hand-'+hand,value:0,duration:.15});await tap(hand,'RESUME');
      assert(!session.needsResume,hand,'explicit resume after tracking recovery');

      await tap(hand,'RETURN TO PLANNING',true);assert(!panel.userData.compact&&options.visibleButtons().filter(b=>b.label.startsWith('SCA-02 ')).length===8,hand,'near pinch returns from compact card to all eight planning times');await tap(hand,'SCA-02 09:00',true);await tap(hand,'CHECK PLAN',true);
      assert(session.checked?.issues[0]?.code==='INSPECTION_ACCESS',hand,'near pinch exposes lost inspection access');
      await tap(hand,'SCA-02 09:45');await tap(hand,'CHECK PLAN');await tap(hand,'USE THIS PLAN');
      assert(session.handoffVisible&&session.state.accepted===2700,hand,'repair handoff');
      await tap(hand,'READ HANDOFF');assert(options.briefingVisible(),hand,'decision summary opens in headset');await tap(hand,'FULL HANDOFF DETAILS');assert(options.visibleButtons().some(b=>b.label==='DECISION SUMMARY'),hand,'full handoff details remain reachable');await tap(hand,'DECISION SUMMARY');assert(session.state.accepted===2700&&options.visibleButtons().some(b=>b.label==='FULL HANDOFF DETAILS'),hand,'summary return preserves accepted repair');await tap(hand,'RETURN TO REHEARSAL');
      await tap(hand,'PLAY PULL');await frames(8);device.updateVisibilityState('hidden');await wait(()=>session.needsResume,'Hidden XR session did not suspend');const pausedProgress=session.progress;await new Promise(resolve=>setTimeout(resolve,150));device.updateVisibilityState('visible');await frames(4);assert(session.needsResume&&!session.playing&&session.progress===pausedProgress,hand,'hidden XR session remains paused on return');await tap(hand,'RESUME');await tap(hand,'PLAY PULL');await wait(()=>session.progress===1,'Repaired withdrawal did not finish');assert(session.progress===1,hand,'full supported withdrawal');
      await tap(hand,'ORIGINAL EVIDENCE');assert(session.evidence?.snapshot.start===5400,hand,'original evidence uses original schedule');await tap(hand,'RETURN TO REVIEW');assert(session.handoffVisible&&session.progress===1,hand,'return restores repair revision and cursor');
      await tap(hand,'WEST BAY');await tap(hand,'RESET CASE');await tap(hand,'RESET CASE / DISCARD WORK');assert(session.locked,hand,'West requires first prediction');await tap(hand,'PREDICT: CLEAR');await tap(hand,'CHECK PLAN');await tap(hand,'RETAIN ORIGINAL SCHEDULE');assert(session.handoffVisible&&session.state.accepted===5400,hand,'retain original schedule');
      await tap(hand,'INSPECTION UPDATE');await tap(hand,'RESET CASE');await tap(hand,'RESET CASE / DISCARD WORK');await tap(hand,'CHECK PLAN');await tap(hand,'COMPARE ALL EIGHT STARTS');assert(options.visibleButtons().filter(b=>b.label.startsWith('EVIDENCE ')).length===8&&!session.state.hold,hand,'all eight rejected starts are inspectable before Hold');await tap(hand,'EVIDENCE 09:45');assert(!!session.evidence?.snapshot.event&&session.view==='inspection',hand,'pre-Hold access evidence preserves the overrun');await tap(hand,'RETURN TO REVIEW');assert(options.visibleButtons().some(b=>b.label==='EVIDENCE 10:30'),hand,'evidence restores the comparison screen');await tap(hand,'EVIDENCE 10:30');assert(!!session.evidence?.snapshot.event&&session.effective.start===5400&&!session.state.hold,hand,'pre-Hold blocked evidence cannot confirm a decision');await tap(hand,'RETURN TO REVIEW');await tap(hand,'RETURN TO PLAN');await tap(hand,'CONFIRM HOLD');assert(session.handoffVisible&&session.state.hold,hand,'exhaustive check permits confirmed Hold');await tap(hand,'09:45 ACCESS FAILURE');assert(session.shiftSecond===2700&&session.view==='inspection'&&session.progress===0,hand,'access evidence seeks inspection time');await tap(hand,'RETURN TO REVIEW');await tap(hand,'10:30 BLOCKED PULL');assert(session.evidence?.snapshot.event===true&&session.effective.start===5400,hand,'rejected evidence retains overrun');await tap(hand,'RETURN TO REVIEW');assert(session.handoffVisible&&session.state.hold,hand,'evidence return preserves Hold');
     }
     const report={status:'passed',runtime:'IWER 2.8.0 / Quest 3',physicalHeadset:false,steps};log(JSON.stringify(report,null,2));await fetch('/__xr-test-result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(report)});
    }catch(error){const report={status:'failed',runtime:'IWER 2.8.0 / Quest 3',physicalHeadset:false,error:String(error),steps,events:options.events};log(JSON.stringify(report,null,2));await fetch('/__xr-test-result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(report)}).catch(()=>{});}
   })();
  };
 }};
}

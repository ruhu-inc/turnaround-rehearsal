import * as T from 'three';
import type {World} from '@iwsdk/core';
import type {Session} from './session';
import {panelUV,PANEL_METRES_PER_PIXEL} from './task-ui';
import {RehearsalHandVisual} from './hand-visual';
import {PointerCapture,type Hand,type InteractionTarget} from './pointer-capture';
export type PanelButton={rect?:{x:number;y:number;width:number;height:number};id:string;label:string;enabled:boolean;run:()=>void};
export function installHandInput(options:{world:World;session:Session;model:T.Group;panel:T.Mesh;buttonAt:(u:number,v:number)=>PanelButton|null;equipmentAt?:(ray:T.Raycaster)=>{target:InteractionTarget;point:T.Vector3}|null;render:()=>void;updatePose:()=>void;canGrab:()=>boolean;hover:(id:string|null)=>void;trace?:boolean}){
 const {world,session,model,panel}=options,capture=new PointerCapture();
 const raycaster=new T.Raycaster(),matrix=new T.Matrix4();
 const events:unknown[]=[];
 const tracked:{left:boolean;right:boolean}={left:false,right:false};
 const active:{left:boolean;right:boolean}={left:false,right:false};
 const lastPressedTarget:Record<Hand,{id:string|null;near:boolean}>={left:{id:null,near:false},right:{id:null,near:false}};
 const rays=new Map<Hand,T.Line>(),dots=new Map<Hand,T.Mesh>();
 // Keep SDK skinning and tracking; replace only the hand's presentation.
 for(const hand of ['left','right'] as const)world.input.xr.visualAdapters.hand[hand].updateVisualImplementation(RehearsalHandVisual);
 const handle=model.getObjectByName('pinch-handle') as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;
 const handleMaterial=handle.material.clone(),handleColor=handle.material.color.clone();handle.material=handleMaterial;
 let releasedUntil=0;
 function gripFeedback(hovered:boolean){const held=capture.kind==='grab',released=!held&&performance.now()<releasedUntil;handleMaterial.color.copy(handleColor);if(held)handleMaterial.color.set(0x94edce);else if(released)handleMaterial.color.set(0xc5d5dc);handleMaterial.emissive.set(held?0x167e63:hovered?0x9c650e:0x000000);handleMaterial.emissiveIntensity=held?.7:hovered?.4:0;handle.userData.gripState=held?'held':released?'released':hovered?'ready':'idle';}
 for(const hand of ['left','right'] as const){
  const ray=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-1)]),new T.LineBasicMaterial({color:0xe5c56e,transparent:true,opacity:.6}));ray.visible=false;world.scene.add(ray);rays.set(hand,ray);
  const dot=new T.Mesh(new T.SphereGeometry(.004,8,6),new T.MeshBasicMaterial({color:0xf7d477,depthTest:false}));dot.visible=false;dot.renderOrder=2000;world.scene.add(dot);dots.set(hand,dot);
 }
 function cancel(){releasedUntil=0;capture.cancel();gripFeedback(false);session.suspend();options.render();}
 world.renderer.xr.addEventListener('sessionend',()=>{releasedUntil=0;capture.cancel();gripFeedback(false);for(const v of rays.values())v.visible=false;for(const v of dots.values())v.visible=false;});
 world.visibilityState.subscribe(state=>{if(state==='hidden'||state==='visible-blurred')cancel();});
 world.onXRFrame(frame=>{
  const ref=world.xrReferenceSpace;if(!ref)return;
  let hovered:string|null=null,handleReady=false;
  for(const hand of ['left','right'] as const){
   const source=world.input.xr.getPrimaryInputSource(hand),ray=rays.get(hand)!,dot=dots.get(hand)!;
   const pose=source?.hand?frame.getPose(source.targetRaySpace,ref):null;
   const thumb=source?.hand?.get('thumb-tip'),index=source?.hand?.get('index-finger-tip');
   const thumbPose=thumb?frame.getJointPose?.(thumb,ref):null,indexPose=index?frame.getJointPose?.(index,ref):null;
   if(!source?.hand||!pose||!thumbPose||!indexPose){
    ray.visible=dot.visible=false;
    if(tracked[hand]){releasedUntil=0;capture.cancel(hand);if(session.playing)session.suspend();options.render();}
    tracked[hand]=active[hand]=false;lastPressedTarget[hand]={id:null,near:false};continue;
   }
   tracked[hand]=true;
   matrix.fromArray(pose.transform.matrix).premultiply(world.player.matrixWorld);
   const origin=new T.Vector3().setFromMatrixPosition(matrix),direction=new T.Vector3(0,0,-1).transformDirection(matrix);
   const grasp=new T.Vector3(thumbPose.transform.position.x+indexPose.transform.position.x,thumbPose.transform.position.y+indexPose.transform.position.y,thumbPose.transform.position.z+indexPose.transform.position.z).multiplyScalar(.5).applyMatrix4(world.player.matrixWorld);
   ray.visible=true;ray.position.copy(origin);ray.quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),direction);
   raycaster.set(origin,direction);
   let target:InteractionTarget|null=null;
   const local=panel.worldToLocal(grasp.clone());
   const canvasHeight=panel.userData.canvasHeight??1792;const near=Math.abs(local.z)<.045&&Math.abs(local.x)<.25&&Math.abs(local.y)<canvasHeight*PANEL_METRES_PER_PIXEL/2;const nearUV=panelUV(local.x,local.y,canvasHeight);
   const hit=near?null:raycaster.intersectObject(panel)[0];
   const button=near?options.buttonAt(nearUV.u,nearUV.v):hit?.uv?options.buttonAt(hit.uv.x,hit.uv.y):null;
   if(button){target={id:button.id,kind:'button',enabled:button.enabled,commit:button.run,cancel:()=>{}};if(button.enabled)hovered=button.id;}
   const equipment=!near&&!hit&&!button?options.equipmentAt?.(raycaster):null;
   if(equipment){target=equipment.target;hovered=target.id;}
   const handle=model.getObjectByName('pinch-handle');
   const handlePosition=handle?.getWorldPosition(new T.Vector3());
   // An open hand has a wider fingertip midpoint than the closed pinch.
   // Anticipatory feedback does not enlarge the actual capture radius.
   if(!near&&options.canGrab()&&handlePosition&&handlePosition.distanceTo(grasp)<.11)handleReady=true;
   if(!near&&options.canGrab()&&handlePosition&&handlePosition.distanceTo(grasp)<.055){
    const initialProgress=session.progress,initialX=model.worldToLocal(grasp.clone()).x;
    target={id:'assembly-handle',kind:'grab',enabled:true,
     begin:()=>{session.playing=false;},
     move:p=>{const x=model.worldToLocal(new T.Vector3(p.x,p.y,p.z)).x;session.seek(initialProgress+(x-initialX)/1.2);options.updatePose();},
     commit:()=>options.render(),
     cancel:()=>{session.seek(initialProgress);session.suspend();options.render();}};
    hovered='assembly-handle';
   }
   dot.visible=!!target?.enabled;
   if(near)dot.position.copy(grasp);else if(target?.kind==='grab'&&handlePosition)dot.position.copy(handlePosition);else if(hit)dot.position.copy(hit.point);else if(equipment)dot.position.copy(equipment.point);
   const select=world.input.xr.getSelectState(hand);
   const down=select.start||select.active&&!active[hand],up=select.end||!select.active&&active[hand];
   if(options.trace&&(down||up)){events.push({hand,edge:down?'down':'up',target:target?.id,near,grasp:grasp.toArray(),local:local.toArray(),active:select.active,owner:capture.owner});if(events.length>100)events.shift();}
   if(down)capture.begin(hand,target,grasp);
   if(select.active){lastPressedTarget[hand]={id:target?.id??null,near};capture.move(hand,grasp);}
   // Opening the fingers moves their midpoint even when the hand stays put.
   // Near buttons release at the last pinched position; moving away while held still cancels.
   if(up){if(capture.kind==='grab'&&capture.owner===hand)releasedUntil=performance.now()+700;capture.release(hand,lastPressedTarget[hand].near?lastPressedTarget[hand].id:target?.id??null);lastPressedTarget[hand]={id:null,near:false};}
   if(target?.kind==='grab'||capture.kind==='grab'&&capture.owner===hand)ray.visible=dot.visible=false;
   active[hand]=select.active;
  }
  gripFeedback(handleReady);
  options.hover(hovered);
 });
 return {capture,cancel,events};
}

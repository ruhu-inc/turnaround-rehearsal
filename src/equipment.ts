import * as T from 'three';
import {scenario,clock,type Result} from './evaluator';
export type WorkOrderId='INS-01'|'SCA-02'|'PMP-03';
export type EquipmentHit={equipmentId:string;workOrderId:WorkOrderId;object:T.Object3D;point:T.Vector3};
export function equipmentOwner(object:T.Object3D):{equipmentId:string;workOrderId:WorkOrderId;object:T.Object3D}|null {
 let node:T.Object3D|null=object;
 while(node){if(node.userData.equipmentId&&['INS-01','SCA-02','PMP-03'].includes(node.userData.workOrderId))return {equipmentId:node.userData.equipmentId,workOrderId:node.userData.workOrderId,object:node};node=node.parent;}return null;
}
function visible(object:T.Object3D){let p:T.Object3D|null=object;while(p){if(!p.visible||p.userData.assistance)return false;p=p.parent;}return true;}
export function pickEquipment(ray:T.Raycaster,model:T.Object3D):EquipmentHit|null {
 const hit=ray.intersectObject(model,true).find(h=>visible(h.object));if(!hit)return null;
 const owner=equipmentOwner(hit.object);return owner?{...owner,point:hit.point}:null;
}
export function equipmentDescription(job:WorkOrderId,result:Result){
 const span=(id:string)=>clock(result.windows[id].start).slice(0,5)+'–'+clock(result.windows[id].finish).slice(0,5);
 const relevant=result.issues.filter(i=>i.jobs.includes(job));
 const text=job==='INS-01'?`INS-01 runs ${span('INS-01')} and needs the original raised platform for the entire inspection.`:job==='SCA-02'?`SCA-02 runs ${span('SCA-02')}. Reconfiguration moves the lower member out of the withdrawal route and stows the original inspection platform.`:`PMP-03 reserves the bay ${span('PMP-03')}. The supported impeller, shaft, backplate and bearing housing withdraw together; casing and process pipework stay fixed.`;
 const jobs=[...new Set([job,...relevant.flatMap(i=>i.jobs)])];
 return {title:scenario.workOrders.find(o=>o.id===job)!.label,jobs,text,consequence:relevant.map(i=>i.text).join(' ')||'This work order has no conflict under the displayed plan.'};
}
export function createEquipmentHighlight(root:T.Group){
 let id:string|null=null;const originals=new Map<T.Mesh,T.Material|T.Material[]>(),clones:T.Material[]=[];
 function clear(){for(const [mesh,material] of originals)mesh.material=material;originals.clear();clones.splice(0).forEach(m=>m.dispose());}
 function select(equipmentId:string|null){if(equipmentId===id)return;clear();id=equipmentId;if(!id)return;
  const target:T.Object3D[]=[];root.traverse(o=>{if(o.userData.equipmentId===id)target.push(o);});
  for(const object of target)object.traverse(o=>{if(!(o instanceof T.Mesh)||originals.has(o))return;originals.set(o,o.material);const tint=(material:T.Material)=>{const copy=material.clone();if(copy instanceof T.MeshStandardMaterial){copy.emissive.set(0xd1a72f);copy.emissiveIntensity=.035;}clones.push(copy);return copy;};o.material=Array.isArray(o.material)?o.material.map(tint):tint(o.material);});
 }
 return {select,clear};
}

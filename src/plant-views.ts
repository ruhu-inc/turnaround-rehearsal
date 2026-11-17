export type Point3=[number,number,number];
export type PlantView='overview'|'entrance'|'aisle'|'pump';
export const PLANT_VIEWS:Record<PlantView,{label:string;position:Point3;target:Point3;next:PlantView|null;button:string}>={
 overview:{label:'UNIT 04 / PROCESS OVERVIEW',position:[13,9,-12],target:[2.3,1.7,4],next:'entrance',button:'EYE-LEVEL APPROACH'},
 entrance:{label:'01 / UNIT ENTRANCE',position:[3.65,1.65,-3.2],target:[1.65,1.15,2.4],next:'aisle',button:'STEP INTO UNIT'},
 aisle:{label:'02 / MAINTENANCE AISLE',position:[3.65,1.65,-.3],target:[1.95,1.05,2],next:'pump',button:'ENTER PUMP BAY'},
 pump:{label:'03 / P-101 PUMP BAY',position:[3.65,1.65,1],target:[2.08,1.0,2],next:null,button:'OPEN PLANNING TABLE'},
};
/** Map a stationary seated XR origin to a authored eye-height presentation station. */
export function xrStationTransform(view:Exclude<PlantView,'overview'>,headHeight=1.25){
 const {position:p,target:t}=PLANT_VIEWS[view],dx=t[0]-p[0],dz=t[2]-p[2],yaw=Math.atan2(dx,-dz),c=Math.cos(yaw),s=Math.sin(yaw);
 return {yaw,position:[-c*p[0]-s*p[2],headHeight-p[1],s*p[0]-c*p[2]] as Point3,lookAt:[0,headHeight+t[1]-p[1],-Math.hypot(dx,dz)] as Point3};
}

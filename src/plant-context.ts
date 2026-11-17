import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createProcessUnit} from './process-unit';
type V=[number,number,number];
/** Authored surrounding process unit. Context is outside the evaluated pump task. */
export function createPlantContext(shared:Record<string,T.MeshStandardMaterial>){
 const root=new T.Group();root.name='representative-plant-section';root.userData={visualContext:true,provenance:'Original fictional plant section; not a surveyed facility or evaluated process design.'};
 const m:Record<string,T.MeshStandardMaterial>={...shared,pipe:new T.MeshStandardMaterial({name:'Plant / weathered pipe',color:0x788b89,metalness:.65,roughness:.6}),rack:new T.MeshStandardMaterial({name:'Plant / structural steel',color:0x4a5960,metalness:.65,roughness:.62}),dark:new T.MeshStandardMaterial({name:'Plant / recesses',color:0x25302e,roughness:.93}),cabinet:new T.MeshStandardMaterial({name:'Plant / control cabinet',color:0x949d94,metalness:.45,roughness:.56})};
 function group(name:string){const g=new T.Group();g.name=name;root.add(g);return g;}
 function mesh(g:T.Group,geometry:T.BufferGeometry,material:T.Material,position:V=[0,0,0]){const a=new T.Mesh(geometry,material);a.position.set(...position);a.castShadow=a.receiveShadow=true;g.add(a);return a;}
 function box(g:T.Group,a:V,b:V,mat:T.Material){return mesh(g,new T.BoxGeometry(...b.map((v,i)=>v-a[i]) as V),mat,a.map((v,i)=>(v+b[i])/2) as V);}
 function pipe(g:T.Group,a:V,b:V,r:number,mat:T.Material,segments=16){const start=new T.Vector3(...a),end=new T.Vector3(...b),d=end.clone().sub(start);const o=mesh(g,new T.CylinderGeometry(r,r,d.length(),segments),mat,start.clone().add(end).multiplyScalar(.5).toArray() as V);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
 function bend(g:T.Group,a:V,corner:V,b:V,r:number,mat:T.Material){const c=new T.QuadraticBezierCurve3(new T.Vector3(...a),new T.Vector3(...corner),new T.Vector3(...b));return mesh(g,new T.TubeGeometry(c,12,r,16,false),mat);}
 function flange(g:T.Group,p:V,axis:V,r:number){const along=new T.Vector3(...axis),center=new T.Vector3(...p);pipe(g,center.clone().addScaledVector(along,-.022).toArray() as V,center.clone().addScaledVector(along,.022).toArray() as V,r,m.steel,32);
  const u=new T.Vector3(0,1,0);if(Math.abs(u.dot(along))>.9)u.set(1,0,0);u.cross(along).normalize();const v=along.clone().cross(u);for(let i=0;i<8;i++){const angle=i*Math.PI/4,c=center.clone().addScaledVector(u,Math.cos(angle)*r*.82).addScaledVector(v,Math.sin(angle)*r*.82);pipe(g,c.clone().addScaledVector(along,-.03).toArray() as V,c.clone().addScaledVector(along,.03).toArray() as V,.009,m.iron,6);}}
 function valve(g:T.Group,p:V,r:number){const [x,y,z]=p;pipe(g,[x,y,z-.10],[x,y,z+.10],r*1.35,m.pipe,24);flange(g,[x,y,z-.12],[0,0,1],r*1.8);flange(g,[x,y,z+.12],[0,0,1],r*1.8);pipe(g,[x,y,z],[x,y+.22,z],.018,m.steel);const wheel=mesh(g,new T.TorusGeometry(.105,.011,8,32),m.iron,[x,y+.23,z]);wheel.rotation.x=Math.PI/2;for(let i=0;i<3;i++){const a=i*Math.PI*2/3;pipe(g,[x,y+.23,z],[x+Math.cos(a)*.105,y+.23,z+Math.sin(a)*.105],.007,m.iron,8);}}
 // A rear pipe rack bounds the working bay; two levels of braced steel bents carry process headers.
 const rack=group('plant-perimeter-pipe-rack');
 for(const x of [-.85,1.65,4.15,6.65]){
  for(const z of [4.55,5.65]){box(rack,[x-.21,0,z-.21],[x+.21,.18,z+.21],m.concrete);box(rack,[x-.12,.18,z-.12],[x+.12,.21,z+.12],m.iron);box(rack,[x-.065,.21,z-.055],[x+.065,3.56,z+.055],m.rack);for(const dx of [-.08,.08])for(const dz of [-.08,.08])pipe(rack,[x+dx,.21,z+dz],[x+dx,.245,z+dz],.013,m.steel,6);}
  for(const y of [2.75,3.55])box(rack,[x-.08,y-.09,4.45],[x+.08,y+.09,5.75],m.rack);
 }
 for(const z of [4.55,5.65]){
  box(rack,[-.92,3.43,z-.045],[6.72,3.55,z+.045],m.rack);
  pipe(rack,[4.15,.25,z],[6.65,2.7,z],.025,m.rack);pipe(rack,[6.65,.25,z],[4.15,2.7,z],.025,m.rack);
 }
 const headers=group('plant-process-headers');
 for(const [z,r,y] of [[4.65,.10,3.75],[5.03,.14,3.79],[5.42,.075,3.72]]){
  pipe(headers,[-1.3,y,z],[7.3,y,z],r,m.pipe,24);
  for(const x of [-.85,1.65,4.15,6.65]){box(headers,[x-.10,3.64,z-.12],[x+.10,y-r,z+.12],m.iron);}
  for(const x of [.4,5.5])flange(headers,[x,y,z],[1,0,0],r*1.6);
 }
 // Continue the pump's existing connected suction and discharge spools into the surrounding unit.
 const ties=group('plant-connected-tie-ins');
 pipe(ties,[.1,1,2],[-.35,1,2],.10,m.paint,24);bend(ties,[-.35,1,2],[-.65,1,2],[-.65,1,2.3],.10,m.paint);pipe(ties,[-.65,1,2.3],[-.65,1,4.35],.10,m.paint,24);valve(ties,[-.65,1,3.45],.10);
 bend(ties,[-.65,1,4.35],[-.65,1,4.65],[-.65,1.3,4.65],.10,m.paint);pipe(ties,[-.65,1.3,4.65],[-.65,3.75,4.65],.10,m.paint,24);flange(ties,[-.65,2.35,4.65],[0,1,0],.16);
 pipe(ties,[1.52,1.9,3.75],[1.52,1.9,4.08],.075,m.paint,24);bend(ties,[1.52,1.9,4.08],[1.52,1.9,4.38],[1.52,2.2,4.38],.075,m.paint);pipe(ties,[1.52,2.2,4.38],[1.52,3.45,4.38],.075,m.paint,24);bend(ties,[1.52,3.45,4.38],[1.52,3.75,4.38],[1.52,3.75,4.65],.075,m.paint);flange(ties,[1.52,2.7,4.38],[0,1,0],.13);
 for(const z of [2.65,4.05]){box(ties,[-.8,0,z-.12],[-.5,.12,z+.12],m.concrete);pipe(ties,[-.65,.12,z],[-.65,.87,z],.035,m.rack);}
 // Vertical buffer vessel, modestly scaled against the scaffold and pump; no backdrop megastructures.
 const vessel=group('plant-buffer-vessel');
 const cx=6,cz=3.8;
 pipe(vessel,[cx,.65,cz],[cx,2.7,cz],.38,m.pipe,40);
 for(const y of [.65,2.7]){const head=mesh(vessel,new T.SphereGeometry(.38,32,12),m.pipe,[cx,y,cz]);head.scale.y=.42;}
 for(const x of [cx-.27,cx+.27])for(const z of [cz-.25,cz+.25]){box(vessel,[x-.07,0,z-.07],[x+.07,.12,z+.07],m.concrete);pipe(vessel,[x,.12,z],[x,.85,z],.035,m.rack);}
 pipe(vessel,[cx,2.7,cz],[cx,3.15,cz],.06,m.pipe);flange(vessel,[cx,3.04,cz],[0,1,0],.11);
 pipe(vessel,[cx,.92,cz],[cx,.92,cz-.58],.065,m.pipe);flange(vessel,[cx,.92,cz-.52],[0,0,1],.12);
 const face=mesh(vessel,new T.CylinderGeometry(.15,.15,.08,32),m.steel,[cx,1.65,cz-.38]);face.rotation.x=Math.PI/2;
 vessel.userData.labels=[{text:'V-204 / BUFFER',position:[cx,1.95,cz-.385],size:[.50,.085,0]}];
 // Cabinet, cable tray, junction box, conduit and floor details give a coherent human scale.
 const utilities=group('plant-electrical-utilities');
 box(utilities,[6.35,0,.30],[7.05,.18,1.10],m.concrete);box(utilities,[6.42,.18,.37],[6.98,1.65,1.03],m.cabinet);box(utilities,[6.46,.23,.359],[6.94,1.60,.37],m.rack);box(utilities,[6.90,.86,.345],[6.925,1.04,.36],m.iron);
 for(const x of [6.57,6.78])pipe(utilities,[x,.80,1.045],[x,.80,1.22],.015,m.zinc,8);
 for(const x of [6.45,6.9])box(utilities,[x,2.60,1.2],[x+.025,2.72,5.5],m.zinc);
 for(let z=1.2;z<5.5;z+=.16)box(utilities,[6.45,2.60,z],[6.925,2.62,z+.025],m.zinc);
 box(utilities,[4.0,.9,4.4],[4.26,1.25,4.5],m.cabinet);pipe(utilities,[4.13,.95,4.5],[4.13,2.7,4.5],.015,m.zinc,8);
 for(const x of [6.57,6.78])pipe(utilities,[x,.8,1.22],[x,2.6,1.22],.015,m.zinc,8);for(let y=.45;y<.70;y+=.035)box(utilities,[6.53,y,.345],[6.88,y+.009,.354],m.dark);
 utilities.userData.labels=[{text:'MCC-04',position:[6.7,1.45,.34],size:[.35,.07,0]}];
 const ground=group('plant-slab-details');
 box(ground,[-.8,-.004,-.52],[6.8,.003,-.30],m.dark);
 for(let x=-.8;x<6.8;x+=.06)box(ground,[x,.003,-.52],[x+.018,.008,-.30],m.zinc);
 for(const z of [.18,1.42])for(let x=.6;x<4.5;x+=.32)box(ground,[x,-.001,z],[x+.20,.002,z+.035],m.yellow);
 for(const z of [2.6,3.6])box(ground,[5.35,-.001,z],[5.95,.002,z+.035],m.yellow);
 root.add(createProcessUnit(m));
 // Batch stationary surroundings across components. Named groups retain labels and provenance.
 root.updateMatrixWorld(true);const buckets=new Map<T.Material,T.Mesh[]>();root.traverse(c=>{if(c instanceof T.Mesh&&!Array.isArray(c.material)){const list=buckets.get(c.material)??[];list.push(c);buckets.set(c.material,list);}});
 for(const [material,list] of buckets){const geometries=list.map(c=>(c.geometry.index?c.geometry.toNonIndexed():c.geometry.clone()).applyMatrix4(c.matrixWorld));const merged=mergeGeometries(geometries,false);if(merged){for(const c of list){c.removeFromParent();c.geometry.dispose();}const batch=mesh(root,merged,material);batch.name='Static plant surfaces / '+material.name;batch.userData.sourceCount=list.length;}geometries.forEach(g=>g.dispose());}
 return root;
}

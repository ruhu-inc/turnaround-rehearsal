import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries,toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import {PUMP_ASSET_VERSION} from './model-version';
import { scenario } from './evaluator';
import {createPlantContext} from './plant-context';

type V = [number,number,number];
const axisX=new T.Vector3(1,0,0), axisZ=new T.Vector3(0,0,1);
/** Original metre-scale, parametric source model. Named nodes match the scenario. */
export function createBay(){
 const materials={
  paint:new T.MeshStandardMaterial({name:'Pump / petrol enamel',color:0x245e6c,metalness:.22,roughness:.43}),
  steel:new T.MeshStandardMaterial({name:'Machined stainless steel',color:0xb5bdc1,metalness:.92,roughness:.24}),
  iron:new T.MeshStandardMaterial({name:'Cast iron / unpainted',color:0x3a4143,metalness:.7,roughness:.54}),
  frame:new T.MeshStandardMaterial({name:'Extraction rig / black enamel',color:0x28383e,metalness:.6,roughness:.42}),
  zinc:new T.MeshStandardMaterial({name:'Galvanized scaffold',color:0x9caaa9,metalness:.8,roughness:.46}),
  yellow:new T.MeshStandardMaterial({name:'Scaffold identification paint',color:0xe4b33f,metalness:.4,roughness:.46}),
  concrete:new T.MeshStandardMaterial({name:'Concrete foundation',color:0x727a75,roughness:.94}),
  rubber:new T.MeshStandardMaterial({name:'Seal elastomer',color:0x182024,roughness:.76}),
 };
 const group=new T.Group();group.name='P-101 / prepared pump bay';
 const moving=new T.Group();moving.name='withdrawal-assembly';moving.userData={equipmentId:'withdrawal-assembly',workOrderId:'PMP-03'};group.add(moving);
 const brace=new T.Group();brace.name='removable-scaffold-member';brace.userData={equipmentId:'lower-brace',workOrderId:'SCA-02'};group.add(brace);
 const deck=new T.Group();deck.name='original-inspection-platform';deck.userData={equipmentId:'inspection-platform',workOrderId:'INS-01'};group.add(deck);
 const stowedDeck=new T.Group();stowedDeck.name='stowed-inspection-platform';stowedDeck.visible=false;group.add(stowedDeck);
 const parts=new Map<string,T.Group>();
 function node(name:string,parent=group){const g=new T.Group();g.name=name;parent.add(g);return g;}
 function mesh(parent:T.Group,geometry:T.BufferGeometry,material:T.Material,name=''){if(geometry.type==='ExtrudeGeometry'){const original=geometry;geometry=toCreasedNormals(geometry,Math.PI/4);original.dispose();}const m=new T.Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function box(parent:T.Group,min:V,max:V,material:T.Material,bevel=0){const size=max.map((v,i)=>v-min[i]) as V;const g=bevel?new RoundedBoxGeometry(...size,2,Math.min(bevel,...size.map(v=>v/3))):new T.BoxGeometry(...size);const m=mesh(parent,g,material);m.position.set(...min.map((v,i)=>(v+max[i])/2) as V);return m;}
 function cyl(parent:T.Group,center:V,r:number,length:number,material:T.Material,axis=axisX,segments=64){const m=mesh(parent,new T.CylinderGeometry(r,r,length,segments),material);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis);m.position.set(...center);return m;}
 function tube(parent:T.Group,start:V,end:V,r:number,material:T.Material){const a=new T.Vector3(...start),b=new T.Vector3(...end);return cyl(parent,a.clone().add(b).multiplyScalar(.5).toArray() as V,r,a.distanceTo(b),material,b.sub(a).normalize(),12);}
 function annulus(parent:T.Group,start:V,length:number,r:number,hole:number,material:T.Material,axis=axisX){const shape=new T.Shape();shape.absarc(0,0,r,0,Math.PI*2,false);const h=new T.Path();h.absarc(0,0,hole,0,Math.PI*2,true);shape.holes.push(h);const m=mesh(parent,new T.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false,curveSegments:48}),material);m.quaternion.setFromUnitVectors(axisZ,axis);m.position.set(...start);return m;}
 function bolts(parent:T.Group,x:number,r:number,count:number,outer=.012){const g=new T.CylinderGeometry(outer,outer,.016,6),m=new T.InstancedMesh(g,materials.steel,count);m.name='Fitted hex fasteners';const o=new T.Object3D();for(let i=0;i<count;i++){const a=i*Math.PI*2/count;o.position.set(x,1+Math.sin(a)*r,2+Math.cos(a)*r);o.rotation.z=Math.PI/2;o.updateMatrix();m.setMatrixAt(i,o.matrix);}m.castShadow=true;parent.add(m);}
 function tag(parent:T.Group,text:string,position:V,size:V){(parent.userData.labels??=[]).push({text,position,size});}

 // Hollow volute, rear joint and open suction passage. Outer spiral stays within the fixture envelope.
 const casing=node('fixed-casing');casing.userData={equipmentId:'fixed-casing',workOrderId:'PMP-03'};const profile=new T.Shape();
 for(let i=0;i<=96;i++){const angle=i*Math.PI*2/96,rad=.242+.035*i/96;const y=Math.cos(angle)*rad,z=Math.sin(angle)*rad;if(!i)profile.moveTo(y,z);else profile.lineTo(y,z);}profile.closePath();
 const opening=new T.Path();opening.absarc(0,0,.22,0,Math.PI*2,true);profile.holes.push(opening);
 const volute=mesh(casing,new T.ExtrudeGeometry(profile,{depth:.449,bevelEnabled:true,bevelSize:.002,bevelThickness:.003,bevelSegments:3,curveSegments:48}),materials.paint);volute.quaternion.setFromUnitVectors(axisZ,axisX);volute.position.set(1.353,1,2);
 annulus(casing,[1.28,1,2],.07,.28,.10,materials.paint);
 annulus(casing,[1.805,1,2],.025,.28,.22,materials.steel);bolts(casing,1.817,.257,12);

 // Process connections remain attached while the assembly leaves the back of the casing.
 const pipes=node('connected-process-pipework');annulus(pipes,[.1,1,2],1.18,.10,.085,materials.paint);
 annulus(pipes,[1.225,1,2],.035,.155,.085,materials.steel);
 const dischargeAxis=new T.Vector3(0,1,0);annulus(pipes,[1.52,1.25,2],.43,.075,.062,materials.paint,dischargeAxis);annulus(pipes,[1.52,1.64,2],.035,.125,.062,materials.steel,dischargeAxis);
 const bend=new T.CubicBezierCurve3(new T.Vector3(1.52,1.675,2),new T.Vector3(1.52,1.9,2),new T.Vector3(1.52,1.9,2.2),new T.Vector3(1.52,1.9,2.35));mesh(pipes,new T.TubeGeometry(bend,24,.075,24,false),materials.paint);tube(pipes,[1.52,1.9,2.35],[1.52,1.9,3.75],.075,materials.paint);
 for(const z of [2.65,3.55]){box(pipes,[1.44,.04,z-.1],[1.60,.09,z+.1],materials.frame,.008);tube(pipes,[1.52,.09,z],[1.52,1.8,z],.025,materials.zinc);}
 // Concrete plinth and steel casing feet provide a visible load path.
 const foundation=node('casing-pedestal');box(foundation,[1.2,0,1.7],[1.84,.28,2.3],materials.concrete,.018);box(foundation,[1.23,.28,1.73],[1.81,.32,2.27],materials.frame,.008);
 for(const z of [1.79,2.15]){box(foundation,[1.37,.32,z],[1.66,.75,z+.06],materials.paint,.008);box(foundation,[1.30,.32,z-.035],[1.73,.355,z+.095],materials.steel,.006);}
 // Fixed I-section guide rails, stools and the named terminal stop.
 for(const p of scenario.bay.fixedPartsMm.filter(p=>p.group==='withdrawal-guide')){
  const g=node(p.id);const a=p.min.map(v=>v/1000) as V,b=p.max.map(v=>v/1000) as V;
  if(p.id.endsWith('rail')){box(g,a,[b[0],a[1]+.012,b[2]],materials.frame);box(g,[a[0],b[1]-.012,a[2]],b,materials.steel);box(g,[a[0],a[1]+.012,a[2]+.006],[b[0],b[1]-.012,b[2]-.006],materials.frame);}
  else if(p.id==='guide-end-stop'){box(g,a,b,materials.frame,.004);tag(g,'END STOP',[3.551,.535,2],[.19,.035,0]);}
  else {box(g,a,b,materials.frame,.002);box(g,[a[0]-.025,0,a[2]-.05],[b[0]+.025,.025,b[2]+.05],materials.steel,.004);}
 }
 for(const p of scenario.bay.movingPartsAtRestMm){const g=node(p.id,moving);g.userData.proxyId=p.id;g.userData.equipmentId=p.id;g.userData.workOrderId='PMP-03';parts.set(p.id,g);}
 const impeller=parts.get('impeller')!;
 annulus(impeller,[1.45,1,2],.018,.2,.052,materials.steel);annulus(impeller,[1.535,1,2],.015,.2,.068,materials.steel);cyl(impeller,[1.5,1,2],.052,.10,materials.steel);
 for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const point=(r:number,t:number)=>new T.Vector2(Math.cos(t)*r,Math.sin(t)*r);const inner=point(.065,a),outer=point(.195,a+.7),back=point(.195,a+.76),backInner=point(.065,a+.1);const shape=new T.Shape();shape.moveTo(inner.x,inner.y);const mid=point(.13,a+.08);shape.quadraticCurveTo(mid.x,mid.y,outer.x,outer.y);shape.lineTo(back.x,back.y);const mid2=point(.13,a+.16);shape.quadraticCurveTo(mid2.x,mid2.y,backInner.x,backInner.y);shape.closePath();const vane=mesh(impeller,new T.ExtrudeGeometry(shape,{depth:.067,bevelEnabled:false,curveSegments:12}),materials.steel);vane.quaternion.setFromUnitVectors(axisZ,axisX);vane.position.set(1.468,1,2);}
 const shaft=parts.get('shaft')!;cyl(shaft,[2.0,1,2],.020,.90,materials.steel);cyl(shaft,[2.475,1,2],.020,.05,materials.iron);
 const cover=parts.get('casing-backplate')!;annulus(cover,[1.84,1,2],.045,.24,.08,materials.paint);annulus(cover,[1.885,1,2],.004,.225,.08,materials.steel);bolts(cover,1.892,.205,8,.01);
 const seal=parts.get('seal-chamber')!;annulus(seal,[1.76,1,2],.19,.08,.022,materials.steel);annulus(seal,[1.93,1,2],.008,.079,.023,materials.rubber);
 for(const id of ['bracket-front-rib','bracket-rear-rib']){const p=scenario.bay.movingPartsAtRestMm.find(p=>p.id===id)!;box(parts.get(id)!,p.min.map(v=>v/1000) as V,p.max.map(v=>v/1000) as V,materials.paint,.003);}
 const bearing=parts.get('bearing-housing')!;cyl(bearing,[2.0025,1,2],.12,.105,materials.paint);cyl(bearing,[2.057,1,2],.12,.004,materials.iron);cyl(bearing,[2.182,1,2],.12,.246,materials.paint);annulus(bearing,[2.305,1,2],.023,.12,.025,materials.steel);
 for(let i=0;i<8;i++){const a=i*Math.PI/4,y=1+Math.sin(a)*.1,z=2+Math.cos(a)*.1;cyl(bearing,[2.3285,y,z],.012,.001,materials.steel,axisX,16);cyl(bearing,[2.328, y,z],.009,.004,materials.iron,axisX,6);}
 tag(bearing,'BRG-101 / SERVICE END',[2.12,1.035,1.88],[.18,.032,0]);
 box(bearing,[1.99,.88,1.9],[2.28,.915,2.1],materials.paint,.006);
 const carrier=parts.get('support-carriage')!;box(carrier,[1.94,.50,1.88],[2.31,.54,2.12],materials.frame,.005);
 for(const z of [1.88,2.1])box(carrier,[1.97,.54,z],[2.28,.85,z+.02],materials.frame,.004);
 box(carrier,[1.94,.85,1.88],[2.31,.88,2.12],materials.steel,.003);
 const handle=mesh(carrier,new T.TorusGeometry(.065,.01,8,32),materials.yellow,'pinch-handle');handle.rotation.y=Math.PI/2;handle.position.set(2.29,.72,2);
 // The obstructing square member has an explicit flat contact face. Its outboard shoe clears the guide rails.
 box(brace,[0,.55,0],[.12,1.75,.12],materials.zinc,.001);
 for(const y of [.62,1.48])box(brace,[0,y,-.0002],[.12,y+.085,.12],materials.yellow);
 // Bolted rear clevis at the upper tie and a pinned shoe make the removable connection legible.
 box(brace,[.015,1.66,.12],[.105,1.75,.17],materials.iron,.002);
 for(const y of [.565,1.705])cyl(brace,[.06,y,.173],.016,.012,materials.steel,axisZ,6);
 tag(brace,'SCA-02 / REMOVABLE',[.06,1.37,-.002],[.25,.045,0]);
 box(brace,[.025,.55,.12],[.095,.58,.26],materials.zinc,.003);
 box(brace,[.035,.03,.235],[.085,.60,.285],materials.zinc,.003);
 box(brace,[-.03,0,.17],[.15,.03,.35],materials.zinc,.004);
 const upperTie=tube(group,[2.84,1.73,2.14],[2.95,1.73,2.86],.024,materials.zinc);upperTie.name='removable-member-upper-tie';
 // Complete supported scaffold: standards, ledgers, diagonal braces, guardrails, toe boards and ladder.
 const scaffold=node('fixed-scaffold-supports');scaffold.userData={equipmentId:'fixed-scaffold-supports',workOrderId:'SCA-02'};
 for(const x of [2.95,4.45])for(const z of [2.86,3.74]){tube(scaffold,[x,.03,z],[x,3.02,z],.024,materials.zinc);box(scaffold,[x-.09,0,z-.09],[x+.09,.03,z+.09],materials.zinc,.004);for(const y of [.55,1.73,2.051,2.55,3.0])cyl(scaffold,[x,y,z],.034,.06,materials.iron,new T.Vector3(0,1,0),12);}
 for(const y of [.55,1.73,2.051,2.55,3.0]){for(const z of [2.86,3.74])tube(scaffold,[2.95,y,z],[4.45,y,z],.024,materials.zinc);for(const x of [2.95,4.45])tube(scaffold,[x,y,2.86],[x,y,3.74],.024,materials.zinc);}
 tube(scaffold,[2.95,.08,3.74],[4.45,2.1,3.74],.024,materials.zinc);tube(scaffold,[4.45,.08,3.74],[2.95,2.1,3.74],.024,materials.zinc);
 for(let i=0;i<7;i++){const z=2.80+i*.14;box(deck,[2.90,2.075,z],[4.5,2.1,z+.125],materials.iron,.004);}
 box(deck,[2.90,2.1,2.80],[4.5,2.25,2.82],materials.zinc);box(deck,[2.90,2.1,3.78],[4.5,2.25,3.8],materials.zinc);
 // The same seven planks are stored flat on dunnage, outside the ladder and withdrawal corridor.
 for(const x of [4.20,5.50])box(stowedDeck,[x,.015,.25],[x+.10,.06,1.36],materials.frame,.004);
 for(let i=0;i<7;i++){const z=.30+(i%4)*.14,y=.06+Math.floor(i/4)*.025;box(stowedDeck,[4.10,y,z],[5.70,y+.025,z+.125],materials.iron,.004);}
 box(stowedDeck,[4.10,.06,1.00],[5.70,.08,1.15],materials.zinc);box(stowedDeck,[4.10,.06,1.18],[5.70,.08,1.33],materials.zinc);
 for(const x of [4.48,4.78])tube(scaffold,[x,.06,3.91],[x,2.25,3.91],.024,materials.zinc);for(let y=.2;y<2.25;y+=.25)tube(scaffold,[4.48,y,3.91],[4.78,y,3.91],.014,materials.zinc);
 const instrument=node('inspection-instrument');const gaugeHead=node('upper-gauge',instrument);gaugeHead.userData={equipmentId:'upper-gauge',workOrderId:'INS-01'};cyl(gaugeHead,[4.60,2.38,3.32],.075,.035,materials.steel,axisZ);const dial=cyl(gaugeHead,[4.60,2.38,3.295],.063,.005,new T.MeshStandardMaterial({color:0xd8d9c8,roughness:.5}),axisZ);dial.name='Gauge dial';tube(gaugeHead,[4.60,2.38,3.29],[4.63,2.42,3.29],.003,materials.frame);tube(instrument,[4.60,2.3,3.32],[4.60,1.9,3.32],.012,materials.steel);tag(gaugeHead,'INS-01',[4.60,2.53,3.28],[.23,.06,0]);
 tube(instrument,[1.52,1.9,3.32],[4.60,1.9,3.32],.012,materials.steel);
 // Removed motor is staged on timber blocks beyond the withdrawal and access routes.
 const motor=node('parked-motor');cyl(motor,[4.55,.45,3.25],.25,.75,materials.paint);cyl(motor,[4.93,.45,3.25],.255,.09,materials.iron);for(let i=0;i<18;i++){const a=i*Math.PI*2/18;const fin=box(motor,[4.23,-.009,-.009],[4.88,.009,.009],materials.paint);fin.position.set(4.555,.45+Math.sin(a)*.253,3.25+Math.cos(a)*.253);fin.rotation.x=a;}
 for(const x of [4.25,4.75]){box(motor,[x,.09,3.03],[x+.15,.23,3.47],materials.paint,.01);box(motor,[x-.04,.03,3.0],[x+.19,.09,3.5],materials.iron,.008);}tag(motor,'MOTOR REMOVED',[4.55,.76,3.25],[.45,.07,0]);
 const floor=box(group,[-5,-.12,-5],[12,-.005,11.5],materials.concrete,.025);floor.name='bay-foundation';
 group.add(createPlantContext(materials));
 tag(group,'P-101 / PUMP',[1.45,.18,1.695],[.42,.08,0]);
 const outline=new T.Box3Helper(new T.Box3(new T.Vector3(2.78,.55,2.08),new T.Vector3(2.9,1.75,2.2)),0xffbf45);outline.name='debug-clearance-outline';outline.userData.assistance=true;outline.visible=false;group.add(outline);
 const clearance=new T.Group();clearance.name='minimum-clearance';clearance.userData.assistance=true;const measurementMaterial=new T.LineBasicMaterial({color:0x8cdecf,depthTest:false});for(const points of [[[2.82,1,2.24],[2.82,1,2.49]],[[2.79,1,2.24],[2.85,1,2.24]],[[2.79,1,2.49],[2.85,1,2.49]]]){const line=new T.Line(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p as V))),measurementMaterial);line.renderOrder=10;clearance.add(line);}clearance.visible=false;group.add(clearance);
 const marker=new T.Mesh(new T.TorusGeometry(.018,.003,6,24),new T.MeshBasicMaterial({color:0xffce62}));marker.name='contact-witness';marker.userData.assistance=true;marker.rotation.y=Math.PI/2;marker.position.set(2.78,1,2.1);marker.visible=false;group.add(marker);
 // Batch each named component independently so materials can be shared without losing component identity.
 for(const target of [casing,pipes,foundation,scaffold,instrument,motor,...parts.values(),deck,stowedDeck,brace,gaugeHead]){
  const buckets=new Map<T.Material,T.Mesh[]>();
  for(const child of [...target.children])if(child instanceof T.Mesh && !(child instanceof T.InstancedMesh) && child.name!=='pinch-handle' && !Array.isArray(child.material)){
   const list=buckets.get(child.material)??[];list.push(child);buckets.set(child.material,list);
  }
  for(const [material,meshes] of buckets){if(meshes.length<2)continue;
   const geometries=meshes.map(m=>{m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();return g.applyMatrix4(m.matrix);});
   const merged=mergeGeometries(geometries,false);if(merged){const batch=mesh(target,merged,material,'Batched component surfaces');for(const m of meshes)target.remove(m);batch.userData.sourceCount=meshes.length;}
   geometries.forEach(g=>g.dispose());
  }
 }
 // Metre-space planar UVs keep texel density stable across the many authored components.
 // Rigid geometry carries its own coordinates, so textures translate with the assembly.
 const mapped=new Set<T.BufferGeometry>();group.traverse(o=>{if(!(o instanceof T.Mesh)||mapped.has(o.geometry))return;const material=Array.isArray(o.material)?o.material[0]:o.material;if(!(material instanceof T.MeshStandardMaterial))return;const g=o.geometry,p=g.getAttribute('position'),n=g.getAttribute('normal');if(!p||!n)return;const uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));uv[i*2]=nx>=ny&&nx>=nz?p.getZ(i):p.getX(i);uv[i*2+1]=ny>=nx&&ny>=nz?p.getZ(i):p.getY(i);}g.setAttribute('uv',new T.BufferAttribute(uv,2));mapped.add(g);});
 group.userData.fixtureVersion=scenario.scenarioVersion;group.userData.assetVersion=PUMP_ASSET_VERSION;
 upperTie.userData.authoredLength=Math.sqrt(.11*.11+.72*.72);
 return bindBay(group);
}

export function bindBay(group:T.Group){
 function requireNode<N extends T.Object3D>(name:string){const n=group.getObjectByName(name);if(!n)throw Error('Pump asset missing node: '+name);return n as N;}
 const moving=requireNode<T.Group>('withdrawal-assembly'),brace=requireNode<T.Group>('removable-scaffold-member'),deck=requireNode<T.Group>('original-inspection-platform'),stowedDeck=requireNode<T.Group>('stowed-inspection-platform'),upperTie=requireNode<T.Mesh>('removable-member-upper-tie');
 const marker=requireNode<T.Mesh>('contact-witness'),clearance=requireNode<T.Group>('minimum-clearance'),outline=requireNode<T.Object3D>('debug-clearance-outline');marker.visible=outline.visible=clearance.visible=false;const markerMaterial=marker.material as T.MeshBasicMaterial;markerMaterial.depthTest=false;markerMaterial.depthWrite=false;marker.renderOrder=10;clearance.traverse(o=>{if(o instanceof T.Line){const material=o.material as T.LineBasicMaterial;material.depthTest=false;material.depthWrite=false;o.renderOrder=10;}});
 const parts=new Map(scenario.bay.movingPartsAtRestMm.map(p=>[p.id,requireNode<T.Group>(p.id)]));
 let route=group.getObjectByName('planned-removal-outline') as T.LineSegments|undefined;
 if(!route){
  group.updateMatrixWorld(true);const inverse=group.matrixWorld.clone().invert(),positions:number[]=[];
  moving.traverse(o=>{if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||o.name==='equipment-tag')return;const edges=new T.EdgesGeometry(o.geometry,30);edges.applyMatrix4(inverse.clone().multiply(o.matrixWorld));edges.translate(...scenario.bay.assemblyTravelMm.map(v=>v/1000) as V);const p=edges.getAttribute('position');for(let i=0;i<p.count;i++)positions.push(p.getX(i),p.getY(i),p.getZ(i));edges.dispose();});
  route=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3)),new T.LineBasicMaterial({color:0x83d9d6,transparent:true,opacity:.24,depthWrite:false}));route.name='planned-removal-outline';route.userData.assistance=true;group.add(route);
 }
 route.visible=false;

 group.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=o.name!=='contact-witness';o.receiveShadow=true;}});
 if(typeof document!=='undefined'){
  const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=128;const ctx=labelCanvas.getContext('2d')!;
  const gap=scenario.cases[1].braceMm.min[2]-Math.max(...scenario.bay.movingPartsAtRestMm.map(p=>p.max[2]));ctx.fillStyle='#14212b';ctx.fillRect(0,0,512,128);ctx.fillStyle='#a2f3e9';ctx.font='bold 70px monospace';ctx.textAlign='center';ctx.fillText(`${Math.round(gap)} mm`,256,88);
  const texture=new T.CanvasTexture(labelCanvas);texture.colorSpace=T.SRGBColorSpace;const label=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}));label.name='clearance-distance-label';label.raycast=()=>{};label.position.set(2.82,1.15,2.365);label.scale.set(.28,.07,1);label.renderOrder=11;clearance.add(label);

  const c=document.createElement('canvas');c.width=768;c.height=128;const cctx=c.getContext('2d')!;cctx.fillStyle='#14212b';cctx.fillRect(0,0,768,128);cctx.fillStyle='#f2cf78';cctx.font='bold 43px sans-serif';cctx.textAlign='center';cctx.fillText('BEARING / SCAFFOLD CONTACT',384,82);const ct=new T.CanvasTexture(c);ct.colorSpace=T.SRGBColorSpace;const contactLabel=new T.Sprite(new T.SpriteMaterial({map:ct,depthTest:false,depthWrite:false}));contactLabel.name='contact-callout-label';contactLabel.position.set(.15,.30,0);contactLabel.scale.set(.58,.096,1);contactLabel.renderOrder=11;contactLabel.raycast=()=>{};marker.add(contactLabel);
  const leader=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(.15,.24,0),new T.Vector3(.15,.25,0)]),new T.LineBasicMaterial({color:0xf2cf78,depthTest:false,depthWrite:false}));leader.name='contact-callout-leader';leader.renderOrder=11;marker.add(leader);
  const labelled:T.Object3D[]=[];group.traverse(o=>{if(o.userData.labels)labelled.push(o);});
  for(const parent of labelled)for(const label of parent.userData.labels as {text:string;position:V;size:V}[]){
   const c=document.createElement('canvas');c.width=384;c.height=96;const ctx=c.getContext('2d')!;ctx.fillStyle='#dadacb';ctx.fillRect(0,0,384,96);ctx.fillStyle='#20343b';ctx.font='bold 27px monospace';ctx.fillText(label.text,14,56);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(label.size[0],label.size[1]),new T.MeshBasicMaterial({map:texture,side:T.FrontSide}));m.name='equipment-tag';m.rotation.y=Math.PI;m.position.set(...label.position);parent.add(m);
  }
 }
 function pose(progress:number,west:boolean,modified:boolean){
  moving.position.x=progress*scenario.bay.assemblyTravelMm[0]/1000;
  const bounds=modified?scenario.bay.braceAfterModificationMm:scenario.cases[west?1:0].braceMm;
  brace.position.set(bounds.min[0]/1000,0,bounds.min[2]/1000);deck.visible=!modified;stowedDeck.visible=modified;
  const a=new T.Vector3(brace.position.x+.06,1.73,brace.position.z+.06),b=new T.Vector3(modified?4.45:2.95,1.73,modified?3.74:2.86);
  upperTie.position.copy(a.clone().add(b).multiplyScalar(.5));upperTie.scale.y=a.distanceTo(b)/upperTie.userData.authoredLength;upperTie.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());
 }
 pose(0,false,false);
 return {group,moving,brace,deck,marker,clearance,outline,route,parts,pose};
}

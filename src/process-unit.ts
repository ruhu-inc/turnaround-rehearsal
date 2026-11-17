import * as T from 'three';
type V=[number,number,number];
/** Original process-unit surroundings, metres. Task and approach corridors stay clear. */
export function createProcessUnit(m:Record<string,T.MeshStandardMaterial>){
 const root=new T.Group();root.name='process-unit-04';
 const group=(name:string)=>{const g=new T.Group();g.name=name;root.add(g);return g;};
 const mesh=(g:T.Group,geo:T.BufferGeometry,mat:T.Material,p:V=[0,0,0])=>{const a=new T.Mesh(geo,mat);a.position.set(...p);a.castShadow=a.receiveShadow=true;g.add(a);return a;};
 function box(g:T.Group,a:V,b:V,mat:T.Material){return mesh(g,new T.BoxGeometry(...b.map((v,i)=>v-a[i]) as V),mat,a.map((v,i)=>(v+b[i])/2) as V);}
 function pipe(g:T.Group,a:V,b:V,r:number,mat:T.Material,n=16){const p=new T.Vector3(...a),q=new T.Vector3(...b),d=q.clone().sub(p),o=mesh(g,new T.CylinderGeometry(r,r,d.length(),n),mat,p.clone().add(q).multiplyScalar(.5).toArray() as V);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
 function ring(g:T.Group,p:V,r:number,t:number,mat:T.Material,axis:V=[0,1,0]){const a=mesh(g,new T.TorusGeometry(r,t,4,20),mat,p);a.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...axis));return a;}
 function flange(g:T.Group,p:V,r:number,axis:V=[1,0,0]){const c=new T.Vector3(...p),d=new T.Vector3(...axis),u=new T.Vector3(0,1,0);if(Math.abs(d.dot(u))>.9)u.set(1,0,0);u.cross(d).normalize();const v=d.clone().cross(u);pipe(g,c.clone().addScaledVector(d,-.035).toArray() as V,c.clone().addScaledVector(d,.035).toArray() as V,r,m.pipe,32);ring(g,p,r*.91,.006,m.iron,axis);for(let i=0;i<12;i++){const a=i*Math.PI/6,b=c.clone().addScaledVector(u,r*.8*Math.cos(a)).addScaledVector(v,r*.8*Math.sin(a));pipe(g,b.clone().addScaledVector(d,-.048).toArray() as V,b.clone().addScaledVector(d,.048).toArray() as V,.012,m.steel,6);}}
 function elbow(g:T.Group,a:V,c:V,b:V,r:number,mat:T.Material){return mesh(g,new T.TubeGeometry(new T.QuadraticBezierCurve3(new T.Vector3(...a),new T.Vector3(...c),new T.Vector3(...b)),10,r,16,false),mat);}
 function beam(g:T.Group,x:number,z:number,height:number){box(g,[x-.22,0,z-.22],[x+.22,.25,z+.22],m.concrete);box(g,[x-.14,.25,z-.14],[x+.14,.28,z+.14],m.iron);for(const dx of [-.1,.1])for(const dz of [-.1,.1])pipe(g,[x+dx,.28,z+dz],[x+dx,.32,z+dz],.014,m.steel,6);box(g,[x-.09,.28,z-.065],[x+.09,height,z-.045],m.rack);box(g,[x-.09,.28,z+.045],[x+.09,height,z+.065],m.rack);box(g,[x-.012,.28,z-.045],[x+.012,height,z+.045],m.rack);}
 function handrail(g:T.Group,a:V,b:V){for(const h of [0,.55,1.1])pipe(g,[a[0],a[1]+h,a[2]],[b[0],b[1]+h,b[2]],.021,m.yellow,10);const length=Math.hypot(b[0]-a[0],b[2]-a[2]),n=Math.ceil(length/1.2);for(let i=0;i<=n;i++){const t=i/n,x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t;pipe(g,[x,a[1],z],[x,a[1]+1.1,z],.021,m.yellow,10);}}
 const rack=group('unit-main-pipe-rack');
 for(const x of [-4,-.5,3,6.5,10]){for(const z of [6.4,8.7])beam(rack,x,z,5.9);for(const y of [4.0,5.8])box(rack,[x-.09,y-.12,6.25],[x+.09,y+.12,8.85],m.rack);}
 for(const z of [6.4,8.7]){for(const y of [3.9,5.7])box(rack,[-4.1,y-.08,z-.06],[10.1,y+.08,z+.06],m.rack);for(const [x1,x2] of [[-4,-.5],[6.5,10]]){pipe(rack,[x1,.4,z],[x2,3.8,z],.035,m.rack);pipe(rack,[x2,.4,z],[x1,3.8,z],.035,m.rack);}}
 const headers=group('unit-headers-and-insulation');
 for(const [z,r,y] of [[6.65,.17,6.08],[7.2,.12,6.03],[7.7,.20,6.1],[8.3,.085,5.99]]){pipe(headers,[-4.8,y,z],[10.9,y,z],r,m.pipe,24);for(const x of [-4,-.5,3,6.5,10])box(headers,[x-.14,5.9,z-.13],[x+.14,y-r,z+.13],m.iron);for(const x of [-2.3,4.5,8.4])flange(headers,[x,y,z],r*1.55);for(let x=-4.7;x<10.8;x+=1.05)ring(headers,[x,y,z],r+.003,.007,m.steel,[1,0,0]);}
 // Tie existing low rack into the larger headers; supports follow the rising spools.
 pipe(headers,[7.3,3.79,5.03],[8.4,3.79,5.03],.14,m.pipe,24);elbow(headers,[8.4,3.79,5.03],[8.7,3.79,5.03],[8.7,4.09,5.03],.14,m.pipe);pipe(headers,[8.7,4.09,5.03],[8.7,5.73,5.03],.14,m.pipe);elbow(headers,[8.7,5.73,5.03],[8.7,6.03,5.03],[8.7,6.03,5.33],.14,m.pipe);pipe(headers,[8.7,6.03,5.33],[8.7,6.03,7.2],.14,m.pipe);flange(headers,[8.7,4.8,5.03],.22,[0,1,0]);
 const vessel=group('unit-separator-v201');
 pipe(vessel,[-2.65,.38,6.6],[-2.65,1.2,6.6],.70,m.rack,32);box(vessel,[-3.6,0,5.65],[-1.7,.3,7.55],m.concrete);
 pipe(vessel,[-2.65,1.2,6.6],[-2.65,5.4,6.6],.70,m.pipe,40);
 for(const y of [1.2,5.4]){const h=mesh(vessel,new T.SphereGeometry(.7,32,12),m.pipe,[-2.65,y,6.6]);h.scale.y=.48;}
 for(const y of [1.7,2.8,4.1,5.1])ring(vessel,[-2.65,y,6.6],.703,.012,m.steel);
 pipe(vessel,[-2.65,5.9,6.6],[-2.65,6.4,6.6],.13,m.pipe);flange(vessel,[-2.65,6.25,6.6],.23,[0,1,0]);elbow(vessel,[-2.65,6.4,6.6],[-2.65,6.65,6.6],[-2.4,6.65,6.6],.13,m.pipe);pipe(vessel,[-2.4,6.65,6.6],[-1.4,6.65,6.6],.13,m.pipe);
 pipe(vessel,[-2.65,1.65,6.6],[-2.65,1.65,5.45],.12,m.pipe);flange(vessel,[-2.65,1.65,5.65],.22,[0,0,1]);
 // Bolted manway, brackets, pressure gauge and a grounded vertical ladder.
 pipe(vessel,[-2.65,2.2,6.05],[-2.65,2.2,5.8],.24,m.pipe,32);flange(vessel,[-2.65,2.2,5.78],.31,[0,0,1]);
 pipe(vessel,[-2.3,3.9,5.95],[-2.3,4.2,5.95],.012,m.steel);pipe(vessel,[-2.3,4.23,5.93],[-2.3,4.23,5.88],.068,m.steel,24);pipe(vessel,[-2.3,4.23,5.876],[-2.3,4.23,5.87],.056,m.cabinet,24);
 for(const x of [-3.72,-3.37])pipe(vessel,[x,.15,6.05],[x,5.5,6.05],.025,m.zinc,10);for(let y=.3;y<5.4;y+=.28)pipe(vessel,[-3.72,y,6.05],[-3.37,y,6.05],.017,m.zinc,10);
 for(const y of [2.5,3.4,4.3,5.2]){const a=mesh(vessel,new T.TorusGeometry(.36,.017,6,24,Math.PI*1.5),m.zinc,[-3.55,y,6.02]);a.rotation.x=Math.PI/2;}
 pipe(vessel,[-1.4,6.65,6.6],[-1.1,6.65,6.6],.13,m.pipe);elbow(vessel,[-1.1,6.65,6.6],[-.8,6.65,6.6],[-.8,6.35,6.6],.13,m.pipe);pipe(vessel,[-.8,6.35,6.6],[-.8,6.08,6.6],.13,m.pipe);
 vessel.userData.labels=[{text:'V-201 / SEPARATOR',position:[-2.65,3.15,5.89],size:[.70,.14,0]}];
 const skid=group('unit-standby-pump-p102');
 box(skid,[-3.7,0,.5],[-.7,.25,1.5],m.concrete);box(skid,[-3.55,.25,.65],[-.8,.35,1.35],m.rack);
 pipe(skid,[-3.3,1,1],[-2.8,1,1],.27,m.paint,32);flange(skid,[-2.8,1,1],.28);
 pipe(skid,[-2.8,1,1],[-2.25,1,1],.12,m.paint,24);pipe(skid,[-2.25,1,1],[-1.8,1,1],.035,m.steel);box(skid,[-2.3,.75,.83],[-1.72,1.2,1.17],m.yellow);
 pipe(skid,[-1.75,1,1],[-.96,1,1],.25,m.paint,32);pipe(skid,[-.96,1,1],[-.87,1,1],.26,m.iron,32);
 for(let i=0;i<18;i++){const a=i*Math.PI/9,y=1+Math.cos(a)*.25,z=1+Math.sin(a)*.25;pipe(skid,[-1.7,y,z],[-1.0,y,z],.013,m.paint,6);}
 for(const x of [-3.15,-2.45,-1.6,-1.1]){box(skid,[x,.35,.78],[x+.16,.78,.86],m.paint);box(skid,[x,.35,1.14],[x+.16,.78,1.22],m.paint);}
 box(skid,[-1.50,1.20,.90],[-1.20,1.39,1.15],m.rack);pipe(skid,[-3.7,1,1],[-3.3,1,1],.10,m.pipe,24);flange(skid,[-3.45,1,1],.16);elbow(skid,[-3.7,1,1],[-4.0,1,1],[-4.0,1,1.3],.10,m.pipe);pipe(skid,[-4,1,1.3],[-4,1,5.3],.10,m.pipe,24);pipe(skid,[-3.0,1.1,1],[-3,1.8,1],.075,m.pipe);elbow(skid,[-3,1.8,1],[-3,2.1,1],[-3,2.1,1.3],.075,m.pipe);pipe(skid,[-3,2.1,1.3],[-3,2.1,4.35],.075,m.pipe,24);
 elbow(skid,[-3,2.1,4.35],[-3,2.1,4.65],[-3,2.4,4.65],.075,m.pipe);pipe(skid,[-3,2.4,4.65],[-3,3.75,4.65],.075,m.pipe);pipe(skid,[-3.4,3.75,4.65],[-1.3,3.75,4.65],.10,m.pipe,24);
 elbow(skid,[-4,1,5.3],[-4,1,5.6],[-4,1.3,5.6],.10,m.pipe);pipe(skid,[-4,1.3,5.6],[-2.95,1.3,5.6],.10,m.pipe);elbow(skid,[-2.95,1.3,5.6],[-2.65,1.3,5.6],[-2.65,1.6,5.6],.10,m.pipe);pipe(skid,[-2.65,1.6,5.6],[-2.65,1.65,5.6],.10,m.pipe);
 skid.userData.labels=[{text:'P-102 / STANDBY',position:[-2.3,.49,.63],size:[.60,.10,0]}];
 const exchanger=group('unit-exchanger-e201');
 box(exchanger,[7.1,0,3.2],[8.9,.25,7.4],m.concrete);pipe(exchanger,[8,1.55,3.6],[8,1.55,6.9],.46,m.pipe,40);
 for(const z of [3.6,6.9])flange(exchanger,[8,1.55,z],.55,[0,0,1]);
 for(const z of [4.15,6.25]){box(exchanger,[7.55,.25,z-.12],[8.45,.7,z+.12],m.rack);box(exchanger,[7.7,.7,z-.08],[8.3,1.18,z+.08],m.rack);ring(exchanger,[8,1.55,z],.465,.025,m.iron,[0,0,1]);}
 for(let z=3.9;z<6.9;z+=.55)ring(exchanger,[8,1.55,z],.464,.008,m.steel,[0,0,1]);
 for(const z of [4.0,6.4]){pipe(exchanger,[8,1.8,z],[8,2.5,z],.11,m.pipe);flange(exchanger,[8,2.35,z],.19,[0,1,0]);}
 pipe(exchanger,[8,2.5,6.4],[8,5.8,6.4],.11,m.pipe);elbow(exchanger,[8,5.8,6.4],[8,6.1,6.4],[8,6.1,6.7],.11,m.pipe);pipe(exchanger,[8,6.1,6.7],[8,6.1,7.7],.11,m.pipe);
 elbow(exchanger,[8,2.5,4],[7.7,2.5,4],[7.7,2.5,4.3],.11,m.pipe);pipe(exchanger,[7.7,2.5,4.3],[7.7,2.5,5.12],.11,m.pipe);elbow(exchanger,[7.7,2.5,5.12],[7.7,2.5,5.42],[7.7,2.8,5.42],.11,m.pipe);pipe(exchanger,[7.7,2.8,5.42],[7.7,3.72,5.42],.11,m.pipe);pipe(exchanger,[7.3,3.72,5.42],[8.0,3.72,5.42],.075,m.pipe);
 exchanger.userData.labels=[{text:'E-201 / COOLER',position:[8,1.7,3.54],size:[.6,.12,0]}];
 const platform=group('unit-service-platform');
 for(const x of [9.1,10.6])for(const z of [3.9,7.5])beam(platform,x,z,2.65);
 box(platform,[9.05,2.6,3.85],[10.65,2.68,7.55],m.rack);
 for(let z=3.86;z<7.55;z+=.08)box(platform,[9.07,2.68,z],[10.63,2.69,z+.018],m.zinc);
 handrail(platform,[9.1,2.7,3.9],[9.1,2.7,7.5]);handrail(platform,[10.6,2.7,3.9],[10.6,2.7,7.5]);handrail(platform,[9.1,2.7,7.5],[10.6,2.7,7.5]);
 // Stairs approach along the outside of the process unit, with actual supported treads.
 for(let i=0;i<13;i++){const z=.1+i*.28,y=(i+1)*.2;box(platform,[9.2,y-.04,z],[10.5,y,z+.26],m.zinc);}
 box(platform,[9.2,2.56,3.7],[10.5,2.60,3.86],m.zinc);
 pipe(platform,[9.18,.12,.08],[9.18,2.62,3.8],.045,m.rack);pipe(platform,[10.52,.12,.08],[10.52,2.62,3.8],.045,m.rack);
 for(const x of [9.18,10.52]){pipe(platform,[x,1.1,.08],[x,3.7,3.8],.022,m.yellow);for(const i of [0,4,8,12])pipe(platform,[x,(i+1)*.2,.1+i*.28],[x,(i+1)*.2+1.05,.1+i*.28],.022,m.yellow);}
 const site=group('unit-site-details');
 for(const x of [-4.4,-2.4,-.4,1.6,3.6,5.6,7.6,9.6,11.6])box(site,[x,-.004,-4.8],[x+.01,-.002,11.4],m.dark);
 for(const z of [-4.8,-2.8,-.8,1.2,3.2,5.2,7.2,9.2,11.2])box(site,[-4.8,-.004,z],[11.8,-.002,z+.01],m.dark);
 // Clearly continuous pedestrian aisle, ending before the extraction corridor.
 for(const x of [2.85,4.15])box(site,[x,-.001,-4.5],[x+.045,.002,1.25],m.yellow);
 for(let z=-4.4;z<1.05;z+=.6){box(site,[3.46,-.001,z],[3.49,.002,z+.25],m.cabinet);box(site,[3.8,-.001,z],[3.83,.002,z+.25],m.cabinet);}
 // Bollards protect cabinet corners; additional cable routes terminate at equipment.
 for(const [x,z] of [[6.2,.2],[7.2,.2],[6.2,1.2],[7.2,1.2]]){pipe(site,[x,.03,z],[x,.85,z],.045,m.yellow,12);ring(site,[x,.62,z],.046,.018,m.iron);}
 for(const z of [8.9,9.3]){box(site,[-4.2,2.1,z],[10.5,2.18,z+.20],m.rack);for(let x=-4.2;x<10.5;x+=.20)box(site,[x,2.18,z],[x+.025,2.25,z+.20],m.zinc);}
 const signs=group('unit-wayfinding');
 for(const x of [2.7,4.4])pipe(signs,[x,0,-3.8],[x,2.25,-3.8],.035,m.rack,12);
 box(signs,[2.65,1.7,-3.81],[4.45,2.2,-3.76],m.rack);
 signs.userData.labels=[{text:'UNIT 04 / PUMP BAY',position:[3.55,1.98,-3.825],size:[1.65,.23,0]}];
 return root;
}

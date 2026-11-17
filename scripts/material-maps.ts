import {deflateSync} from 'node:zlib';
/** Original deterministic periodic material bakes. No downloaded imagery or vendor textures. */
export const MAP_SIZE=256;
export const materialProfiles=[
 {id:'cast',names:['Pump / petrol enamel','Cast iron / unpainted','Extraction rig / black enamel','Scaffold identification paint'],noise:.08,rough:.15,bump:.055},
 {id:'steel',names:['Machined stainless steel'],noise:.025,rough:.20,bump:.035},
 {id:'zinc',names:['Galvanized scaffold','Plant / weathered pipe','Plant / structural steel','Plant / control cabinet'],noise:.15,rough:.18,bump:.055},
 {id:'concrete',names:['Concrete foundation'],noise:.24,rough:.15,bump:.11},
 {id:'rubber',names:['Seal elastomer'],noise:.04,rough:.15,bump:.035},
];
function crc32(bytes:Uint8Array){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function chunk(type:string,data:Buffer){const name=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([length,name,data,crc]);}
export function encodePng(size:number,pixels:Uint8Array){
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=2;
 const rows=Buffer.alloc(size*(size*3+1));for(let y=0;y<size;y++)rows.set(pixels.subarray(y*size*3,(y+1)*size*3),y*(size*3+1)+1);
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
function hash(x:number,y:number,seed:number){let n=Math.imul(x+seed,374761393)^Math.imul(y+seed,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/0xffffffff;}
function noise(x:number,y:number,cells:number,seed:number){const a=x*cells,b=y*cells,ix=Math.floor(a),iy=Math.floor(b);const ease=(v:number)=>v*v*(3-2*v),u=ease(a-ix),v=ease(b-iy),get=(i:number,j:number)=>hash((i+cells)%cells,(j+cells)%cells,seed);return (get(ix,iy)*(1-u)+get(ix+1,iy)*u)*(1-v)+(get(ix,iy+1)*(1-u)+get(ix+1,iy+1)*u)*v;}
const byte=(v:number)=>Math.round(Math.min(1,Math.max(0,v))*255);
export function bakeMaterial(profile:typeof materialProfiles[number]){
 const n=MAP_SIZE,height=new Float32Array(n*n),color=new Uint8Array(n*n*3),normal=new Uint8Array(n*n*3),orm=new Uint8Array(n*n*3);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const u=x/n,v=y/n,fine=noise(u,v,128,11),broad=noise(u,v,16,3);
  const machining=.5+.5*Math.sin(v*Math.PI*2*96+noise(u,v,8,17)*.9);
  const flake=noise(u,v,32,29)>.56?.8:.25;
  const h=profile.id==='steel'?machining*.65+fine*.35:profile.id==='zinc'?flake*.55+fine*.45:broad*.25+fine*.75;
  height[y*n+x]=h;const gray=1-profile.noise*(profile.id==='concrete'?.15+.55*noise(u,v,8,61)+.3*fine:.2+.8*h);
  for(let c=0;c<3;c++){const age=profile.id==='zinc'?Math.max(0,noise(u,v,6,41)-.60)*.65:0;color[(y*n+x)*3+c]=byte(gray-age*[.10,.48,.65][c]);}
  orm[(y*n+x)*3]=255;orm[(y*n+x)*3+1]=byte(1-profile.rough*(profile.id==='steel'?machining:h));orm[(y*n+x)*3+2]=255;
 }
 const at=(x:number,y:number)=>height[((y+n)%n)*n+(x+n)%n];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const dx=(at(x+1,y)-at(x-1,y))*profile.bump,dy=(at(x,y+1)-at(x,y-1))*profile.bump,len=Math.hypot(dx,dy,1),i=(y*n+x)*3;normal[i]=byte(.5-dx/len*.5);normal[i+1]=byte(.5-dy/len*.5);normal[i+2]=byte(.5+1/len*.5);}
 return {color:encodePng(n,color),normal:encodePng(n,normal),orm:encodePng(n,orm)};
}

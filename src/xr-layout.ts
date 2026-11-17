export type Control={label:string;displayLabel?:string;run:()=>void;enabled:boolean;slot?:boolean;paired?:boolean};
export type ControlRect={x:number;y:number;width:number;height:number};
export type PlacedControl=Control&{rect:ControlRect};
/** Eight content rows; eight schedule slots occupy an atomic two-by-four block. */
export function layoutControls(controls:Control[],requestedPage:number,onPage:(page:number)=>void){
 const pages:PlacedControl[][]=[[]],pageByLabel=new Map<string,number>();let row=0;
 for(let i=0;i<controls.length;){const grid=controls[i].slot===true,paired=controls[i].paired===true,block=grid?controls.slice(i,i+8):paired?controls.slice(i,i+2):[controls[i]],span=grid?2:1;
  if(paired&&(block.length!==2||block.some(c=>!c.paired)))throw Error('Paired actions require two consecutive controls');
  if(grid&&(block.length!==8||block.some(c=>!c.slot)))throw Error('A schedule grid requires eight consecutive slots');
  if(row+span>8){pages.push([]);row=0;}const page=pages.length-1;
  block.forEach((control,k)=>{const rect=grid?{x:25+k%4*246,y:340+(row+Math.floor(k/4))*110,width:236,height:96}:paired?{x:25+k*492,y:340+row*110,width:482,height:96}:{x:25,y:340+row*110,width:974,height:96};pages[page].push({...control,rect});pageByLabel.set(control.label,page);});row+=span;i+=block.length;
 }
 const page=Math.min(pages.length-1,Math.max(0,requestedPage)),placed=[...pages[page]];
 for(const [label,target,enabled,index] of [['PREVIOUS',page-1,page>0,8],['NEXT',page+1,page<pages.length-1,9]] as const)placed.push({label:`${label} / ${page+1} OF ${pages.length}`,enabled,run:()=>onPage(target),rect:{x:25,y:340+index*110,width:974,height:96}});
 return {placed,page,pages:pages.length,pageByLabel};
}
export function controlAt(controls:PlacedControl[],x:number,y:number){return controls.find(c=>x>=c.rect.x&&x<=c.rect.x+c.rect.width&&y>=c.rect.y&&y<=c.rect.y+c.rect.height)??null;}

import {clock,type Result} from './evaluator';import type {Control} from './xr-layout';import type {View} from './session';
export function inspectionView(caseId:string,progress:number):View{return caseId==='bay-b'?'clearance':progress===1?'pump':'contact';}
export function acceptanceLabel(start:number,original:number){return start===original?'RETAIN ORIGINAL SCHEDULE':'USE THIS PLAN';}
export function issueLines(result:Result){return result.issues.map(i=>i.code==='INSPECTION_ACCESS'?`Inspection needs its platform until ${clock(result.windows['INS-01'].finish).slice(0,5)}.`:i.code==='SHARED_ZONE'?'Scaffold and mechanical crews need the same bay.':i.code==='PATH_BLOCKED'?`Bearing housing meets the brace at ${clock(i.time)}.`:`Handover due ${clock(result.deadline).slice(0,5)} would be missed.`);}
export function alternativeControls(results:Result[],choose:(start:number)=>void,inspect:(start:number)=>void):Control[]{return results.map(r=>({label:(r.feasible?'CHOOSE ':'EVIDENCE ')+clock(r.start).slice(0,5),displayLabel:clock(r.start).slice(0,5)+(r.feasible?' ✓':' ×'),slot:true,enabled:true,run:()=>r.feasible?choose(r.start):inspect(r.start)}));}
export function fitText(text:string,width:number,height:number,measure:(font:number,text:string)=>number){
 for(let font=38;font>=22;font-=2){const lines:{text:string;y:number}[]=[];let y=font;const lineHeight=font*1.25;for(const paragraph of text.split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const next=line?line+' '+word:word;if(line&&measure(font,next)>width){lines.push({text:line,y});y+=lineHeight;line=word;}else line=next;}lines.push({text:line,y});y+=lineHeight+8;}if(lines.at(-1)!.y<=height)return {font,lines};}
 throw Error('Briefing text exceeds the available spatial reading area');
}

/** Limit the world-space callout to 22% of the view and keep it inside the viewport. */
export function contactAnnotationLayout(x:number,y:number,depth:number,projectionX:number,projectionY:number,reading:boolean){
 const width=Math.min(.38,.44*Math.max(0,depth)/projectionX),height=width/6,halfX=width*projectionX/Math.max(depth,.001)/2,halfY=height*projectionY/Math.max(depth,.001)/2;
 return {width,height,visible:!reading&&depth>.05&&Math.abs(x)+halfX<.95&&Math.abs(y)+halfY<.95};
}

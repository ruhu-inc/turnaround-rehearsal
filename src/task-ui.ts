import type {Control} from './xr-layout';
export type GripState='idle'|'ready'|'held'|'released';
export type CoachingInput={locked:boolean;view?:'table'|'contact'|'clearance'|'inspection'|'pump';needsResume?:boolean;playing:boolean;progress:number;contactProgress?:number;grip:GripState;evidence:boolean};
export function coachingCue(v:CoachingInput){
 if(v.evidence)return {id:'evidence',title:'READ-ONLY EVIDENCE',text:'Inspect the finding, then return to review.',tone:'neutral'};
 if(v.locked)return {id:'predict',title:'LOOK BEFORE TESTING',text:'Inspect the route and make your prediction.',tone:'neutral'};
 if(v.needsResume)return {id:'resume',title:'TRACKING PAUSED',text:'Choose Resume before continuing the pull.',tone:'neutral'};
 if(v.view==='clearance')return {id:'clearance',title:'INSPECT THE 250 MM GAP',text:'Compare the backplate and offset brace.',tone:'teal'};
 if(v.view==='contact'&&!(v.contactProgress!==undefined&&v.progress>=v.contactProgress))return {id:'inspect',title:'INSPECT THE CONTACT REGION',text:'Return to the table before testing the pull.',tone:'neutral'};
 const stopped=v.contactProgress!==undefined&&v.progress>=v.contactProgress;
 if(stopped)return {id:'contact',title:v.grip==='held'?'STOPPED AT THE BRACE':'INSPECT THE OBSTRUCTION',text:v.grip==='held'?'Release your pinch. The assembly cannot pass.':'Inspect the contact, then return to planning.',tone:'amber'};
 if(v.progress===1)return {id:'complete',title:'CARRIER AT END STOP',text:'Inspect the supported service position.',tone:'teal'};
 if(v.playing)return {id:'playback',title:'WATCH THE WITHDRAWAL',text:'Follow the assembly along the rail.',tone:'neutral'};
 if(v.grip==='held')return {id:'held',title:'GRIP HELD · PULL ALONG THE RAIL',text:'Keep your pinch closed as you move.',tone:'teal'};
 if(v.grip==='released')return {id:'released',title:'GRIP RELEASED',text:'Pinch the handle again to continue.',tone:'neutral'};
 return {id:'pinch',title:v.grip==='ready'?'READY TO PINCH':'PINCH THE YELLOW HANDLE',text:'Bring thumb and index finger to the ring.',tone:'amber'};
}
/** Physical pixel density is fixed across large planning panels and compact task cards. */
export const PANEL_METRES_PER_PIXEL=.5/1024;
export function panelLocalPoint(x:number,y:number,canvasHeight=1792){return {x:(x-512)*PANEL_METRES_PER_PIXEL,y:(canvasHeight/2-y)*PANEL_METRES_PER_PIXEL,z:0};}
export function panelUV(x:number,y:number,canvasHeight=1792){return {u:x/.5+.5,v:1-(canvasHeight/2-y/PANEL_METRES_PER_PIXEL)/1792};}
export function compactTaskControls(all:Control[],evidence:boolean,returnPlanning:()=>void,openTools:()=>void,playing=false){
 const out:Control[]=[],get=(s:string)=>all.find(c=>c.label.startsWith(s));
 const pair=(a:Control|undefined,b:Control|undefined)=>{if(a&&b)out.push({...a,paired:true},{...b,paired:true});else if(a||b)out.push((a??b)!);};
 if(evidence){pair(get('RETURN TO REVIEW'),get('GUIDE'));pair(get('INSPECT AT FULL SIZE')??get('RETURN TO TABLE'),get('PLAY PULL'));pair(get('JUMP TO ISSUE'),{label:'MORE TOOLS',enabled:true,run:openTools});}
 else{pair(get('INSPECT AT FULL SIZE')??get('RETURN TO TABLE'),get('READ CONTACT EVIDENCE'));pair(get('RESUME')??get(playing?'PAUSE':'PLAY PULL'),get('GUIDE'));pair({label:'RETURN TO PLANNING',enabled:true,run:returnPlanning},{label:'MORE TOOLS',enabled:true,run:openTools});}
 return out;
}

/** A paused evidence snapshot has no active replay speed. */
export function clockModeLabel(evidence:boolean,playing:boolean,rate:number){return evidence&&!playing?'READ-ONLY EVIDENCE':rate+'x REHEARSAL';}

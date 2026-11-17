import type {Control} from './xr-layout';
export type NavigationMenu='main'|'cases'|'tools'|'settings';
/** Routes only presentation controls; plan actions remain the original callbacks. */
export function navigationPath(label:string):string[]{
 if(['EAST BAY','WEST BAY','INSPECTION UPDATE'].some(s=>label.startsWith(s)))return ['CASES'];
 if(['SOUND','SPEED','ROTATE','RECENTER','RESET','PLANT OVERVIEW','ORIGINAL EVIDENCE','ACCEPTED PULL'].some(s=>label.startsWith(s)))return ['MORE TOOLS','VIEW & SETTINGS'];
 return ['MORE TOOLS'];
}
export function navigationControls(all:Control[],menu:NavigationMenu,open:(menu:NavigationMenu)=>void,playing:boolean){
 const result:Control[]=[];const get=(prefix:string)=>all.find(c=>c.label.startsWith(prefix));
 const add=(prefix:string)=>{const c=get(prefix);if(c)result.push(c);};
 const pair=(a:Control|undefined,b:Control|undefined)=>{if(a&&b)result.push({...a,paired:true},{...b,paired:true});else if(a||b)result.push((a??b)!);};
 const link=(label:string,to:NavigationMenu):Control=>({label,enabled:true,run:()=>open(to)});
 const back=()=>result.push(link('RETURN TO REHEARSAL','main'));
 if(menu==='cases'){back();pair(get('EAST BAY'),get('WEST BAY'));add('INSPECTION UPDATE');return result;}
 if(menu==='settings'){result.push(link('BACK TO TOOLS','tools'));pair(get('ROTATE TABLE'),get('RECENTER TABLE'));pair(get('SPEED'),get('SOUND'));add('PLANT OVERVIEW');pair(get('ORIGINAL EVIDENCE'),get('ACCEPTED PULL'));add('RESET CASE');return result;}
 if(menu==='tools'){back();pair(get('SELECT INS-01'),get('SELECT SCA-02'));pair(get('SELECT PMP-03'),get('READ SELECTED'));add('REPLAY SHIFT');pair(get('SHIFT -15'),get('SHIFT +15'));pair(get('EARLIER SCA-02'),get('LATER SCA-02'));add('UNDO');result.push(link('VIEW & SETTINGS','settings'));return result;}
 if(get('RETURN TO REVIEW')){pair(get('RETURN TO REVIEW'),get('GUIDE'));pair(get('INSPECT AT FULL SIZE')??get('RETURN TO TABLE'),get('PLAY PULL'));add('JUMP TO ISSUE');result.push(link('MORE TOOLS','tools'));return result;}
 if(get('PREDICT: CLEAR')){pair(get('PREDICT: CLEAR'),get('PREDICT: BLOCKED'));pair(get('ROTATE TABLE'),get('GUIDE'));pair(link('CASES','cases'),link('MORE TOOLS','tools'));return result;}
 pair(get('TRY THE PULL'),get(playing?'PAUSE':'PLAY PULL'));add('RESUME');pair(get('READ HANDOFF'),get('GUIDE'));pair(get('CHECK PLAN'),get('READ HANDOFF')?undefined:get('CONFIRM HOLD')??get('USE THIS PLAN')??get('RETAIN ORIGINAL SCHEDULE'));result.push(...all.filter(c=>c.slot));pair(get('INSPECT AT FULL SIZE')??get('RETURN TO TABLE'),get('READ CONTACT EVIDENCE')??get('JUMP TO ISSUE'));pair(link('CASES','cases'),link('MORE TOOLS','tools'));return result;
}

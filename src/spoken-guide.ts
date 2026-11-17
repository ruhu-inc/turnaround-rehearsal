import {guidanceKey,guidanceText,type GuidanceRequest} from './guidance';
export type VoiceState={enabled:boolean;status:'off'|'loading'|'speaking'|'ready'|'unavailable';caption:string;source:'OpenAI live speech'|'OpenAI replay'|null};
/** No credentials or microphone access. Cancelled state can never enqueue old audio. */
export class SpokenGuide{
 state:VoiceState={enabled:false,status:'off',caption:'',source:null};
 private context:AudioContext|null=null;private request:AbortController|null=null;private generation=0;private key='';private input:GuidanceRequest|null=null;private nextTime=0;private active=new Set<AudioBufferSourceNode>();private cache=new Map<string,string[]>();private doneTimer:ReturnType<typeof setTimeout>|undefined;
 constructor(private changed:(state:VoiceState)=>void){}
 async toggle(){if(this.state.enabled){this.disable();return;}try{this.context??=new AudioContext();await this.context.resume();if(this.context.state!=='running')throw Error();this.state.enabled=true;this.key='';this.publish();if(this.input)this.update(this.input);}catch{this.state.status='unavailable';this.publish();}}
 disable(){this.state.enabled=false;this.cancel();this.state.status='off';this.state.caption='';this.state.source=null;this.key='';this.publish();}
 update(input:GuidanceRequest){this.input=input;if(!this.state.enabled)return;const key=guidanceKey(input);if(key===this.key)return;this.key=key;this.cancel();this.state.caption=guidanceText(input);this.state.status='loading';this.state.source='OpenAI live speech';this.publish();const generation=this.generation;void this.speak(input,key,generation);}
 private cancel(){this.generation++;this.request?.abort();this.request=null;clearTimeout(this.doneTimer);for(const source of this.active){try{source.stop();}catch{}source.disconnect();}this.active.clear();this.nextTime=this.context?.currentTime??0;}
 private publish(){this.changed({...this.state});}
 private enqueue(base64:string,generation:number){if(generation!==this.generation||!this.state.enabled||!this.context)return;const binary=atob(base64),samples=Math.floor(binary.length/2);if(!samples)return;const buffer=this.context.createBuffer(1,samples,24000),data=buffer.getChannelData(0);for(let i=0;i<samples;i++){const v=binary.charCodeAt(i*2)|(binary.charCodeAt(i*2+1)<<8);data[i]=(v>=32768?v-65536:v)/32768;}const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.context.destination);const at=Math.max(this.context.currentTime+.05,this.nextTime);source.start(at);this.nextTime=at+buffer.duration;this.active.add(source);source.onended=()=>{this.active.delete(source);source.disconnect();};if(this.state.status!=='speaking'){this.state.status='speaking';this.publish();}}
 private async speak(input:GuidanceRequest,key:string,generation:number){
  const chunks:string[]=[];
  try{
   const cached=this.cache.get(key);if(cached){this.state.source='OpenAI replay';for(const chunk of cached)this.enqueue(chunk,generation);}
   else{
    const controller=this.request=new AbortController();const send=()=>fetch('/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:controller.signal});let response=await send();
    if(response.status===429){await new Promise<void>((resolve,reject)=>{const timer=setTimeout(resolve,1000);controller.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));},{once:true});});response=await send();}
    if(!response.ok||!response.body)throw Error('Voice unavailable');
    const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',complete=false;
    while(true){const {value,done}=await reader.read();pending+=decoder.decode(value,{stream:!done});const lines=pending.split('\n');pending=lines.pop()??'';for(const line of lines){if(!line.trim())continue;const e=JSON.parse(line);if(e.type==='audio'){chunks.push(e.delta);this.enqueue(e.delta,generation);}if(e.type==='done')complete=true;if(e.type==='error')throw Error('Voice unavailable');}if(done)break;}
    if(!complete)throw Error('Speech interrupted');if(generation===this.generation){this.cache.set(key,chunks);if(this.cache.size>24)this.cache.delete(this.cache.keys().next().value!);}
   }
   if(generation!==this.generation)return;this.doneTimer=setTimeout(()=>{if(generation!==this.generation)return;this.state.status='ready';this.publish();},Math.max(0,((this.nextTime-(this.context?.currentTime??0))*1000))+250);
  }catch(error){if(generation!==this.generation)return;this.cancel();this.state.status='unavailable';this.state.source=null;this.publish();}
 }
}

import {guidanceText,validGuidanceRequest} from '../src/guidance';
// @ts-expect-error Shared ESM runs in Node and Workers without an SDK or client credential.
import {speakRealtime} from './realtime.mjs';
export type ConnectSpeech=(url:string,key:string)=>Promise<unknown>;
const buckets=new Map<string,{minute:number;hour:number;minuteCount:number;hourCount:number;active:boolean}>();
export function resetSpeechLimits(){buckets.clear();}
export async function speechResponse(request:Request,apiKey:string|undefined,connect:ConnectSpeech,identity:string,now=Date.now(),reserve?:()=>Promise<boolean>){
 const json=(message:string,status:number)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return json('Use POST',405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return json('Same-origin requests only',403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json('JSON required',415);
 if(!apiKey)return json('Spoken guidance is unavailable. Read the guidance caption.',503);
 if(Number(request.headers.get('content-length'))>1024)return json('Request too large',413);
 let value:unknown;try{const reader=request.body?.getReader();if(!reader)return json('Guidance required',400);let length=0,text='';const decoder=new TextDecoder();while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>1024){await reader.cancel();return json('Request too large',413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();value=JSON.parse(text);}catch{return json('Invalid guidance',400);}
 if(!validGuidanceRequest(value))return json('Unsupported guidance state',400);
 const minute=Math.floor(now/60000),hour=Math.floor(now/3600000),b=buckets.get(identity)??{minute,hour,minuteCount:0,hourCount:0,active:false};
 if(b.minute!==minute){b.minute=minute;b.minuteCount=0;}if(b.hour!==hour){b.hour=hour;b.hourCount=0;}
 if(b.active||b.minuteCount>=12||b.hourCount>=80)return json('Voice limit reached. Read the guidance caption.',429);
 b.active=true;b.minuteCount++;b.hourCount++;buckets.set(identity,b);
 try{if(reserve&&!await reserve()){b.active=false;return json('Voice limit reached. Read the guidance caption.',429);}}
 catch{b.active=false;return json('Spoken guidance is unavailable. Read the guidance caption.',503);}
 if(buckets.size>1000)for(const [key,bucket] of buckets)if(!bucket.active&&bucket.hour<hour)buckets.delete(key);
 const cancellation=new AbortController();request.signal.addEventListener('abort',()=>cancellation.abort(),{once:true});
 const encoder=new TextEncoder();let closed=false;
 const stream=new ReadableStream<Uint8Array>({start(controller){
  const emit=(data:unknown)=>{if(!closed)controller.enqueue(encoder.encode(JSON.stringify(data)+'\n'));};
  void speakRealtime({text:guidanceText(value),apiKey,connect,signal:cancellation.signal,onAudio:(delta:string)=>emit({type:'audio',delta})}).then((result:unknown)=>emit({type:'done',result})).catch(()=>emit({type:'error',message:'Voice unavailable. Read the guidance caption.'})).finally(()=>{b.active=false;if(!closed){closed=true;controller.close();}});
 },cancel(){closed=true;cancellation.abort();}});
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}

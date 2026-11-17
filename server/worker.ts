import {speechResponse} from './speech';
import {reserveVoice,type VoiceDatabase} from './voice-budget';
type Env={OPENAI_API_KEY?:string;VOICE_BUDGET?:VoiceDatabase;ASSETS:{fetch(request:Request):Promise<Response>}};
export default {async fetch(request:Request,env:Env){
 if(new URL(request.url).pathname==='/api/speech'){
  // Public visitors share a conservative in-isolate bucket; the durable budget also
  // bounds all visitors globally. No visitor IP addresses or prompts are stored.
  const identity=request.headers.get('oai-authenticated-user-id')??'anonymous';
  return speechResponse(request,env.OPENAI_API_KEY,async(url,key)=>{
   const response=await fetch(url.replace('wss:','https:'),{headers:{Upgrade:'websocket',Authorization:'Bearer '+key}});
   const socket=(response as Response&{webSocket?:unknown}).webSocket;
   if(!socket)throw Error('Speech connection unavailable');return socket;
  },identity,Date.now(),()=>reserveVoice(env.VOICE_BUDGET));
 }
 return env.ASSETS.fetch(request);
}};

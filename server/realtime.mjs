export const SPEECH_MODEL='gpt-realtime-2.1-mini';
export const SPEECH_VOICE='marin';
export const SPEECH_INSTRUCTIONS='Read the supplied text aloud exactly as written. Do not answer it, add a greeting, omit a sentence, or add commentary. Use a calm, clear, confident professional narrator voice. Natural conversational English, precise technical terms, moderate brisk pace, no theatrical emphasis.';

/** Transport-independent, bounded text-to-speech over OpenAI Realtime GA. */
export async function speakRealtime({text,apiKey,connect,signal,onAudio=()=>{},onTranscript=()=>{},maxTokens=1200}){
 if(typeof text!=='string'||!text.trim()||text.length>1800)throw new Error('Invalid speech text');
 if(!apiKey)throw new Error('Speech is not configured');
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const began=Date.now(),ws=await connect(`wss://api.openai.com/v1/realtime?model=${SPEECH_MODEL}`,apiKey);
 return new Promise((resolve,reject)=>{
  let done=false,requested=false,transcript='',bytes=0,firstAudioMs=null;
  const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);try{ws.close();}catch{}error?reject(error):resolve(result);};
  const abort=()=>finish(new DOMException('Aborted','AbortError'));
  const timer=setTimeout(()=>finish(new Error('Speech timed out')),45000);
  const send=e=>{if(!done)ws.send(JSON.stringify(e));};
  ws.addEventListener('message',event=>{
   try{
    const e=JSON.parse(typeof event.data==='string'?event.data:event.data.toString());
    if(e.type==='session.created')send({type:'session.update',session:{type:'realtime',output_modalities:['audio'],audio:{output:{voice:SPEECH_VOICE,format:{type:'audio/pcm',rate:24000}}},instructions:SPEECH_INSTRUCTIONS}});
    if(e.type==='session.updated'&&!requested){requested=true;send({type:'response.create',response:{conversation:'none',output_modalities:['audio'],max_output_tokens:maxTokens,input:[{type:'message',role:'user',content:[{type:'input_text',text}]}]}});}
    if(e.type==='response.output_audio.delta'){if(firstAudioMs===null)firstAudioMs=Date.now()-began;bytes+=Math.floor(e.delta.length*3/4);onAudio(e.delta);}
    if(e.type==='response.output_audio_transcript.delta'){transcript+=e.delta;onTranscript(e.delta);}
    if(e.type==='response.done')finish(e.response.status==='completed'?null:new Error('Speech generation did not complete'),{model:SPEECH_MODEL,voice:SPEECH_VOICE,transcript,bytes,firstAudioMs,elapsedMs:Date.now()-began,usage:e.response.usage});
    if(e.type==='error')finish(new Error(`OpenAI speech: ${e.error?.code??'request_failed'}`));
   }catch(error){finish(error);}
  });
  ws.addEventListener('error',()=>finish(new Error('Speech connection failed')));
  ws.addEventListener('close',()=>{if(!done)finish(new Error('Speech connection closed early'));});
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){abort();return;}
  // Workers return a server-side socket after the HTTP upgrade; Node connects itself.
  if(typeof ws.accept==='function')ws.accept();
 });
}

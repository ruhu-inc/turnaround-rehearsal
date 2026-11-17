/** Original quiet synthetic carrier/contact cues. The fictional pump is shut down. */
export class RehearsalSound {
 enabled=false;private context:AudioContext|null=null;private carrier:GainNode|null=null;
 async toggle(){
  if(this.enabled){this.enabled=false;this.stop();return;}
  try{
   if(!this.context){const context=this.context=new AudioContext(),buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);let seed=193;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/4294967296*2-1)*.5;}const source=context.createBufferSource(),filter=context.createBiquadFilter();source.buffer=buffer;source.loop=true;filter.type='bandpass';filter.frequency.value=460;filter.Q.value=.7;this.carrier=context.createGain();this.carrier.gain.value=0;source.connect(filter).connect(this.carrier).connect(context.destination);source.start();}
   await this.context.resume();this.enabled=this.context.state==='running';
  }catch{this.enabled=false;}
 }
 motion(moving:boolean){if(!this.context||!this.carrier)return;this.carrier.gain.setTargetAtTime(this.enabled&&moving?.018:0,this.context.currentTime,.025);}
 contact(){const c=this.context;if(!this.enabled||!c||c.state!=='running')return;const oscillator=c.createOscillator(),gain=c.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(530,c.currentTime);oscillator.frequency.exponentialRampToValueAtTime(190,c.currentTime+.12);gain.gain.setValueAtTime(.022,c.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.16);oscillator.connect(gain).connect(c.destination);oscillator.start();oscillator.stop(c.currentTime+.18);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};}
 stop(){if(!this.context||!this.carrier)return;this.carrier.gain.cancelScheduledValues(this.context.currentTime);this.carrier.gain.setValueAtTime(0,this.context.currentTime);}
}

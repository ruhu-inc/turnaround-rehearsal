export type PerformanceSummary={source:string;durationSeconds:number;frames:number;meanFps:number;meanFrameMs:number;p95FrameMs:number;worstFrameMs:number;framesOver16ms:number;peakDrawCalls:number;peakTriangles:number;interruptions:string[];physicalHeadset:boolean;completeFiveMinutes:boolean};
/** CPU-side rendered-frame cadence and renderer counters, not a GPU timer or headset certification. */
export class FrameMetrics {
 private started:number|null=null;private previous:number|null=null;private samples:number[]=[];private draws=0;private triangles=0;private interruptions:string[]=[];
 active=false;source='';
 start(source:string){this.started=null;this.previous=null;this.samples=[];this.draws=this.triangles=0;this.interruptions=[];this.source=source;this.active=true;}
 frame(timestampMs:number,drawCalls:number,triangles:number){
  if(!this.active||!Number.isFinite(timestampMs))return;
  if(this.started===null)this.started=timestampMs;
  if(this.previous!==null&&timestampMs>this.previous)this.samples.push(timestampMs-this.previous);
  this.previous=timestampMs;this.draws=Math.max(this.draws,drawCalls);this.triangles=Math.max(this.triangles,triangles);
 }
 interrupt(reason:string){if(this.active&&!this.interruptions.includes(reason))this.interruptions.push(reason);}
 stop(){this.active=false;return this.summary();}
 summary():PerformanceSummary {
  const elapsed=this.started===null||this.previous===null?0:(this.previous-this.started)/1000,sorted=[...this.samples].sort((a,b)=>a-b),n=sorted.length;
  return {source:this.source,durationSeconds:elapsed,frames:n,meanFps:elapsed?n/elapsed:0,meanFrameMs:n?elapsed*1000/n:0,p95FrameMs:n?sorted[Math.ceil(.95*n)-1]:0,worstFrameMs:n?sorted[n-1]:0,framesOver16ms:sorted.filter(t=>t>1000/60).length,peakDrawCalls:this.draws,peakTriangles:this.triangles,interruptions:[...this.interruptions],physicalHeadset:false,completeFiveMinutes:elapsed>=300&&this.interruptions.length===0};
 }
}

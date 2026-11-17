export type Hand = 'left'|'right';
export type Point = {x:number;y:number;z:number};
export type InteractionTarget = {
 id:string;kind:'button'|'grab';enabled:boolean;
 begin?:(point:Point)=>void;move?:(point:Point)=>void;
 commit:()=>void;cancel:()=>void;
};
/** One owner from pinch-down to release. No second hand can steal a gesture. */
export class PointerCapture {
 private active:{hand:Hand;target:InteractionTarget}|null=null;
 get owner(){return this.active?.hand??null;}
 get kind(){return this.active?.target.kind??null;}
 begin(hand:Hand,target:InteractionTarget|null,point:Point){
  if(this.active||!target?.enabled)return false;
  this.active={hand,target};target.begin?.(point);return true;
 }
 move(hand:Hand,point:Point){if(this.active?.hand===hand)this.active.target.move?.(point);}
 release(hand:Hand,hoverId:string|null){
  if(this.active?.hand!==hand)return false;
  const {target}=this.active;this.active=null;
  if(target.kind==='grab'||target.id===hoverId)target.commit();else target.cancel();return true;
 }
 cancel(hand?:Hand){if(this.active&&(!hand||this.active.hand===hand)){const {target}=this.active;this.active=null;target.cancel();}}
}

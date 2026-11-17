import * as T from 'three';
import {coachingCue,type CoachingInput} from './task-ui';
/** A small object-local hint. It never moves the equipment or changes a plan. */
export class ContextCoach{
 readonly sprite:T.Sprite;private canvas=document.createElement('canvas');private ctx:CanvasRenderingContext2D;private texture:T.CanvasTexture;private key='';
 private anchor=new T.Vector3();private local=new T.Vector3();private projected=new T.Vector3();
 constructor(scene:T.Scene){this.canvas.width=1024;this.canvas.height=224;this.ctx=this.canvas.getContext('2d')!;this.texture=new T.CanvasTexture(this.canvas);this.texture.colorSpace=T.SRGBColorSpace;this.sprite=new T.Sprite(new T.SpriteMaterial({map:this.texture,depthTest:false,depthWrite:false,toneMapped:false}));this.sprite.name='contextual-coaching';this.sprite.visible=false;this.sprite.renderOrder=1100;this.sprite.raycast=()=>{};scene.add(this.sprite);}
 update(input:CoachingInput,handle:T.Object3D,camera:T.Camera,visible:boolean){
  const cue=coachingCue(input);const el=document.querySelector<HTMLElement>('#task-coach');if(el){if(el.hidden===visible)el.hidden=!visible;if(el.dataset.stage!==cue.id)el.dataset.stage=cue.id;if(el.dataset.key!==cue.title+cue.text){el.dataset.key=cue.title+cue.text;el.replaceChildren();const title=document.createElement('strong'),body=document.createElement('span');title.textContent=cue.title;body.textContent=cue.text;el.append(title,body);}}
  this.sprite.visible=visible;if(!visible)return;
  if(this.key!==cue.title+cue.text){this.key=cue.title+cue.text;const c=this.ctx;c.clearRect(0,0,1024,224);c.fillStyle='#13252f';c.fillRect(0,0,1024,224);c.fillStyle=cue.tone==='teal'?'#9ae5ce':'#ecd18a';c.fillRect(0,0,8,224);c.font='bold 43px sans-serif';c.fillText(cue.title,28,79);c.fillStyle='#e9f1f0';c.font='34px sans-serif';c.fillText(cue.text,28,145);this.texture.needsUpdate=true;}
  handle.getWorldPosition(this.anchor);this.anchor.y-=.12;camera.updateMatrixWorld(true);this.local.copy(this.anchor).applyMatrix4(camera.matrixWorldInverse);this.projected.copy(this.anchor).project(camera);const depth=-this.local.z;
  const px=camera.projectionMatrix.elements[0],py=camera.projectionMatrix.elements[5],width=Math.min(.28,.46*Math.max(depth,0)/px),height=width*224/1024;
  this.sprite.visible=depth>.08&&Math.abs(this.projected.x)+width*px/depth/2<.96&&Math.abs(this.projected.y)+height*py/depth/2<.96;
  this.sprite.position.copy(this.anchor);this.sprite.scale.set(width,height,1);
 }
}

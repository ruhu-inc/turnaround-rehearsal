import * as T from 'three';
import {AnimatedHand} from '@iwsdk/core';

/** The SDK's skinned hand, driven by native joint transforms without an outline pass. */
export class RehearsalHandVisual extends AnimatedHand {
 static assetKeyPrefix='turnaround-shaded-hand';
 static assetProfileId='generic-hand';
 init(){
  this.model.name='tracked-shaded-hand';
  const material=new T.MeshStandardMaterial({color:0x506b78,roughness:.8,metalness:0,envMapIntensity:.2,depthTest:true,depthWrite:true});
  material.name='shaded-hand-surface';
  this.model.traverse(object=>{if(object instanceof T.SkinnedMesh){object.material=material;object.frustumCulled=false;object.renderOrder=0;object.castShadow=false;object.receiveShadow=false;object.raycast=()=>{};}});
 }
}

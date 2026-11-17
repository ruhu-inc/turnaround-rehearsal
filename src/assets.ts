import type {Group} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PUMP_ASSET_VERSION} from './model-version';
import {bindBay} from './model';
import {scenario} from './evaluator';
export function validatedBayRoot(scene:Group):Group {
 const root=scene.userData.fixtureVersion===scenario.scenarioVersion?scene:scene.children.find(n=>n.userData.fixtureVersion===scenario.scenarioVersion);
 if(!root)throw Error('Pump asset and scenario versions do not match. Rebuild the assets.');
 if(root.userData.assetVersion!==PUMP_ASSET_VERSION)throw Error('Pump asset revision does not match this release. Reload the page to fetch its current model.');
 return root as Group;
}
export async function loadBay(){
 const asset=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/pump-bay.glb?v=${PUMP_ASSET_VERSION}`);
 return bindBay(validatedBayRoot(asset.scene));
}

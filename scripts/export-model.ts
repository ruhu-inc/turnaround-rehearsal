import {writeFile,mkdir} from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {embedMaterialMaps} from './glb-materials';
import {createBay} from '../src/model';
// GLTFExporter uses the browser FileReader for its binary buffer. Node supplies Blob.arrayBuffer.
class BlobReader {
 result:ArrayBuffer|string|null=null;onloadend:(()=>void)|null=null;
 readAsArrayBuffer(blob:Blob){void blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}
 readAsDataURL(blob:Blob){void blob.arrayBuffer().then(result=>{this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;this.onloadend?.();});}
}
Object.defineProperty(globalThis,'FileReader',{value:BlobReader,configurable:true});
const model=createBay();model.group.updateMatrixWorld(true);
const data=await new GLTFExporter().parseAsync(model.group,{binary:true,onlyVisible:false});
if(!(data instanceof ArrayBuffer))throw Error('Expected binary GLB');
const textured=embedMaterialMaps(data);await mkdir('assets/materials',{recursive:true});for(const [name,bytes] of Object.entries(textured.maps))await writeFile('assets/materials/'+name,bytes);
await mkdir('public/assets',{recursive:true});await writeFile('public/assets/pump-bay.glb',textured.bytes);
console.log(`Original pump asset exported: ${(textured.bytes.byteLength/1024).toFixed(0)} KiB`);

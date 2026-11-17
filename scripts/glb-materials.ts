import {materialProfiles,bakeMaterial} from './material-maps';
/** Embed map bytes in the existing GLB. UVs are authored in metres, eight repeats/metre. */
export function embedMaterialMaps(input:ArrayBuffer){
 const source=Buffer.from(input),jsonLength=source.readUInt32LE(12),json=JSON.parse(source.subarray(20,20+jsonLength).toString()),binOffset=20+jsonLength,binLength=source.readUInt32LE(binOffset);
 const parts:Buffer[]=[source.subarray(binOffset+8,binOffset+8+binLength)];let offset=binLength;
 json.images??=[];json.textures??=[];json.samplers??=[];json.extensionsUsed??=[];
 if(!json.extensionsUsed.includes('KHR_texture_transform'))json.extensionsUsed.push('KHR_texture_transform');
 const sampler=json.samplers.length;json.samplers.push({magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497});
 const maps:Record<string,Buffer>={};
 for(const profile of materialProfiles){
  const bindings:Record<string,number>={};
  for(const [kind,png] of Object.entries(bakeMaterial(profile))){
   const pad=(4-offset%4)%4;if(pad){parts.push(Buffer.alloc(pad));offset+=pad;}
   const bufferView=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:png.length});parts.push(png);offset+=png.length;
   const image=json.images.length;json.images.push({name:profile.id+'-'+kind,mimeType:'image/png',bufferView});bindings[kind]=json.textures.length;json.textures.push({source:image,sampler});maps[profile.id+'-'+kind+'.png']=png;
  }
  const binding=(kind:string)=>({index:bindings[kind],extensions:{KHR_texture_transform:{scale:profile.id==='concrete'?[.65,.65]:[8,8]}}});
  for(const material of json.materials)if(profile.names.includes(material.name)){material.pbrMetallicRoughness.baseColorTexture=binding('color');material.pbrMetallicRoughness.metallicRoughnessTexture=binding('orm');material.normalTexture={...binding('normal'),scale:1};}
 }
 json.buffers[0].byteLength=offset;
 const jsonBytes=Buffer.from(JSON.stringify(json)),jsonPad=(4-jsonBytes.length%4)%4,jsonChunk=Buffer.concat([jsonBytes,Buffer.alloc(jsonPad,32)]),bin=Buffer.concat([...parts,Buffer.alloc((4-offset%4)%4)]),total=12+8+jsonChunk.length+8+bin.length;
 const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(total,8);header.writeUInt32LE(jsonChunk.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length);binHeader.writeUInt32LE(0x004e4942,4);
 return {bytes:Buffer.concat([header,jsonChunk,binHeader,bin]),maps};
}

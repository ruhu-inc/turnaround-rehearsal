import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {inflateSync} from 'node:zlib';
import {MAP_SIZE,materialProfiles,bakeMaterial} from '../scripts/material-maps';
test('original material bakes are deterministic, valid RGB PNGs with normal and roughness variation',()=>{
 for(const profile of materialProfiles){const a=bakeMaterial(profile),b=bakeMaterial(profile);for(const kind of ['color','normal','orm'] as const){assert.deepEqual(a[kind],b[kind]);const png=a[kind];assert.equal(png.readUInt32BE(16),MAP_SIZE);assert.equal(png.readUInt32BE(20),MAP_SIZE);assert.equal(png[25],2);const size=png.readUInt32BE(33),raw=inflateSync(png.subarray(41,41+size));assert.equal(raw.length,MAP_SIZE*(MAP_SIZE*3+1));const red=new Set<number>(),green=new Set<number>();for(let y=0;y<MAP_SIZE;y++)for(let x=0;x<MAP_SIZE;x++){red.add(raw[y*(MAP_SIZE*3+1)+1+x*3]);green.add(raw[y*(MAP_SIZE*3+1)+2+x*3]);}assert.ok(green.size>1,profile.id+' '+kind+' variation');}}
});
test('shipped GLB embeds every material map with metre-scale repeat bindings and no remote URI',async()=>{
 const bytes=await readFile('public/assets/pump-bay.glb'),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString());assert.equal(json.images.length,15);
 for(const image of json.images){assert.equal(image.mimeType,'image/png');assert.equal(image.uri,undefined);const view=json.bufferViews[image.bufferView],offset=20+length+8+view.byteOffset;assert.deepEqual([...bytes.subarray(offset,offset+8)],[137,80,78,71,13,10,26,10]);}
 for(const profile of materialProfiles)for(const name of profile.names){const m=json.materials.find((m:{name:string})=>m.name===name);assert.ok(m,name);assert.deepEqual(m.normalTexture.extensions.KHR_texture_transform.scale,profile.id==='concrete'?[.65,.65]:[8,8]);assert.ok(m.pbrMetallicRoughness.baseColorTexture);assert.ok(m.pbrMetallicRoughness.metallicRoughnessTexture);}
});

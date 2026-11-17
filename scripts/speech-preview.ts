import type {Plugin} from 'vite';
import {speechResponse} from '../server/speech';
import {createRequire} from 'node:module';
const WebSocket=createRequire(import.meta.url)('ws');
/** Loopback-only development adapter; never bundled into the published app. */
export function speechPreview():Plugin{return {name:'speech-preview',configureServer(server){
 server.middlewares.use('/api/speech',async(req,res)=>{
  if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??'')){res.writeHead(403).end();return;}
  try{const controller=new AbortController();res.on('close',()=>controller.abort());const url='http://'+req.headers.host+'/api/speech';if(!['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname)){res.writeHead(403).end();return;}let body='';for await(const c of req){body+=c;if(body.length>1024){res.writeHead(413).end();return;}}
   const response=await speechResponse(new Request(url,{method:req.method,headers:new Headers(Object.entries(req.headers).flatMap(([k,v])=>typeof v==='string'?[[k,v]]:[])),body:req.method==='POST'?body:undefined,signal:controller.signal}),process.env.OPENAI_API_KEY,async(url,key)=>new WebSocket(url,{headers:{Authorization:'Bearer '+key}}),'local-owner');
   const headers:Record<string,string>={};response.headers.forEach((value,key)=>headers[key]=value);res.writeHead(response.status,headers);if(response.body){const reader=response.body.getReader();while(true){const {value,done}=await reader.read();if(done)break;res.write(value);}}res.end();
  }catch{if(!res.headersSent)res.writeHead(503);res.end();}
 });
}};}

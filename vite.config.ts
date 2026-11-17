import {defineConfig,loadEnv} from 'vite';
import {speechPreview} from './scripts/speech-preview';
export default defineConfig(({mode,command})=>{if(command==='serve'){const values=loadEnv(mode,process.cwd(),'OPENAI_API_KEY');if(values.OPENAI_API_KEY)process.env.OPENAI_API_KEY=values.OPENAI_API_KEY;}return {base:'./',build:{outDir:'dist/client'},plugins:command==='serve'?[speechPreview()]:[]};});

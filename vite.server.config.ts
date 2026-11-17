import {defineConfig} from 'vite';
export default defineConfig({publicDir:false,build:{outDir:'dist/server',emptyOutDir:true,target:'es2022',lib:{entry:'server/worker.ts',formats:['es'],fileName:()=> 'index.js'},minify:true}});

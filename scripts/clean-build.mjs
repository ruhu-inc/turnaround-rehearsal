import {rm} from 'node:fs/promises';
// dist contains generated output only. Remove obsolete static-release files before a Worker build.
await rm(new URL('../dist/',import.meta.url),{recursive:true,force:true});

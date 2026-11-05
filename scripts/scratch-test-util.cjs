const fs=require('node:fs'),path=require('node:path');
function projectFile(){if(process.env.SCRATCH_PROJECT_PATH)return process.env.SCRATCH_PROJECT_PATH;return fs.readdirSync('.',{recursive:true}).filter(file=>String(file).endsWith('.sb3')&&!String(file).startsWith('output'+path.sep)).sort((a,b)=>fs.statSync(b).size-fs.statSync(a).size)[0];}
module.exports={projectFile};

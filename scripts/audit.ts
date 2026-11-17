import { appId,createRuntime } from './runtime.js';
const runtime=await createRuntime(appId(process.argv[2]));const result=await runtime.engine.verifyAudit();console.log(JSON.stringify(result,null,2));if(!result.valid)process.exitCode=1;

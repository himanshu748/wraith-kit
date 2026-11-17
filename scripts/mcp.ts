import { appId,createRuntime } from './runtime.js';
import { serveStdio } from '@wraith-kit/skeleton/mcp';
const runtime=await createRuntime(appId(process.argv[2]??'todo-afterlife'));
await serveStdio(runtime.app,runtime.engine);

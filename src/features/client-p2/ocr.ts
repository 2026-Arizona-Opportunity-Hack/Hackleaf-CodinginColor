import "server-only";
import { createWorker } from "tesseract.js";
import { join } from "node:path";
let busy=false;
export async function recognizeIntake(bytes:Uint8Array){if(busy)throw new Error("Another intake scan is running. Try again shortly.");busy=true;let worker:Awaited<ReturnType<typeof createWorker>>|undefined,timedOut=false;let timer:ReturnType<typeof setTimeout>|undefined;
 try{const task=(async()=>{const created=await createWorker('eng',1,{langPath:join(process.cwd(),'node_modules/@tesseract.js-data/eng/4.0.0_best_int'),cacheMethod:'none',gzip:true,logger:()=>{},errorHandler:()=>{}});worker=created;if(timedOut){await created.terminate();throw new Error('Scan timed out.');}const result=await created.recognize(Buffer.from(bytes));return {text:result.data.text.slice(0,15000),confidence:Math.round(result.data.confidence)};})();return await Promise.race([task,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{timedOut=true;reject(new Error('Scan timed out. Use a smaller, clearer image.'));},45000);})]);
 }finally{if(timer)clearTimeout(timer);if(worker)await worker.terminate();busy=false;}}

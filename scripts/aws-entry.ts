import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoStore, lambdaHandler } from '@wraith-kit/skeleton/aws';
import { createRuntime, appId, fixtures } from './runtime.js';
import { z } from 'zod';
const secretSchema=z.object({auditKey:z.string().min(32),sessionKey:z.string().min(32),adminToken:z.string().min(24),demoCode:z.string().min(12),webhookSecret:z.string().min(32).optional(),githubToken:z.string().optional()});
const store=new DynamoStore(process.env.WRAITH_TABLE??'');
export const handler=lambdaHandler(async()=>{
  if(!process.env.WRAITH_SECRETS_PARAMETER)throw new Error('Missing secrets parameter name');
  const response=await new SSMClient({}).send(new GetParameterCommand({Name:process.env.WRAITH_SECRETS_PARAMETER,WithDecryption:true}));
  const secrets=secretSchema.parse(JSON.parse(response.Parameter?.Value??'{}'));
  if(secrets.webhookSecret)process.env.WRAITH_WEBHOOK_SECRET=secrets.webhookSecret;
  if(secrets.githubToken)process.env.WRAITH_GITHUB_TOKEN=secrets.githubToken;
  const runtime=await createRuntime(appId(process.env.WRAITH_APP),{store,auditKey:secrets.auditKey,sessionKey:secrets.sessionKey,hosted:true,demo:true});
  return {...runtime,fixtureFiles:await fixtures(runtime.app.id),provider:()=>runtime.advisor.status(),adminToken:secrets.adminToken,demoCode:secrets.demoCode,publicDemo:true,afterAccept:async()=>{await new LambdaClient({}).send(new InvokeCommand({FunctionName:process.env.AWS_LAMBDA_FUNCTION_NAME,InvocationType:'Event',Payload:Buffer.from(JSON.stringify({task:'tick'}))}));}};
},async()=>{
  const day=new Date().toISOString().slice(0,10);const limit=Number(process.env.WRAITH_DAILY_REQUEST_CAP??10000);
  try{await store.client.send(new UpdateCommand({TableName:store.table,Key:{pk:`REQUESTS#${day}`,sk:0},UpdateExpression:'SET #n = if_not_exists(#n, :zero) + :one, expiresAt = :expiry',ConditionExpression:'attribute_not_exists(#n) OR #n < :limit',ExpressionAttributeNames:{'#n':'count'},ExpressionAttributeValues:{':zero':0,':one':1,':limit':limit,':expiry':Math.floor(Date.now()/1000)+172800}}));return true;}catch(error){if((error as {name?:string}).name==='ConditionalCheckFailedException')return false;throw error;}
});

// WRAITH-SKELETON
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand, type TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { type Snapshot, type Store, type AuditEntry } from '../core/index.js';
const empty=():Snapshot=>({revision:0,events:{},records:{},actions:{},deliveries:{},schedules:{},audit:[]});
/** Single-app CAS snapshots with immutable, separately stored audit entries. */
export class DynamoStore implements Store {
  readonly client:DynamoDBDocumentClient;
  constructor(readonly table:string, client?:DynamoDBDocumentClient){this.client=client??DynamoDBDocumentClient.from(new DynamoDBClient({}),{marshallOptions:{removeUndefinedValues:true}});}
  private async head(){return(await this.client.send(new GetCommand({TableName:this.table,Key:{pk:'HEAD',sk:0},ConsistentRead:true}))).Item;}
  async read():Promise<Snapshot>{
    for(let attempt=0;attempt<12;attempt++){
      const head=await this.head();if(!head)return empty();
      const parts:string[]=[];
      for(let i=0;i<Number(head.parts);i++){const item=(await this.client.send(new GetCommand({TableName:this.table,Key:{pk:`STATE#${i}`,sk:0},ConsistentRead:true}))).Item;if(!item||item.revision!==head.revision){parts.length=0;break;}parts.push(item.text as string);}
      if(parts.length!==head.parts)continue;
      const audit:AuditEntry[]=[];let cursor:Record<string,unknown>|undefined;
      do{const result=await this.client.send(new QueryCommand({TableName:this.table,IndexName:undefined,KeyConditionExpression:'pk = :pk',ExpressionAttributeValues:{':pk':'AUDIT'},ConsistentRead:true,ExclusiveStartKey:cursor}));audit.push(...(result.Items??[]).map(item=>item.entry as AuditEntry));cursor=result.LastEvaluatedKey;}while(cursor);
      const after=await this.head();if(after?.revision!==head.revision)continue;
      // Audit uses a sort key; fixed state/head rows use sk=0 in the schema.
      return {...JSON.parse(Buffer.concat(parts.map(p=>Buffer.from(p,'base64'))).toString('utf8')) as Omit<Snapshot,'audit'>,audit:audit.sort((a,b)=>a.seq-b.seq)};
    }
    throw new Error('DynamoDB snapshot contention');
  }
  async compareAndSwap(expected:number,next:Snapshot):Promise<boolean>{
    if(next.revision!==expected+1)throw new Error('Revision must increase by one');
    const head=await this.head();if(Number(head?.revision??0)!==expected)return false;
    const {audit,...state}=next;
    const oldCount=Number(head?.auditCount??0);
    if(audit.length<oldCount)throw new Error('Audit entries cannot be removed');
    const bytes=Buffer.from(JSON.stringify(state));if(bytes.length>1_500_000)throw new Error('Demo store capacity exceeded; archive before accepting more events');
    const parts:string[]=[];for(let i=0;i<bytes.length;i+=180_000)parts.push(bytes.subarray(i,i+180_000).toString('base64'));
    const writes:NonNullable<TransactWriteCommandInput['TransactItems']>=[{Put:{TableName:this.table,Item:{pk:'HEAD',sk:0,revision:next.revision,parts:parts.length,auditCount:audit.length},ConditionExpression:expected===0?'attribute_not_exists(pk)':'revision = :expected',...(expected===0?{}:{ExpressionAttributeValues:{':expected':expected}})}}];
    parts.forEach((text,i)=>writes.push({Put:{TableName:this.table,Item:{pk:`STATE#${i}`,sk:0,revision:next.revision,text}}}));
    for(const entry of audit.slice(oldCount))writes.push({Put:{TableName:this.table,Item:{pk:'AUDIT',sk:entry.seq,entry},ConditionExpression:'attribute_not_exists(pk)'}});
    if(writes.length>100)throw new Error('Transaction output limit exceeded');
    try{await this.client.send(new TransactWriteCommand({TransactItems:writes}));return true;}catch(error){
      const e=error as {name?:string;CancellationReasons?:{Code?:string}[]};
      if(e.name==='TransactionCanceledException'&&e.CancellationReasons?.some(r=>r.Code==='ConditionalCheckFailed'||r.Code==='TransactionConflict'))return false;
      throw error;
    }
  }
}

export interface DeadlineValue { date: string; time: string | null; timezone: string; instant: string | null; [key: string]: string | null }
export interface DateContext { published?: string; now: string; timezone?: string; dateOrder?: 'DMY' | 'MDY'; maxInferenceDays?: number }
export interface ParsedDeadline { value: DeadlineValue; candidates: DeadlineValue[]; ambiguous: boolean; uncertain: boolean; quote: string; label: string }
const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const monthPattern = months.map(m => `${m.slice(0,3)}(?:${m.slice(3)})?`).join('|');
const pattern = new RegExp(`\\b(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/.]\\d{1,2}(?:[/.]\\d{4})?|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${monthPattern})(?:,?\\s+\\d{4})?|(?:${monthPattern})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?)\\b`, 'gi');
const pad = (n: number) => String(n).padStart(2,'0');
export function validDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1970 && year <= 2200 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function instant(date: string, time: string, timezone: string): string | undefined {
  const target = Date.parse(`${date}T${time}:00Z`);
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' });
  let guess = target;
  for (let i=0;i<4;i++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(p=>[p.type,p.value]));
    const shown = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
    if (shown === target) return new Date(guess).toISOString();
    guess += target-shown;
  }
  return undefined; // DST gap; never normalise silently to a different wall time.
}
function makeValue(year:number,month:number,day:number,time:string|null,timezone:string): DeadlineValue | undefined {
  if (!validDate(year,month,day)) return;
  const date = `${year}-${pad(month)}-${pad(day)}`;
  const utc = time ? instant(date,time,timezone) : null;
  if (time && !utc) return;
  return { date,time,timezone,instant:utc ?? null };
}

/** Named-month and numeric dates only. Missing years are visible, never guessed silently. */
export function parseDates(text: string, context: DateContext): ParsedDeadline[] {
  const timezone=context.timezone ?? 'Asia/Kolkata';
  try { new Intl.DateTimeFormat('en',{timeZone:timezone}).format(); } catch { return []; }
  const anchor = new Date(context.published ?? context.now);
  if (!Number.isFinite(anchor.valueOf())) return [];
  const result:ParsedDeadline[]=[];
  for (const match of text.matchAll(pattern)) {
    const token=match[0]; const index=match.index;
    const left=text.slice(0,index); const right=text.slice(index+token.length);
    const sentenceStart=Math.max(left.lastIndexOf('\n'),left.lastIndexOf('. '))+1;
    const end=right.search(/[\n]|\.(?:\s|$)/);
    const quote=text.slice(sentenceStart,index+token.length+(end<0?right.length:end)).trim();
    const deadlinePhrase=/(last date(?: for [a-z ]{1,35})?|deadline|due|submit by|register by|closes on)\b/i.exec(left.slice(sentenceStart));
    const label=(deadlinePhrase?.[0] ?? 'deadline').toLowerCase().replace(/\s+/g,' ').trim();
    const clock=/^\s*(?:at\s+|by\s+)?(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(right);
    let time:string|null=null;
    if(clock){let hour=Number(clock[1]);const minute=Number(clock[2]);if(minute>59||hour>23||(clock[3]&&(hour<1||hour>12)))continue;if(clock[3])hour=hour%12+(clock[3].toUpperCase()==='PM'?12:0);time=`${pad(hour)}:${pad(minute)}`;}
    let day:number,month:number,year:number|undefined; let alternative:[number,number]|undefined;
    if (/^\d{4}-/.test(token)){[year,month,day]=token.split('-').map(Number);}
    else if(/^\d{1,2}[/.]/.test(token)){
      const [a=0,b=0,y]=token.split(/[/.]/).map(Number); year=y;
      [day,month]=context.dateOrder==='MDY'?[b,a]:[a,b];
      if(!context.dateOrder&&a<=12&&b<=12&&a!==b)alternative=[b,a];
    }else{const nums=token.match(/\d+/g)??[];day=Number(nums[0]);year=nums[1]?Number(nums[1]):undefined;month=months.findIndex(m=>token.toLowerCase().includes(m.slice(0,3)))+1;}
    let uncertain=false;
    if(year===undefined){year=anchor.getUTCFullYear();for(let count=0;count<5;count++){if(validDate(year,month,day)&&Date.UTC(year,month-1,day)>=Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth(),anchor.getUTCDate()))break;year++;}uncertain=!context.published||(Date.UTC(year,month-1,day)-anchor.valueOf())/86400000>(context.maxInferenceDays??183);}
    const value=makeValue(year,month,day,time,timezone);if(!value)continue;
    const candidates=[value];
    if(alternative){const alt=makeValue(year,alternative[1],alternative[0],time,timezone);if(alt)candidates.push(alt);}
    result.push({value,candidates,ambiguous:candidates.length>1,uncertain,quote,label});
  }
  return result;
}
export function parseDateEdit(text:string,context:DateContext):DeadlineValue|undefined {
  const parsed=parseDates(text,context);return parsed.length===1&&!parsed[0]?.ambiguous?parsed[0]?.value:undefined;
}

import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRuntime,fixtures} from '../../scripts/runtime.js';
import {startLocalServer} from '@wraith-kit/skeleton/node';
// Test workers must never inherit live integrations from the developer shell.
for(const key of ['WRAITH_NOTICE_CONFIG','WRAITH_LLM_BASE_URL','WRAITH_LLM_MODEL','WRAITH_LLM_KEY','WRAITH_GITHUB_TOKEN'])delete process.env[key];
process.env.WRAITH_LLM_PROVIDER='none';process.env.WRAITH_LIVE_ISSUES='0';


test('two app journeys through real HTTP, approval forms, outputs, mobile, keyboard and reduced motion',async({browser})=>{
 const dir=await mkdtemp(join(tmpdir(),'wraith-browser-'));await mkdir('output/playwright',{recursive:true});
 const errors:string[]=[];
 const contexts=[];
 const servers=[];
 try{
  for(const id of ['todo-afterlife','notice-ghoul']){
   const runtime=await createRuntime(id,{dataDir:join(dir,id,'.wraith'),configDir:join(dir,id,'config')});
   for(const event of runtime.demoEvents())await runtime.engine.ingest(event);
   const server=await startLocalServer({...runtime,provider:()=>runtime.advisor.status(),fixtureFiles:await fixtures(id),openBrowser:false,tickMs:60_000});servers.push(server);await server.tick();
   const context=await browser.newContext();contexts.push(context);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(server.origin);await expect(page.getByRole('heading',{level:1})).toContainText('second life');await page.screenshot({path:resolve(`output/playwright/${id}-home.png`),fullPage:true});
   // The private URL is read only in the test process and never printed or traced.
   await page.goto((await readFile(server.loginFile,'utf8')).trim());await expect(page).toHaveURL(/\/queue$/);await expect(page.getByRole('heading',{level:1})).toContainText('Limbo');
   await expect(page.locator('[data-action-row]').first()).toBeVisible();
   await page.screenshot({path:resolve(`output/playwright/${id}-queue.png`),fullPage:true});
   await accessibility(page);
   if(id==='todo-afterlife'){
    const action=Object.values((await runtime.store.read()).actions).find(a=>a.kind==='rewrite')!;
    await page.goto(server.origin+'/actions/'+action.id);await expect(page.getByRole('heading',{name:'What you’re approving'})).toBeVisible();await page.screenshot({path:resolve('output/playwright/todo-afterlife-detail.png'),fullPage:true});
    await page.getByRole('button',{name:'Approve',exact:true}).click();await expect(page.getByRole('link',{name:'Download patch'})).toBeVisible();
    const output=await context.request.get(server.origin+'/actions/'+action.id+'/download');expect(await output.text()).toContain('--- a/src/');
    const issue=Object.values((await runtime.store.read()).actions).find(a=>a.kind==='open-issue')!;
    if(issue){await page.goto(server.origin+'/actions/'+issue.id);await page.getByRole('button',{name:'Approve',exact:true}).click();await expect(page.locator('.result-panel')).toContainText('dryRun');}
    const count=Object.keys((await runtime.store.read()).actions).length;await page.goto(server.origin+'/queue');await page.getByRole('button',{name:'Load demo'}).click();expect(Object.keys((await runtime.store.read()).actions)).toHaveLength(count);
   }else{
    const pending=Object.values((await runtime.store.read()).actions).filter(a=>a.kind==='confirm-record'&&a.status==='proposed');
    expect(pending.length).toBeGreaterThan(0);
    for(const [index,action] of pending.entries()){await page.goto(server.origin+'/actions/'+action.id);if(index===0){await page.screenshot({path:resolve('output/playwright/notice-ghoul-detail.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve('output/playwright/notice-ghoul-detail-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});const edit=page.getByLabel('Correct the value');if(await edit.count()){await edit.fill('not a date');await page.getByRole('button',{name:'Save correction & approve'}).click();await expect(edit).toHaveValue('not a date');await expect(page.locator('#edit-error')).toBeVisible();}}const candidates=page.locator('button[name="decision"][value="pick"]');if(await candidates.count()){await candidates.first().click();}else{await page.getByRole('button',{name:'Approve',exact:true}).click();}}
    await server.tick();const calendar=await context.request.get(server.origin+'/deadlines.ics');expect(calendar.status()).toBe(200);expect(await calendar.text()).toContain('BEGIN:VCALENDAR');
    const digest=await context.request.get(server.origin+'/digest');expect(digest.status()).toBe(200);expect(await digest.text()).toContain('DEMO');
    expect((await context.request.get(server.origin+'/digest.md')).status()).toBe(200);
    await page.goto(server.origin+'/digest');await page.screenshot({path:resolve('output/playwright/notice-ghoul-digest.png'),fullPage:true});
   }
   await page.goto(server.origin+'/audit');await expect(page.getByRole('heading',{name:'Chain verified'})).toBeVisible();await accessibility(page);
   await page.goto(server.origin+'/settings');await page.getByLabel('Enable single-key shortcuts').check();await page.goto(server.origin+'/queue?filter=all');await page.keyboard.press('j');await expect(page.locator('[data-action-link]').first()).toBeFocused();
   await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto(server.origin+'/queue');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await accessibility(page);
   await page.screenshot({path:resolve(`output/playwright/${id}-mobile.png`),fullPage:true});
   const motion=await page.getByRole('button',{name:'Load demo'}).first().evaluate(el=>({transition:getComputedStyle(el).transitionDuration,animation:getComputedStyle(el).animationDuration}));expect(motion).toEqual({transition:'0s',animation:'0s'});
   await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
   expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
   await page.getByRole('button',{name:'Sign out'}).click();await page.goto(server.origin+'/queue');await expect(page).toHaveURL(/\/login$/);
  }
  expect(errors).toEqual([]);
 }finally{await Promise.all(contexts.map(c=>c.close()));await Promise.all(servers.map(s=>s.close()));await rm(dir,{recursive:true,force:true});}
});
async function accessibility(page:Page){const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);}

test('approval remains usable with JavaScript disabled',async({browser})=>{
 const dir=await mkdtemp(join(tmpdir(),'wraith-nojs-'));const runtime=await createRuntime('todo-afterlife',{dataDir:join(dir,'.wraith'),configDir:join(dir,'config')});
 for(const event of runtime.demoEvents())await runtime.engine.ingest(event);
 const server=await startLocalServer({...runtime,openBrowser:false,tickMs:60000});const context=await browser.newContext({javaScriptEnabled:false});
 try{const page=await context.newPage();await page.goto((await readFile(server.loginFile,'utf8')).trim());const action=Object.values((await runtime.store.read()).actions).find(a=>a.kind==='rewrite')!;await page.goto(server.origin+'/actions/'+action.id);await page.getByRole('button',{name:'Approve',exact:true}).click();await expect(page.getByRole('link',{name:'Download patch'})).toBeVisible();expect((await runtime.store.read()).actions[action.id].status).toBe('succeeded');}finally{await context.close();await server.close();await rm(dir,{recursive:true,force:true});}
});

test('both local apps stay signed in when opened in the same browser', async ({ browser }) => {
 const directory = await mkdtemp(join(tmpdir(), 'wraith-two-apps-'));
 const context = await browser.newContext();
 const servers: Awaited<ReturnType<typeof startLocalServer>>[] = [];
 try {
  const pages: Page[] = [];
  for (const id of ['todo-afterlife', 'notice-ghoul'] as const) {
   const runtime = await createRuntime(id, {
    dataDir: join(directory, id, 'data'),
    configDir: join(directory, id, 'config'),
   });
   const server = await startLocalServer({ ...runtime, openBrowser: false });
   servers.push(server);
   const page = await context.newPage();
   pages.push(page);
   await page.goto((await readFile(server.loginFile, 'utf8')).trim());
   await expect(page).toHaveURL(server.origin + '/queue');
  }

  const [todo, notices] = pages;
  const [todoServer, noticeServer] = servers;
  await todo.goto(todoServer.origin + '/queue');
  await expect(todo).toHaveURL(todoServer.origin + '/queue');
  await notices.getByRole('button', { name: 'Sign out' }).click();
  await notices.goto(noticeServer.origin + '/queue');
  await expect(notices).toHaveURL(noticeServer.origin + '/login');
  await todo.reload();
  await expect(todo).toHaveURL(todoServer.origin + '/queue');
 } finally {
  await context.close();
  await Promise.all(servers.map(server => server.close()));
  await rm(directory, { recursive: true, force: true });
 }
});

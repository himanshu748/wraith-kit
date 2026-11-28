import { test, expect, type Page } from '@playwright/test';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { access, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('rebuilds the offline test ZIP and runs both extracted apps in one browser', async ({ browser }) => {
  test.setTimeout(60_000);
  const work = await mkdtemp(join(tmpdir(), 'wraith-judge-test-'));
  const context = await browser.newContext();
  const processes: ChildProcess[] = [];
  try {
    const first = resolve('output/wraith-kit-judge.zip');
    const second = join(work, 'rebuild.zip');
    for (const archive of [first, second]) {
      execFileSync(process.execPath, ['scripts/build-judge.mjs', archive]);
    }
    const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
    expect(hash(await readFile(first))).toBe(hash(await readFile(second)));

    const extracted = join(work, 'extracted');
    await mkdir(extracted);
    execFileSync('unzip', ['-q', first, '-d', extracted]);
    expect(await readFile(join(extracted, 'LICENSE'), 'utf8')).toContain('MIT License');
    expect(await readFile(join(extracted, 'third-party/boolbase/1.0.0/LICENSE'), 'utf8')).toContain('Felix Boehm');
    expect(await readFile(join(extracted, 'README.md'), 'utf8')).toContain('node wraith.mjs notice-ghoul');

    const pages: Page[] = [];
    const origins: string[] = [];
    for (const id of ['todo-afterlife', 'notice-ghoul']) {
      const config = join(work, id, 'config');
      const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('WRAITH_')));
      Object.assign(env, {
        PORT: '0',
        WRAITH_CONFIG_DIR: config,
        WRAITH_DATA_DIR: join(work, id, 'data'),
        WRAITH_OPEN_BROWSER: '0',
      });
      const processForApp = spawn(process.execPath, ['wraith.mjs', id], { cwd: extracted, env, stdio: 'ignore' });
      processes.push(processForApp);
      const login = join(config, 'login-link.txt');
      await expect.poll(() => access(login).then(() => true, () => false), {
        message: id + ' should start and provide a private sign-in file',
      }).toBe(true);
      const link = (await readFile(login, 'utf8')).trim();
      const origin = new URL(link).origin;
      const page = await context.newPage();
      pages.push(page);
      origins.push(origin);
      await page.goto(origin + '/queue');
      await expect(page).toHaveURL(origin + '/login');
      await page.goto(link);
      await expect(page).toHaveURL(origin + '/queue');
    }

    const [todo, notice] = pages;
    const [todoOrigin, noticeOrigin] = origins;
    await todo.reload();
    await expect(todo).toHaveURL(todoOrigin + '/queue');
    await todo.locator('[data-action-row]').filter({ hasText: /rewrite/i }).locator('[data-action-link]').first().click();
    await todo.getByRole('button', { name: 'Approve', exact: true }).click();
    const download = todo.getByRole('link', { name: 'Download patch' });
    await expect(download).toBeVisible();
    const patch = await context.request.get(new URL((await download.getAttribute('href'))!, todoOrigin).href);
    expect(patch.ok()).toBe(true);
    expect(await patch.text()).toMatch(/--- a\/src\//);

    const proposals = await notice.locator('[data-action-link]').evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href));
    expect(proposals.length).toBeGreaterThan(0);
    for (const url of proposals) {
      await notice.goto(url);
      const candidate = notice.locator('button[name="decision"][value="pick"]');
      if (await candidate.count()) await candidate.first().click();
      else await notice.getByRole('button', { name: 'Approve', exact: true }).click();
    }
    const fixture = await context.request.get(noticeOrigin + '/fixtures/index.html');
    expect(fixture.ok()).toBe(true);
    const calendar = await context.request.get(noticeOrigin + '/deadlines.ics');
    expect(calendar.ok()).toBe(true);
    expect(await calendar.text()).toMatch(/BEGIN:VCALENDAR[\s\S]*BEGIN:VEVENT/);
    await notice.getByRole('button', { name: 'Sign out' }).click();
    await notice.goto(noticeOrigin + '/queue');
    await expect(notice).toHaveURL(noticeOrigin + '/login');
    await todo.goto(todoOrigin + '/audit');
    await expect(todo.getByRole('heading', { name: 'Chain verified' })).toBeVisible();
  } finally {
    await context.close();
    await Promise.all(processes.map(async child => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    }));
    await rm(work, { recursive: true, force: true });
  }
});

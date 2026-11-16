import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// `kiro-cli agent validate` (3.3.0) checks JSON syntax and field types, but it
// accepted an unknown field and a rule with capability "fs_wrte" and effect
// "maybe" (exit 0). These tests check what it does not: only fields,
// capabilities and effects from kiro.dev/docs/custom-agents/configuration-reference
// and kiro.dev/docs/permissions (read 16 Nov 2026).
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const agentsDir = path.join(repoRoot, '.kiro', 'agents');

const FIELDS = new Set([
  'name',
  'description',
  'prompt',
  'mcpServers',
  'tools',
  'excludedTools',
  'permissions',
  'resources',
  'hooks',
  'includeMcpJson',
  'includePowers',
  'model',
  'welcomeMessage',
]);
const TOOL_SELECTORS = new Set(['read', 'write', 'shell', 'web', 'subagent', '@builtin', '@mcp', '*']);
const CAPABILITIES = new Set([
  'fs_read',
  'fs_write',
  'shell',
  'web_fetch',
  'web_search',
  'mcp',
  'subagent',
  'skill',
  'power',
  'context',
  'diagnostics',
  'sandbox_network',
  'all',
  'builtin',
  'filesystem',
]);
const EFFECTS = new Set(['allow', 'ask', 'deny']);
const RULE_KEYS = new Set(['capability', 'match', 'exclude', 'effect']);

interface Rule {
  capability: string;
  match?: string[];
  exclude?: string[];
  effect: string;
}

interface Agent {
  name: string;
  description: string;
  prompt: string;
  tools: string[];
  resources: string[];
  permissions: { rules: Rule[] };
  [key: string]: unknown;
}

function load(name: string): Agent {
  return JSON.parse(readFileSync(path.join(agentsDir, `${name}.json`), 'utf8'));
}

function rules(agent: Agent, capability: string, effect: string): Rule[] {
  return agent.permissions.rules.filter((rule) => rule.capability === capability && rule.effect === effect);
}

describe('.kiro/agents', () => {
  it('holds exactly the two planned agents', () => {
    expect(readdirSync(agentsDir).sort()).toEqual(['app-smith.json', 'skeleton-warden.json']);
  });

  it.each(['app-smith', 'skeleton-warden'])('%s uses only documented fields, selectors, capabilities and effects', (name) => {
    const agent = load(name);
    expect(agent.name).toBe(name);
    for (const key of Object.keys(agent)) {
      expect(FIELDS.has(key), `unexpected field ${key}`).toBe(true);
    }
    for (const tool of agent.tools) {
      expect(TOOL_SELECTORS.has(tool), tool).toBe(true);
    }
    for (const rule of agent.permissions.rules) {
      for (const key of Object.keys(rule)) {
        expect(RULE_KEYS.has(key), `unexpected rule key ${key}`).toBe(true);
      }
      expect(CAPABILITIES.has(rule.capability), rule.capability).toBe(true);
      expect(EFFECTS.has(rule.effect), rule.effect).toBe(true);
    }
    expect(agent.description.length).toBeGreaterThan(40);
    expect(readFileSync(path.join(agentsDir, `${name}.json`), 'utf8')).not.toContain(String.fromCharCode(0x2014));
  });

  it.each(['app-smith', 'skeleton-warden'])('%s loads only resources that exist', (name) => {
    for (const resource of load(name).resources) {
      expect(resource.startsWith('file://')).toBe(true);
      expect(existsSync(path.join(repoRoot, resource.slice('file://'.length))), resource).toBe(true);
    }
  });

  it.each(['app-smith', 'skeleton-warden'])('%s denies reading .env files and denies every shell command it does not allow', (name) => {
    const agent = load(name);
    expect(rules(agent, 'fs_read', 'deny')).toEqual([
      { capability: 'fs_read', match: ['**/.env', '**/.env.*'], exclude: ['**/.env.example'], effect: 'deny' },
    ]);
    const [allowShell] = rules(agent, 'shell', 'allow');
    const [denyShell] = rules(agent, 'shell', 'deny');
    expect(denyShell.match).toEqual(['*']);
    expect(denyShell.exclude).toEqual(allowShell.match);
    expect(allowShell.match?.some((command) => /commit|push|publish/.test(command))).toBe(false);
  });

  it('skeleton-warden loads its three steering files and writes only under docs/reviews/', () => {
    const agent = load('skeleton-warden');
    expect(agent.resources).toEqual([
      'file://.kiro/steering/product.md',
      'file://.kiro/steering/structure.md',
      'file://.kiro/steering/wraith-domain.md',
    ]);
    expect(rules(agent, 'fs_write', 'allow')).toEqual([{ capability: 'fs_write', match: ['docs/reviews/**'], effect: 'allow' }]);
    expect(rules(agent, 'fs_write', 'deny')).toEqual([
      { capability: 'fs_write', match: ['**'], exclude: ['docs/reviews/**'], effect: 'deny' },
    ]);
    expect(rules(agent, 'shell', 'allow')[0].match).toEqual(
      expect.arrayContaining(['npm test', 'npm run spec:trace', 'git log', 'git ls-files']),
    );
    expect(agent.prompt).toContain('docs/reviews/<YYYY-MM-DD>.md');
    expect(agent.prompt).toContain('Report only what you found');
  });

  it('app-smith loads the authoring steering and the guide, and may not write to the skeleton or the two apps', () => {
    const agent = load('app-smith');
    expect(agent.resources).toEqual([
      'file://.kiro/steering/skeleton-authoring.md',
      'file://.kiro/steering/structure.md',
      'file://docs/make-your-own-app-in-15-min.md',
    ]);
    expect(rules(agent, 'fs_write', 'allow')).toEqual([
      {
        capability: 'fs_write',
        match: ['apps/**', 'docs/**'],
        exclude: ['apps/todo-afterlife/**', 'apps/notice-ghoul/**'],
        effect: 'allow',
      },
    ]);
    const denied = rules(agent, 'fs_write', 'deny').flatMap((rule) => rule.match ?? []);
    expect(denied).toEqual(expect.arrayContaining(['skeleton/**', 'apps/todo-afterlife/**', 'apps/notice-ghoul/**', '**']));
    for (const rule of ['clean working tree', 'never committed', 'agent time', 'The main session deletes the scratch folder']) {
      expect(agent.prompt).toContain(rule);
    }
  });
});

describe('.kiro/settings/mcp.json', () => {
  const config = JSON.parse(readFileSync(path.join(repoRoot, '.kiro', 'settings', 'mcp.json'), 'utf8'));

  it('configures only the aws-docs server, as the AWS Documentation MCP server README shows, with a pinned version', () => {
    expect(Object.keys(config.mcpServers)).toEqual(['aws-docs']);
    const server = config.mcpServers['aws-docs'];
    expect(server.command).toBe('uvx');
    expect(server.args).toHaveLength(1);
    expect(server.args[0]).toMatch(/^awslabs\.aws-documentation-mcp-server@[0-9]+\.[0-9]+\.[0-9]+$/);
    expect(server.env).toEqual({ FASTMCP_LOG_LEVEL: 'ERROR', AWS_DOCUMENTATION_PARTITION: 'aws' });
    expect(server.disabled).toBe(false);
  });
});

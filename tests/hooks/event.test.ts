import { describe, expect, it } from 'vitest';
import {
  parseEvent,
  savedPathsOf,
  shellCommandOf,
  stringsIn,
  targetPathsOf,
} from '../../scripts/hooks/lib/event.mjs';

describe('parseEvent', () => {
  it('returns null for empty, blank, invalid and non-object JSON', () => {
    expect(parseEvent('')).toBeNull();
    expect(parseEvent('  \n')).toBeNull();
    expect(parseEvent('not json')).toBeNull();
    expect(parseEvent('{"open": ')).toBeNull();
    expect(parseEvent('[1, 2]')).toBeNull();
    expect(parseEvent('"text"')).toBeNull();
    expect(parseEvent('null')).toBeNull();
    expect(parseEvent(undefined)).toBeNull();
  });

  it('returns the object for valid JSON', () => {
    expect(parseEvent('{"hook_event_name":"PreToolUse","tool_input":{"path":"a"}}')).toEqual({
      hook_event_name: 'PreToolUse',
      tool_input: { path: 'a' },
    });
  });
});

describe('shellCommandOf', () => {
  it('reads the command from the candidate fields in order', () => {
    expect(shellCommandOf({ tool_input: { command: 'git status' } })).toBe('git status');
    expect(shellCommandOf({ tool_input: { cmd: 'ls' } })).toBe('ls');
    expect(shellCommandOf({ tool_input: { script: 'echo hi', other: 1 } })).toBe('echo hi');
    expect(shellCommandOf({ tool_input: { command: 'first', cmd: 'second' } })).toBe('first');
  });

  it('accepts a string tool_input and an array of strings', () => {
    expect(shellCommandOf({ tool_input: 'git log' })).toBe('git log');
    expect(shellCommandOf({ tool_input: { command: ['git', 'commit', '-m', 'x'] } })).toBe('git commit -m x');
  });

  it('returns null when no candidate field holds a string', () => {
    expect(shellCommandOf(null)).toBeNull();
    expect(shellCommandOf({})).toBeNull();
    expect(shellCommandOf({ tool_input: { unknown: 'git commit -a' } })).toBeNull();
    expect(shellCommandOf({ tool_input: { command: 42 } })).toBeNull();
  });
});

describe('targetPathsOf and savedPathsOf', () => {
  it('reads single paths, arrays and arrays of objects', () => {
    expect(targetPathsOf({ tool_input: { path: '/r/a.ts' } })).toEqual(['/r/a.ts']);
    expect(targetPathsOf({ tool_input: { file_path: 'b.ts' } })).toEqual(['b.ts']);
    expect(targetPathsOf({ tool_input: { paths: ['a', 'b'] } })).toEqual(['a', 'b']);
    expect(targetPathsOf({ tool_input: { edits: [{ path: 'c' }, { filePath: 'd' }] } })).toEqual(['c', 'd']);
    expect(targetPathsOf({ tool_input: { source: 'e', destination: 'f' } })).toEqual(['e', 'f']);
  });

  it('returns an empty list for an unknown shape', () => {
    expect(targetPathsOf(null)).toEqual([]);
    expect(targetPathsOf({ tool_input: { content: 'x' } })).toEqual([]);
    expect(targetPathsOf({ tool_input: { path: '' } })).toEqual([]);
    expect(targetPathsOf({ path: 'top-level only' })).toEqual([]);
  });

  it('savedPathsOf reads top-level fields first, then tool_input, without repeats', () => {
    expect(savedPathsOf({ file_path: 'a.ts', tool_input: { path: 'b.ts' } })).toEqual(['a.ts', 'b.ts']);
    expect(savedPathsOf({ filePath: 'a.ts', tool_input: { path: 'a.ts' } })).toEqual(['a.ts']);
    expect(savedPathsOf(null)).toEqual([]);
  });
});

describe('stringsIn', () => {
  it('collects every string, depth first', () => {
    expect(stringsIn({ a: 'x', b: [1, 'y', { c: 'z' }], d: null })).toEqual(['x', 'y', 'z']);
    expect(stringsIn(undefined)).toEqual([]);
  });
});

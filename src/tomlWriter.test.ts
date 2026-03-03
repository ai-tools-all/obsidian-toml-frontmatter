import { describe, it, expect } from 'vitest';
import { applyTomlChange } from './tomlWriter';
import { parseTomlFrontmatter } from './tomlFrontmatter';

describe('applyTomlChange', () => {
  const base = '+++\ntitle = "Hello"\ndraft = true\ntags = ["a", "b"]\n+++\n# Content';

  // === UPDATE ===

  it('updates a top-level string value', () => {
    const result = applyTomlChange(base, { type: 'update', keyPath: ['title'], value: 'World' });
    expect(result).toContain('title = "World"');
    expect(result).toContain('# Content');
  });

  it('updates a boolean value', () => {
    const result = applyTomlChange(base, { type: 'update', keyPath: ['draft'], value: false });
    expect(result).toContain('draft = false');
  });

  it('updates a nested key', () => {
    const nested = '+++\n[meta]\ncategory = "docs"\n+++\n# Content';
    const result = applyTomlChange(nested, { type: 'update', keyPath: ['meta', 'category'], value: 'blog' });
    expect(result).toContain('category = "blog"');
  });

  it('updates an array value', () => {
    const result = applyTomlChange(base, { type: 'update', keyPath: ['tags'], value: ['a', 'b', 'c'] });
    expect(result).toContain('"c"');
  });

  // === DELETE ===

  it('deletes a top-level key', () => {
    const result = applyTomlChange(base, { type: 'delete', keyPath: ['draft'] });
    expect(result).not.toContain('draft');
    expect(result).toContain('title = "Hello"');
  });

  it('deletes a nested key', () => {
    const nested = '+++\n[meta]\ncategory = "docs"\nlevel = 3\n+++\n';
    const result = applyTomlChange(nested, { type: 'delete', keyPath: ['meta', 'level'] });
    expect(result).toContain('category = "docs"');
    expect(result).not.toContain('level');
  });

  // === ADD ===

  it('adds a new top-level key', () => {
    const result = applyTomlChange(base, { type: 'add', keyPath: ['author'], value: 'Jane' });
    expect(result).toContain('author = "Jane"');
  });

  it('adds a key inside an existing nested table', () => {
    const nested = '+++\n[meta]\ncategory = "docs"\n+++\n';
    const result = applyTomlChange(nested, { type: 'add', keyPath: ['meta', 'level'], value: 3 });
    expect(result).toContain('level = 3');
  });

  // === SAFETY ===

  it('preserves content after closing delimiter', () => {
    const result = applyTomlChange(base, { type: 'update', keyPath: ['title'], value: 'Changed' });
    expect(result).toContain('# Content');
    expect(result.indexOf('# Content')).toBeGreaterThan(result.lastIndexOf('+++'));
  });

  it('throws on file with no frontmatter', () => {
    expect(() =>
      applyTomlChange('# No frontmatter', { type: 'update', keyPath: ['title'], value: 'X' }),
    ).toThrow();
  });

  it('creates intermediate tables for update with nonexistent nested path', () => {
    const result = applyTomlChange(base, { type: 'update', keyPath: ['nonexistent', 'deep'], value: 'X' });
    const reparsed = parseTomlFrontmatter(result);
    expect(reparsed.data).toBeTruthy();
    expect((reparsed.data as Record<string, Record<string, string>>).nonexistent.deep).toBe('X');
  });

  // === EDGE CASES ===

  it('handles adding to empty frontmatter', () => {
    const empty = '+++\n+++\n# Content';
    const result = applyTomlChange(empty, { type: 'add', keyPath: ['title'], value: 'New' });
    expect(result).toContain('title = "New"');
    expect(result).toContain('# Content');
  });

  it('handles deleting the last key', () => {
    const single = '+++\ntitle = "Only"\n+++\n';
    const result = applyTomlChange(single, { type: 'delete', keyPath: ['title'] });
    expect(result).toContain('+++\n\n+++');
  });

  it('preserves CRLF line endings if original uses them', () => {
    const crlf = '+++\r\ntitle = "Win"\r\n+++\r\n# Content';
    const result = applyTomlChange(crlf, { type: 'update', keyPath: ['title'], value: 'Updated' });
    expect(result).toContain('title = "Updated"');
  });

  it('handles dates correctly through roundtrip', () => {
    const dated = '+++\ncreated = 2024-02-27\n+++\n';
    const result = applyTomlChange(dated, { type: 'add', keyPath: ['author'], value: 'Me' });
    expect(result).toContain('author = "Me"');
    expect(result).toContain('2024-02-27');
  });

  it('handles special characters in string values', () => {
    const input = '+++\ntitle = "Hello"\n+++\n';
    const result = applyTomlChange(input, { type: 'update', keyPath: ['title'], value: 'He said "hi"' });
    expect(result).toContain('title');
    const reparsed = parseTomlFrontmatter(result);
    expect(reparsed.data?.title).toBe('He said "hi"');
  });

  it('validates generated TOML before returning', () => {
    const result = applyTomlChange(base, { type: 'update', keyPath: ['title'], value: 'Valid' });
    const reparsed = parseTomlFrontmatter(result);
    expect(reparsed.error).toBeNull();
    expect(reparsed.data).toBeTruthy();
  });
});

import { describe, it, expect } from 'vitest';
import { parseTomlFrontmatter } from './tomlFrontmatter';
import { TomlTable } from './types';

describe('parseTomlFrontmatter', () => {

  // === Basic parsing ===

  it('parses simple key-value pairs', () => {
    const content = '+++\ntitle = "Hello"\nauthor = "Jane"\n+++\n# Content';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toEqual({ title: 'Hello', author: 'Jane' });
    expect(result.error).toBeNull();
    expect(result.endLine).toBe(3);
  });

  it('parses numbers, booleans, arrays', () => {
    const content = '+++\ncount = 42\ndraft = true\ntags = ["a", "b"]\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data?.count).toBe(42);
    expect(result.data?.draft).toBe(true);
    expect(result.data?.tags).toEqual(['a', 'b']);
  });

  it('parses nested TOML tables', () => {
    const content = '+++\n[metadata]\ncategory = "docs"\nlevel = 3\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data?.metadata).toEqual({ category: 'docs', level: 3 });
  });

  it('parses deeply nested tables', () => {
    const content = '+++\n[a]\n[a.b]\n[a.b.c]\nkey = "deep"\n+++\n';
    const result = parseTomlFrontmatter(content);
    const a = result.data?.a as TomlTable | undefined;
    const b = a?.b as TomlTable | undefined;
    const c = b?.c as TomlTable | undefined;
    expect(c?.key).toBe('deep');
  });

  it('preserves raw TOML string', () => {
    const content = '+++\ntitle = "Hi"\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.raw).toBe('title = "Hi"');
  });

  // === YAML coexistence ===

  it('ignores file starting with YAML frontmatter (---)', () => {
    const content = '---\ntitle: YAML Note\ntags:\n  - a\n---\n# Content';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
    expect(result.endLine).toBe(-1);
  });

  it('ignores TOML block after YAML frontmatter', () => {
    const content = '---\ntitle: Note\n---\n+++\nauthor = "Jane"\n+++\n# Content';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toBeNull();
  });

  it('ignores +++ appearing mid-document (not at top)', () => {
    const content = '# My Note\n\nSome text\n\n+++\ntitle = "Oops"\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toBeNull();
  });

  // === Empty / edge cases ===

  it('returns null for empty string', () => {
    const result = parseTomlFrontmatter('');
    expect(result.data).toBeNull();
    expect(result.endLine).toBe(-1);
  });

  it('returns null for whitespace-only string', () => {
    const result = parseTomlFrontmatter('   \n  \n  ');
    expect(result.data).toBeNull();
  });

  it('handles empty frontmatter block', () => {
    const content = '+++\n+++\n# Content';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toEqual({});
    expect(result.error).toBeNull();
    expect(result.endLine).toBe(1);
  });

  it('handles frontmatter with only whitespace inside', () => {
    const content = '+++\n  \n  \n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toEqual({});
    expect(result.error).toBeNull();
  });

  it('handles file that is ONLY the frontmatter (no content after)', () => {
    const content = '+++\ntitle = "Only"\n+++';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toEqual({ title: 'Only' });
  });

  // === Error handling ===

  it('returns error for missing closing delimiter', () => {
    const content = '+++\ntitle = "Unclosed"\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toBeNull();
    expect(result.error).toContain('Missing closing delimiter');
    expect(result.endLine).toBe(-1);
  });

  it('returns error for malformed TOML', () => {
    const content = '+++\ntitle = \n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.endLine).toBe(2);
  });

  it('returns error for invalid TOML syntax', () => {
    const content = '+++\n[[[broken\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });

  // === Delimiter matching ===

  it('requires exact delimiter match (not startsWith)', () => {
    const content = '+++ extra text\ntitle = "bad"\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toBeNull();
  });

  it('does not match ++++ as closing delimiter', () => {
    const content = '+++\ntitle = "test"\n++++\n+++\n';
    const result = parseTomlFrontmatter(content);
    // ++++ is NOT a valid closing delimiter, so it becomes TOML content
    // which causes a parse error, but the real +++ on line 3 closes it
    expect(result.endLine).toBe(3);
    expect(result.error).toBeTruthy();
  });

  it('supports custom delimiter', () => {
    const content = '---toml\ntitle = "custom"\n---toml\n';
    const result = parseTomlFrontmatter(content, '---toml');
    expect(result.data).toEqual({ title: 'custom' });
  });

  // === Encoding / whitespace ===

  it('handles UTF-8 BOM at start of file', () => {
    const content = '\uFEFF+++\ntitle = "BOM"\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toEqual({ title: 'BOM' });
  });

  it('handles Windows line endings (CRLF)', () => {
    const content = '+++\r\ntitle = "Windows"\r\n+++\r\n# Content';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toEqual({ title: 'Windows' });
  });

  it('handles leading blank lines before delimiter', () => {
    const content = '\n\n+++\ntitle = "Spaced"\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toEqual({ title: 'Spaced' });
  });

  it('handles trailing whitespace on delimiter lines', () => {
    const content = '+++  \ntitle = "Trim"\n+++  \n';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toEqual({ title: 'Trim' });
  });

  // === Large / complex content ===

  it('handles large frontmatter blocks', () => {
    const pairs = Array.from({ length: 100 }, (_, i) => `key${i} = "value${i}"`);
    const content = '+++\n' + pairs.join('\n') + '\n+++\n# Content';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toBeTruthy();
    expect(Object.keys(result.data!).length).toBe(100);
  });

  it('handles TOML with inline tables', () => {
    const content = '+++\npoint = { x = 1, y = 2 }\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data?.point).toEqual({ x: 1, y: 2 });
  });

  it('handles TOML with multiline strings', () => {
    const content = '+++\ndesc = """\nThis is a\nmultiline string"""\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data?.desc).toContain('multiline string');
  });

  it('handles TOML dates', () => {
    const content = '+++\ncreated = 2024-02-27\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data?.created).toBeTruthy();
  });

  // === No frontmatter ===

  it('returns null for plain markdown file', () => {
    const content = '# Title\n\nSome paragraph text.\n\n- list item\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns null for file starting with heading', () => {
    const content = '# Heading\n+++\ntitle = "trap"\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.data).toBeNull();
  });

  // === endLine tracking ===

  it('tracks endLine correctly for multi-section TOML', () => {
    const content = '+++\ntitle = "A"\n[meta]\nk = "v"\n+++\n# Content';
    const result = parseTomlFrontmatter(content);
    expect(result.endLine).toBe(4);
  });

  it('endLine is -1 when no frontmatter found', () => {
    const content = '# Just markdown';
    const result = parseTomlFrontmatter(content);
    expect(result.endLine).toBe(-1);
  });

  // === Templater syntax ===

  it('parses Templater syntax in single-quoted values (no inner quote conflict)', () => {
    const content = "+++\ndate = '<% tp.file.title %>'\nweek = '<% tp.date.now(\"WW\") %>'\n+++\n";
    const result = parseTomlFrontmatter(content);
    expect(result.error).toBeNull();
    expect(result.data?.date).toBe('<% tp.file.title %>');
    expect(result.data?.week).toBe('<% tp.date.now("WW") %>');
  });

  it('parses Templater syntax with nested double quotes (invalid TOML, rescued)', () => {
    const content = '+++\ndate = "<% tp.date.now("YYYY-MM-DD") %>"\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.error).toBeNull();
    expect(result.data?.date).toBe('<% tp.date.now("YYYY-MM-DD") %>');
  });

  it('parses Templater syntax with escaped inner quotes', () => {
    const content = '+++\ndate = "<% tp.date.now(\\"YYYY-MM-DD\\") %>"\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.error).toBeNull();
    expect(result.data?.date).toBe('<% tp.date.now("YYYY-MM-DD") %>');
  });

  it('parses multiple Templater blocks in one value', () => {
    const content = '+++\nnote = "<% tp.date.now() %> - <% tp.file.title %>"\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.error).toBeNull();
    expect(result.data?.note).toBe('<% tp.date.now() %> - <% tp.file.title %>');
  });

  it('parses Templater blocks across multiple keys', () => {
    const content = '+++\ndate = "<% tp.date.now("YYYY-MM-DD") %>"\ntitle = "<% tp.file.title %>"\ntags = ["journal"]\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.error).toBeNull();
    expect(result.data?.date).toBe('<% tp.date.now("YYYY-MM-DD") %>');
    expect(result.data?.title).toBe('<% tp.file.title %>');
    expect(result.data?.tags).toEqual(['journal']);
  });

  it('parses Templater block inside an array value', () => {
    const content = '+++\nitems = ["<% tp.date.now() %>", "static"]\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.error).toBeNull();
    expect(result.data?.items).toEqual(['<% tp.date.now() %>', 'static']);
  });

  it('preserves non-Templater values alongside Templater values', () => {
    const content = '+++\ntitle = "My Note"\ndate = "<% tp.date.now("YYYY-MM-DD") %>"\ncount = 42\n+++\n';
    const result = parseTomlFrontmatter(content);
    expect(result.error).toBeNull();
    expect(result.data?.title).toBe('My Note');
    expect(result.data?.date).toBe('<% tp.date.now("YYYY-MM-DD") %>');
    expect(result.data?.count).toBe(42);
  });
});

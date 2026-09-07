import { parseCliArgs } from '../parse-args';

const meta = { version: '9.9.9' };

describe('parseCliArgs', () => {
  let savedPort: string | undefined;
  let savedHost: string | undefined;

  beforeEach(() => {
    savedPort = process.env.PORT;
    savedHost = process.env.HOST;
    delete process.env.PORT;
    delete process.env.HOST;
  });

  afterEach(() => {
    if (savedPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = savedPort;
    }
    if (savedHost === undefined) {
      delete process.env.HOST;
    } else {
      process.env.HOST = savedHost;
    }
  });

  it('returns help for --help', () => {
    const result = parseCliArgs(['--help'], meta);
    expect(result.kind).toBe('help');
    if (result.kind === 'help') {
      expect(result.text).toContain('Usage:');
      expect(result.text).toContain('--port');
      expect(result.text).toContain('--migrate');
    }
  });

  it('returns help for -h', () => {
    expect(parseCliArgs(['-h'], meta).kind).toBe('help');
  });

  it('returns version for --version', () => {
    expect(parseCliArgs(['--version'], meta)).toEqual({ kind: 'version', text: '9.9.9' });
  });

  it('returns version text for -V', () => {
    const result = parseCliArgs(['-V'], { version: '1.2.3' });
    expect(result.kind).toBe('version');
    if (result.kind === 'version') {
      expect(result.text).toBe('1.2.3');
    }
  });

  it('returns default serve options for no args', () => {
    const result = parseCliArgs([], { version: '0' });
    expect(result.kind).toBe('serve');
    if (result.kind === 'serve') {
      expect(result.options).toEqual({
        port: 3000,
        host: '0.0.0.0',
        verbose: false,
        migrate: false,
        seed: false,
      });
    }
  });

  it('treats the serve command like no args', () => {
    expect(parseCliArgs(['serve'], meta)).toEqual(parseCliArgs([], meta));
  });

  it('parses --port as a number', () => {
    const result = parseCliArgs(['--port', '4000'], meta);
    expect(result.kind).toBe('serve');
    if (result.kind === 'serve') {
      expect(result.options.port).toBe(4000);
    }
  });

  it('rejects a port below 1', () => {
    expect(parseCliArgs(['-p', '0'], meta).kind).toBe('error');
  });

  it('rejects a non-numeric port', () => {
    const result = parseCliArgs(['--port', 'abc'], meta);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('invalid port');
    }
  });

  it('rejects a port above 65535', () => {
    expect(parseCliArgs(['--port', '70000'], meta).kind).toBe('error');
  });

  it('sets verbose for -v', () => {
    const result = parseCliArgs(['-v'], meta);
    expect(result.kind).toBe('serve');
    if (result.kind === 'serve') {
      expect(result.options.verbose).toBe(true);
    }
  });

  it('sets migrate and seed together', () => {
    const result = parseCliArgs(['--migrate', '--seed'], meta);
    expect(result.kind).toBe('serve');
    if (result.kind === 'serve') {
      expect(result.options.migrate).toBe(true);
      expect(result.options.seed).toBe(true);
    }
  });

  it('rejects an unknown option with usage text', () => {
    const result = parseCliArgs(['--bogus'], meta);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message.length).toBeGreaterThan(0);
      expect(result.message).toContain('Usage:');
    }
  });

  it('rejects an unknown command', () => {
    const result = parseCliArgs(['deploy'], meta);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('unknown command');
    }
  });

  it('reads the host from -H', () => {
    const result = parseCliArgs(['-H', '127.0.0.1'], meta);
    expect(result.kind).toBe('serve');
    if (result.kind === 'serve') {
      expect(result.options.host).toBe('127.0.0.1');
    }
  });
});

import { main } from '../index';

describe('main', () => {
  let stdoutSpy: jest.SpiedFunction<typeof process.stdout.write>;
  let stderrSpy: jest.SpiedFunction<typeof process.stderr.write>;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('prints usage and exits 0 for --help', async () => {
    const code = await main(['--help']);
    expect(code).toBe(0);
    const written = stdoutSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(written).toContain('Usage:');
  });

  it('prints the version and exits 0 for --version', async () => {
    const code = await main(['--version']);
    expect(code).toBe(0);
    const written = stdoutSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(written).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('prints an error and exits 1 for an unknown option', async () => {
    const code = await main(['--bogus']);
    expect(code).toBe(1);
    const written = stderrSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(written.length).toBeGreaterThan(0);
  });
});

import { APP_NAME } from '../../index';

describe('scaffold sanity', () => {
  it('exposes the application name', () => {
    expect(APP_NAME).toBe('smart-logistics-api');
  });
});

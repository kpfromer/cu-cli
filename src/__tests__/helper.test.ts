jest.mock('keytar');
jest.mock('uuid');
jest.mock('conf');
import Conf from 'conf';
import * as keytar from 'keytar';
import * as uuid from 'uuid';
import { setupConfig, toDays, toPlace } from '../helper';

describe('toPlace', () => {
  it('rounds a number to decimal place', () => {
    expect(toPlace(100.005, 2)).toEqual(100.01);
    expect(toPlace(666.0004, 3)).toEqual(666);
  });
});

describe('toDays', () => {
  it('returns monday', () => {
    expect(toDays(['MONDAY'])).toEqual(['MO']);
  });
  it('returns tuesday', () => {
    expect(toDays(['TUESDAY'])).toEqual(['TU']);
  });
  it('returns wednesday', () => {
    expect(toDays(['WEDNESDAY'])).toEqual(['WE']);
  });
  it('returns thursday', () => {
    expect(toDays(['THURSDAY'])).toEqual(['TH']);
  });
  it('returns friday', () => {
    expect(toDays(['FRIDAY'])).toEqual(['FR']);
  });
  it('returns multiple days', () => {
    expect(toDays(['MONDAY', 'WEDNESDAY', 'FRIDAY'])).toEqual(['MO', 'WE', 'FR']);
    expect(toDays(['TUESDAY', 'THURSDAY'])).toEqual(['TU', 'TH']);
  });
});

describe('setupConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('creates a config with random uuid as password', async () => {
    expect.assertions(3);
    (keytar as jest.Mocked<typeof keytar>).findPassword.mockResolvedValueOnce(null);
    (uuid as jest.Mocked<typeof uuid>).v4.mockReturnValueOnce('random-password');
    const config = await setupConfig();
    expect(keytar.setPassword).toHaveBeenCalledWith('cu-api', 'cu-api', 'random-password');
    expect(Conf).toHaveBeenCalledWith({ encryptionKey: 'random-password' });
    expect(config).toBeInstanceOf(Conf);
  });
  it('reuses config if already created', async () => {
    expect.assertions(3);
    (keytar as jest.Mocked<typeof keytar>).findPassword.mockResolvedValueOnce(
      'previously-created-password',
    );
    const config = await setupConfig();
    expect(keytar.setPassword).not.toHaveBeenCalled();
    expect(Conf).toHaveBeenCalledWith({
      encryptionKey: 'previously-created-password',
    });
    expect(config).toBeInstanceOf(Conf);
  });
});

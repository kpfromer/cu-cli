jest.mock('cu-api');
import * as CU from 'cu-api';

import { getGpa } from '../cli';

describe('getGpa', () => {
  let config: any;
  beforeEach(() => {
    jest.clearAllMocks();
    config = {
      get: jest.fn(),
      has: jest.fn()
    };
    config.get.mockImplementation((name: string) => {
      if (name === 'username') return 'mock-username';
      else if (name === 'password') return 'mock-password';
      else throw new Error();
    });
    config.has.mockImplementation((name: string) => {
      return name === 'username' || name === 'password';
    });
  });
  it('returns the gpa', async () => {
    expect.assertions(3);
    (CU as jest.Mocked<
      typeof CU
    >).CUSession.prototype.GPA.mockResolvedValueOnce({
      cum_GPA: '3.64',
      cur_GPA: '4.0'
    });
    const gpa = await getGpa(config);

    const CUSessionInstance = (CU as jest.Mocked<typeof CU>).CUSession.mock
      .instances[0];
    expect(CU.CUSession).toHaveBeenCalled();
    expect(CUSessionInstance.init).toHaveBeenCalledWith(
      'mock-username',
      'mock-password'
    );
    expect(gpa).toEqual(3.64);
  });
});

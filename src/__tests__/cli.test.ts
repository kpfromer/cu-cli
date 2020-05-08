jest.mock('cu-api');
import * as CU from 'cu-api';

import { getGpa, getCourses } from '../cli';

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

describe('getCourses', () => {
  let config: any;
  let termData: CU.ITerm[];
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
    // mock term metadata
    termData = [
      {
        term4: '2200',
        term5: 'term5',
        startDate: '2019-08-01',
        endDate: '2020-12-25',
        termFriendly: 'Fall 2019',
        attributeName: 'PREVIOUS_TERM'
      },
      {
        term4: '2201',
        term5: 'term5',
        startDate: '2020-01-01',
        endDate: '2020-04-04',
        termFriendly: 'Spring 2020',
        attributeName: 'CURRENT_TERM'
      },
      {
        term4: '2202',
        term5: 'term5',
        startDate: '2020-05-01',
        endDate: '2020-08-01',
        termFriendly: 'Summer 2020',
        attributeName: 'NEXT_TERM'
      },
      {
        term4: '2203',
        term5: 'term5',
        startDate: '2020-08-01',
        endDate: '2020-12-25',
        termFriendly: 'Fall 2020',
        attributeName: 'NEXT_NEXT_TERM'
      }
    ];
  });
  it("gets current term's courses", async () => {
    expect.assertions(4);

    const classTermData = new Map();
    classTermData.set('class-id', {
      name: 'Computer Systems'
    });

    (CU as jest.Mocked<
      typeof CU
    >).CUSession.prototype.termData.mockResolvedValueOnce(termData);

    (CU as jest.Mocked<
      typeof CU
    >).CUSession.prototype.classTermData.mockResolvedValueOnce(classTermData);

    const courses = await getCourses(config);

    const CUSessionInstance = (CU as jest.Mocked<typeof CU>).CUSession.mock
      .instances[0];
    expect(CU.CUSession).toHaveBeenCalled();
    expect(CUSessionInstance.init).toHaveBeenCalledWith(
      'mock-username',
      'mock-password'
    );
    expect(CUSessionInstance.classTermData).toHaveBeenCalledWith('2201'); // current term
    expect(courses).toEqual([classTermData.get('class-id')]);
  });
  it('errors if term is not found', () => {
    (CU as jest.Mocked<
      typeof CU
    >).CUSession.prototype.termData.mockResolvedValueOnce([
      {
        term4: '2200',
        term5: 'term5',
        startDate: '2019-08-01',
        endDate: '2020-12-25',
        termFriendly: 'Fall 2019',
        attributeName: 'PREVIOUS_TERM'
      }
    ]);

    const errorWrapper = async () => {
      await getCourses(config);
    };

    expect(errorWrapper).rejects.toThrowErrorMatchingSnapshot();
  });
});

import * as Conf from 'conf';
import { CourseV3, CUSession, ITerm } from 'cu-api';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { authorize } from './calendar';
// for tests to spy on getCourses
import * as helper from './cli';
import { toDays } from './helper';

function getLogin(config: Conf): { username: string; password: string } {
  if (!config.has('username') || !config.has('password'))
    throw new TypeError('User is not loaded in to CU.');
  return {
    username: config.get('username'),
    password: config.get('password'),
  };
}

/**
 * Creates a CU session with username and password from system keyring.
 */
async function createSession(config: Conf): Promise<CUSession> {
  const { username, password } = getLogin(config);
  const session = new CUSession();
  await session.init(username, password);
  return session;
}

/**
 * Returns the gpa as a number.
 * @param config the config for the application.
 */
export async function getGpa(config: Conf): Promise<number> {
  const { username, password } = await getLogin(config);
  const session = new CUSession();
  await session.init(username, password);
  const gpa = parseFloat((await session.GPA()).cumGpa);
  return gpa;
}

export async function getCourses(
  config: Conf,
  term: 'current' | 'next' | 'next-next' | 'previous' = 'current',
): Promise<CourseV3[]> {
  const session = await createSession(config);
  const terms = await session.termData();
  let wantedTerm: ITerm['attributeName'] = 'CURRENT_TERM';

  if (term === 'next') wantedTerm = 'NEXT_TERM';
  else if (term === 'next-next') wantedTerm = 'NEXT_NEXT_TERM';
  else if (term === 'previous') wantedTerm = 'PREVIOUS_TERM';

  const foundTerm = terms.find((term) => term.attributeName === wantedTerm);
  if (!foundTerm) {
    throw new Error('Could not find current term data.');
  }
  const courses = Array.from((await session.classTermData(foundTerm.term4)).values());
  return courses;
}

/**
 * Syncs classes from CU term to google calendar.
 */
export async function syncClassesCalendar(
  config: Conf,
  term: 'current' | 'next' | 'next-next' | 'previous' = 'current',
): Promise<void> {
  const courses = await helper.getCourses(config, term);

  if (!config.has('google')) throw new Error('Not logged in to google.');
  const auth = await authorize(config.get('google'));

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const calendar = google.calendar({ version: 'v3', auth });

  for (const course of courses) {
    if (course.classMtgPatterns.length === 0) continue;
    const {
      mtgPatStartDt,
      mtgPatEndDt,
      meetingTimeStart,
      meetingTimeEnd,
      meetingDays,
      instructors,
      descrLocation,
    } = course.classMtgPatterns[0]!;
    const startTime = DateTime.fromFormat(`${mtgPatStartDt} ${meetingTimeStart}`, 'yyyy-MM-dd T');
    const endTime = DateTime.fromFormat(`${mtgPatStartDt} ${meetingTimeEnd}`, 'yyyy-MM-dd T');
    const endDate = DateTime.fromFormat(mtgPatEndDt, 'yyyy-MM-dd', { locale: 'en' });
    // const start = course.courseStartDate
    const days = toDays(meetingDays);
    const instructorText = instructors.reduce((prev, { instructorName, instrEmailAddr }, index) => {
      if (index === 0) {
        return `\t${instructorName} - ${instrEmailAddr}`;
      }
      return prev + `\n\t${instructorName} - ${instrEmailAddr}`;
    }, '');
    console.log(`Creating "${course.courseTitleLong}" event.`);
    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: course.courseTitleLong,
        description: `Course Id: ${course.crseId}\nSubject: ${course.course}-${course.classSection}\nCredits: ${course.untTaken}\nInstructors:\n${instructorText}`,
        start: {
          dateTime: startTime.toISO(),
          timeZone: 'America/Denver',
        },
        end: {
          dateTime: endTime.toISO(),
          timeZone: 'America/Denver',
        },
        recurrence: [
          `RRULE:FREQ=WEEKLY;UNTIL=${endDate.toFormat(
            "yyyyMMdd'T'000000'Z'",
          )};WKST=SU;BYDAY=${days.join(',')}`,
        ],
        location: descrLocation,
      },
    });
  }
}

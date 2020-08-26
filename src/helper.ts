import { Day } from './types';
import * as keytar from 'keytar';
import { v4 as uuidv4 } from 'uuid';
import Conf from 'conf';
import { ClassMtgPattern } from 'cu-api';

/**
 * Rounds number to specific digit.
 * @param number the number to round.
 * @param place the digit to round to.
 */
export function toPlace(number: number, place = 2) {
  return Math.round(number * Math.pow(10, place)) / Math.pow(10, place);
}

function getDay(
  day:
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'
    | 'SUNDAY'
): Day | undefined {
  switch (day) {
    case 'MONDAY':
      return 'MO';
    case 'TUESDAY':
      return 'TU';
    case 'WEDNESDAY':
      return 'WE';
    case 'THURSDAY':
      return 'TH';
    case 'FRIDAY':
      return 'FR';
  }
  return undefined;
}

/**
 * Converts to Google recurrence days string array.
 * @param courseDays the CU days string
 */
export function toDays(courseDays: ClassMtgPattern['meetingDays']): Day[] {
  return courseDays.reduce((prev, dataDay) => {
    const day = getDay(dataDay);
    return day ? [...prev, day] : prev;
  }, [] as Day[]);
}

/**
 * Setups the secured config, using the system's keyring.
 */
export async function setupConfig(): Promise<Conf> {
  // create config for app
  const foundPassword = await keytar.findPassword('cu-api');
  let configPassword: string;
  if (!foundPassword) {
    configPassword = uuidv4();
    keytar.setPassword('cu-api', 'cu-api', configPassword);
  } else {
    configPassword = foundPassword;
  }

  return new Conf({ encryptionKey: configPassword });
}

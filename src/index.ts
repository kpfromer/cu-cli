#!/bin/env node
import * as inquirer from 'inquirer';
import * as yargs from 'yargs';
import chalk from 'chalk';
import { login, authorize } from './calendar';
import { getGpa, getCourses, syncClassesCalendar } from './cli';
import { toPlace, setupConfig } from './helper';
import { google } from 'googleapis';

(async function () {
  const config = await setupConfig();

  yargs
    .command(
      'login-cu',
      'set login info',
      () => {},
      async () => {
        const { username, password } = await inquirer.prompt([
          { type: 'input', name: 'username', message: 'Username?' },
          { type: 'password', name: 'password', message: 'Password?' },
        ]);
        config.set({
          username,
          password,
        });
      },
    )
    .command(
      'login-google',
      'set google calendar login info',
      () => {},
      async () => {
        const googleCredentials = await login();
        config.set({
          google: googleCredentials,
        });
      },
    )
    .command(
      'clean',
      'removes login info',
      () => {},
      () => {
        config.clear();
        console.log('Logged out');
      },
    )
    .command(
      'gpa',
      'gets gpa',
      () => {},
      async () => {
        const gpa = await getGpa(config);
        console.log(`${gpa} (${toPlace((gpa / 4) * 100)}%)`);
      },
    )
    // .command(
    //   'calendars',
    //   'lists calendar names',
    //   () => {},
    //   async () => {
    //     const auth = await authorize(config.get('google'));
    //     const calendar = google.calendar({ version: 'v3', auth });
    //     const calendars = await calendar.calendarList.list();
    //     calendars.data.items?.forEach((calendar) =>
    //       console.log(
    //         `Calendar name: "${calendar.summary}" Id: "${calendar.id}"`
    //       )
    //     );
    //   }
    // )
    .command<{
      term: 'current' | 'next' | 'next-next' | 'previous';
    }>(
      'courses',
      'gets course data',
      (yargs) => {
        yargs.option('t', {
          alias: 'term',
          demandCommand: true,
          default: 'current',
          describe: 'the term to grab courses from (current, next, previous)',
          type: 'string',
        });
      },
      async (argv) => {
        const courses = await getCourses(config, argv.term);
        for (const course of courses) {
          if (course.classMtgPatterns.length === 0) continue;
          const {
            meetingTimeStart,
            meetingTimeEnd,
            meetingDays,
            instructors,
          } = course.classMtgPatterns[0];
          console.log(
            `${chalk.green(course.courseTitleLong)} ${chalk.blue(
              `(${course.subject} ${course.catalogNbr}-${course.classSection}) ${chalk.red(
                `${course.untTaken} credits `,
              )} ${meetingDays.join(', ')} ${meetingTimeStart}-${meetingTimeEnd}`,
            )}`,
          );
          for (const { instructorName, instrEmailAddr } of instructors) {
            console.log(`\t${instructorName} - ${instrEmailAddr}`);
          }
        }
      },
    )
    .command<{
      term: 'current' | 'next' | 'next-next' | 'previous';
    }>(
      'sync',
      'syncs classes from term to google calendar',
      (yargs) => {
        yargs.option('t', {
          alias: 'term',
          demandCommand: true,
          default: 'current',
          describe: 'the term to grab courses from (current, next, next-next, previous)',
          type: 'string',
        });
        // yargs.option('c', {
        //   alias: 'calendarName',
        //   demandCommand: true,
        //   default: 'primary',
        //   describe: 'the name of the calendar to sync to.',
        //   type: 'string'
        // })
      },
      async (argv) => {
        await syncClassesCalendar(config, argv.term);
      },
    )
    .scriptName('cu-cli')
    .alias('h', 'help')
    .help().argv;
})();

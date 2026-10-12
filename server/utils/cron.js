const cron = require('node-cron');
const { runCheckInJobs } = require('./checkins');

const DEFAULT_SCHEDULE = '0 9 * * *';

async function runAndLog(trigger) {
  try {
    const result = await runCheckInJobs();
    console.log(`[cron] Check-in job (${trigger}): ${result.reminded} reminder(s) sent, ${result.missed} marked missed`);
  } catch (err) {
    console.error('[cron] Check-in job failed:', err.message);
  }
}

function startCronJobs() {
  const schedule = process.env.CHECKIN_CRON || DEFAULT_SCHEDULE;
  if (!cron.validate(schedule)) {
    console.error(`[cron] Invalid CHECKIN_CRON "${schedule}", using "${DEFAULT_SCHEDULE}"`);
  }
  const task = cron.schedule(cron.validate(schedule) ? schedule : DEFAULT_SCHEDULE, () => runAndLog('scheduled'), {
    timezone: process.env.TZ || 'Asia/Kolkata',
  });
  runAndLog('startup');
  return task;
}

module.exports = { startCronJobs };

// Background jobs that run while the API is up.
const flash = require('./flash');
const backup = require('./backup');

let started = false;

function every(ms, name, fn) {
  const run = () => fn().catch((e) => console.warn(`[scheduler] ${name}:`, e.message));
  setTimeout(run, 5000);
  return setInterval(run, ms);
}

function start() {
  if (started) return;
  started = true;
  every(30 * 1000, 'flash sales', flash.tick);
  every(10 * 60 * 1000, 'daily backup', backup.dailyCheck);
}

module.exports = { start };

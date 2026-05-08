/**
 * Handles register/login + warp sequence with safe randomized delays.
 */
'use strict';

module.exports = async function runJoinSequence(bot, config, chat, log, state) {
  const seq = config.joinSequence;
  const safeMode = config.antiBotSafeMode !== false;

  // Initial human-like idle period after spawn
  const initialDelay = safeMode ? rand(3500, 6500) : rand(1500, 3000);
  log.info(`Waiting ${(initialDelay / 1000).toFixed(1)}s before authenticating...`);
  await sleep(initialDelay);

  // Decide register vs login.
  // We try /login first; if AuthMe is unhappy and this is a brand-new account,
  // we register. Most AuthMe servers respond with a hint to register if needed.
  if (!state.firstJoinDone) {
    log.info('First join — sending /register');
    await chat.send(seq.registerCommand);
    state.onRegistered && state.onRegistered();
  } else {
    log.info('Sending /login');
    await chat.send(seq.loginCommand);
  }

  // Wait for AuthMe to process
  await sleep(seq.postLoginDelay ?? 6000);

  // Run warp commands sequentially with delays
  for (const cmd of seq.warpCommands || []) {
    log.info(`Executing: ${cmd}`);
    await chat.send(cmd);
    await sleep((seq.warpInterDelay ?? 8000) + rand(0, 2500));
  }

  log.success('Join sequence complete. Bot is now AFK.');
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

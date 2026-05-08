/**
 * Auto-sleep — finds nearby beds at night and sleeps in them.
 */
'use strict';

module.exports = function installAutoSleep(bot, config, log) {
  const cfg = config.autoSleep || {};
  if (!cfg.enabled) {
    log.info('Auto-sleep disabled.');
    return;
  }

  const radius = cfg.searchRadius ?? 16;
  let busy = false;

  const tryToSleep = async () => {
    if (busy || !bot.entity || bot.isSleeping) return;
    // Mineflayer exposes time.timeOfDay; night is roughly 13000–23000.
    if (!bot.time || bot.time.timeOfDay < 12541 || bot.time.timeOfDay > 23458) return;

    const bed = bot.findBlock({
      matching: (block) => bot.isABed && bot.isABed(block),
      maxDistance: radius
    });
    if (!bed) return;

    busy = true;
    try {
      log.event('SLEEP', `Found bed at ${bed.position}. Attempting to sleep.`);
      await bot.sleep(bed);
      log.success('Bot is now sleeping.');
    } catch (err) {
      log.warn(`Sleep failed: ${err.message}`);
    } finally {
      busy = false;
    }
  };

  const interval = setInterval(tryToSleep, 30 * 1000);

  bot.on('wake', () => log.success('Bot woke up.'));
  bot.once('end', () => clearInterval(interval));

  log.info('Auto-sleep module active.');
};

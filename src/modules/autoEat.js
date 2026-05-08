/**
 * Auto-eat using mineflayer-auto-eat plugin.
 */
'use strict';

module.exports = function installAutoEat(bot, config, log) {
  const cfg = config.autoEat || {};
  if (!cfg.enabled) {
    log.info('Auto-eat disabled.');
    return;
  }
  if (!bot.autoEat) {
    log.warn('autoEat plugin not loaded.');
    return;
  }

  // Plugin v5 API
  bot.autoEat.opts = {
    priority: cfg.priority || 'foodPoints',
    startAt: cfg.startAt ?? 14,
    bannedFood: cfg.bannedFood || []
  };

  bot.on('autoeat_started', (item) => {
    log.event('EAT', `Eating ${item?.name ?? 'food'}...`);
  });
  bot.on('autoeat_finished', (item) => {
    log.success(`Finished eating ${item?.name ?? 'food'}.`);
  });
  bot.on('autoeat_error', (err) => {
    log.warn(`Auto-eat error: ${err?.message ?? err}`);
  });

  log.info('Auto-eat module active.');
};

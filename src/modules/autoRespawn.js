/**
 * Auto-respawn on death + optional /back command.
 */
'use strict';

module.exports = function installAutoRespawn(bot, config, chat, log) {
  const cfg = config.autoRespawn || {};
  if (!cfg.enabled) return;

  bot.on('death', async () => {
    log.event('DEATH', 'Bot died — respawning shortly.');
    // Mineflayer respawns automatically when the client sends client_command;
    // calling bot.respawn() ensures it.
    setTimeout(() => {
      try { bot.respawn?.(); } catch (_) {}
    }, cfg.respawnDelay ?? 4000);

    if (cfg.executeBack && cfg.backCommand) {
      // Wait for respawn, then send /back
      setTimeout(() => chat.send(cfg.backCommand), (cfg.respawnDelay ?? 4000) + 4000);
    }
  });

  log.info('Auto-respawn module active.');
};

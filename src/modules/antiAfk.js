/**
 * Human-like Anti-AFK module.
 * - Random head turns
 * - Occasional sneak toggles
 * - Periodic small jumps
 * - Tiny positional micro-movements
 */
'use strict';

module.exports = function installAntiAfk(bot, config, log) {
  const cfg = config.antiAfk || {};
  if (!cfg.enabled) {
    log.info('Anti-AFK disabled.');
    return;
  }

  const timers = [];
  const schedule = (fn, min, max) => {
    const run = () => {
      try { fn(); } catch (_) {}
      const t = setTimeout(run, rand(min, max));
      timers.push(t);
    };
    const t = setTimeout(run, rand(min, max));
    timers.push(t);
  };

  schedule(() => {
    if (!bot.entity) return;
    const yaw = (Math.random() * 2 - 1) * Math.PI;
    const pitch = (Math.random() * 0.6) - 0.3;
    bot.look(yaw, pitch, true).catch(() => {});
  }, cfg.lookIntervalMin ?? 8000, cfg.lookIntervalMax ?? 20000);

  schedule(() => {
    if (!bot.entity) return;
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 350);
  }, cfg.jumpIntervalMin ?? 45000, cfg.jumpIntervalMax ?? 120000);

  schedule(() => {
    if (!bot.entity) return;
    bot.setControlState('sneak', true);
    setTimeout(() => bot.setControlState('sneak', false), rand(800, 1800));
  }, cfg.sneakIntervalMin ?? 60000, cfg.sneakIntervalMax ?? 180000);

  schedule(() => {
    if (!bot.entity) return;
    const dirs = ['forward', 'back', 'left', 'right'];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    bot.setControlState(dir, true);
    setTimeout(() => bot.setControlState(dir, false), rand(250, 700));
  }, cfg.moveIntervalMin ?? 90000, cfg.moveIntervalMax ?? 240000);

  bot.once('end', () => timers.forEach(clearTimeout));
  log.info('Anti-AFK module active (human-like).');
};

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

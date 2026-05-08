/**
 * Reconnect Manager
 * - Handles bot lifecycle and intelligent reconnection.
 * - Detects Sonar AntiBot kicks and applies long randomized delays.
 * - Uses exponential backoff for normal failures.
 */
'use strict';

const log = require('./logger');
const { createBot } = require('./bot');

class ReconnectManager {
  constructor(config) {
    this.config = config;
    this.attempts = 0;
    this.firstJoinDone = false; // Tracks whether /register has run successfully
    this.bot = null;
    this.shuttingDown = false;
  }

  start() {
    this.spawnBot();
  }

  spawnBot() {
    if (this.shuttingDown) return;

    const max = this.config.maxReconnectAttempts || 0;
    if (max > 0 && this.attempts >= max) {
      log.error(`Reached max reconnect attempts (${max}). Exiting.`);
      process.exit(1);
    }

    this.attempts++;
    log.info(`Connecting (attempt #${this.attempts})...`);

    try {
      this.bot = createBot(this.config, {
        firstJoinDone: this.firstJoinDone,
        onRegistered: () => { this.firstJoinDone = true; },
        onReady:      () => { this.attempts = 0; }, // Reset on stable connection
        onEnd:        (reason, info) => this.scheduleReconnect(reason, info)
      });
    } catch (err) {
      log.error(`Bot creation failed: ${err.message}`);
      this.scheduleReconnect('createError', { message: err.message });
    }
  }

  scheduleReconnect(reason, info = {}) {
    if (this.shuttingDown) return;

    const delay = this.computeDelay(reason, info);
    const minutes = (delay / 60000).toFixed(2);
    log.warn(`Reconnecting in ${minutes} min (reason: ${reason})`);

    setTimeout(() => this.spawnBot(), delay);
  }

  /**
   * Compute reconnection delay:
   * - AntiBot/Sonar kicks => 5–15 min randomized
   * - Normal disconnects  => baseline + exponential backoff + jitter
   */
  computeDelay(reason, info) {
    const cfg = this.config;
    const text = (info.message || info.reason || '').toString().toLowerCase();

    const isAntiBot =
      reason === 'antibot' ||
      text.includes('antibot') ||
      text.includes('sonar') ||
      text.includes('denied from entering') ||
      text.includes('please wait a few minutes');

    if (isAntiBot) {
      log.event('ANTIBOT', 'Sonar AntiBot kick detected — using extended cooldown.');
      const min = cfg.antiBotKickDelayMin ?? 300000;
      const max = cfg.antiBotKickDelayMax ?? 900000;
      return rand(min, max);
    }

    // Exponential backoff capped at 10 minutes
    const base = cfg.reconnectDelay ?? 120000;
    const backoff = Math.min(base * Math.pow(1.5, Math.max(0, this.attempts - 1)), 600000);
    const jitter = rand(0, cfg.reconnectJitter ?? 30000);
    return Math.floor(backoff + jitter);
  }
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = ReconnectManager;

/**
 * ChatQueue — sequential, rate-limited command sender with human-like delays.
 * Prevents kick from "spamming commands" detection.
 */
'use strict';

class ChatQueue {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
    this.queue = [];
    this.running = false;
    this.stopped = false;
  }

  send(message, opts = {}) {
    return new Promise((resolve) => {
      this.queue.push({ message, opts, resolve });
      this.tick();
    });
  }

  async tick() {
    if (this.running || this.stopped) return;
    this.running = true;

    while (this.queue.length && !this.stopped) {
      const { message, opts, resolve } = this.queue.shift();

      // Pre-typing delay (simulates a human reaching keyboard)
      const typeMin = this.config.typingDelayMin ?? 200;
      const typeMax = this.config.typingDelayMax ?? 600;
      await sleep(rand(typeMin, typeMax));

      try {
        if (this.bot && this.bot.player) {
          this.bot.chat(message);
        }
      } catch (err) {
        // Swallow — don't crash on chat failure
      }
      resolve();

      // Post-send delay
      const baseDelay = opts.delay ?? this.config.commandDelay ?? 5000;
      const jitter = rand(0, this.config.commandDelayJitter ?? 2500);
      await sleep(baseDelay + jitter);
    }

    this.running = false;
  }

  stop() {
    this.stopped = true;
    this.queue = [];
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

module.exports = ChatQueue;

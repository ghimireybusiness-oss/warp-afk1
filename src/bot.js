/**
 * Bot Factory
 * Creates and wires up a single Mineflayer bot instance with all modules.
 */
'use strict';

const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const { loader: autoEatLoader } = require('mineflayer-auto-eat');

const log = require('./logger');
const ChatQueue = require('./chatQueue');
const runJoinSequence = require('./joinSequence');
const installAntiAfk = require('./modules/antiAfk');
const installAutoEat = require('./modules/autoEat');
const installAutoSleep = require('./modules/autoSleep');
const installAutoRespawn = require('./modules/autoRespawn');

function createBot(config, hooks) {
  const botOptions = {
    host: config.host,
    port: config.port,
    username: config.username,
    version: config.version,
    auth: config.useMicrosoftAuth ? 'microsoft' : 'offline',
    // Hide error spam from disconnects; we manage them manually:
    hideErrors: false,
    // Keep checkTimeoutInterval reasonable to detect zombie connections:
    checkTimeoutInterval: 60 * 1000
  };

  // Password for online auth only; cracked servers ignore it.
  if (config.useMicrosoftAuth && config.password) {
    botOptions.password = config.password;
  }

  const bot = mineflayer.createBot(botOptions);

  // --- Load plugins safely -------------------------------------------------
  try { bot.loadPlugin(pathfinder); } catch (e) { log.warn(`pathfinder load: ${e.message}`); }
  try { bot.loadPlugin(autoEatLoader); } catch (e) { log.warn(`auto-eat load: ${e.message}`); }

  // --- Chat queue: rate-limited, human-like commands -----------------------
  const chat = new ChatQueue(bot, config);

  // --- Lifecycle wiring ----------------------------------------------------
  let ended = false;
  const finish = (reason, info = {}) => {
    if (ended) return;
    ended = true;
    try { chat.stop(); } catch (_) {}
    try { bot.removeAllListeners(); } catch (_) {}
    try { bot.end(); } catch (_) {}
    hooks.onEnd && hooks.onEnd(reason, info);
  };

  // Catch errors at the bot level so they never escape to crash the process.
  bot.on('error', (err) => {
    const msg = err && err.message ? err.message : String(err);
    log.error(`Bot error: ${msg}`);
    // Common chunk/packet decode issues — log only, don't end here.
    if (/PartialReadError|Read error|unknown chunk format|ECONNRESET/i.test(msg)) {
      log.warn('Network/protocol hiccup — letting connection self-recover.');
    }
  });

  bot.on('kicked', (reasonRaw) => {
    const reasonText = stringifyReason(reasonRaw);
    log.event('KICK', reasonText);

    const lower = reasonText.toLowerCase();
    const isAntiBot =
      lower.includes('antibot') ||
      lower.includes('sonar') ||
      lower.includes('denied from entering') ||
      lower.includes('please wait a few minutes');

    finish(isAntiBot ? 'antibot' : 'kicked', { message: reasonText });
  });

  bot.on('end', (reason) => {
    log.event('END', `Connection ended (${reason || 'unknown'})`);
    finish('end', { reason });
  });

  bot.on('login', () => {
    log.success(`Logged in as ${bot.username}`);
  });

  bot.on('spawn', async () => {
    log.success(`Spawned in world. Position: ${formatPos(bot.entity.position)}`);
    hooks.onReady && hooks.onReady();

    // Install behavior modules after the bot is alive in the world.
    installAutoRespawn(bot, config, chat, log);
    installAutoEat(bot, config, log);
    installAutoSleep(bot, config, log);
    installAntiAfk(bot, config, log);

    // Run the login/register sequence.
    try {
      await runJoinSequence(bot, config, chat, log, {
        firstJoinDone: hooks.firstJoinDone,
        onRegistered: hooks.onRegistered
      });
    } catch (err) {
      log.error(`Join sequence error: ${err.message}`);
    }
  });

  bot.on('messagestr', (msg) => {
    // Light-weight logger; avoids heavy chat formatting.
    if (msg && msg.length < 300) log.chat(msg);

    const lower = msg.toLowerCase();
    if (lower.includes('successfully logged in') || lower.includes('you have been logged in')) {
      log.success('AuthMe login confirmed.');
    }
    if (lower.includes('successfully registered') || lower.includes('you have been registered')) {
      log.success('AuthMe registration confirmed.');
      hooks.onRegistered && hooks.onRegistered();
    }
  });

  bot.on('death', () => {
    log.event('DEATH', 'Bot died.');
  });

  return bot;
}

function stringifyReason(raw) {
  if (!raw) return 'unknown';
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return flattenJsonText(parsed);
    } catch {
      return raw;
    }
  }
  return flattenJsonText(raw);
}

function flattenJsonText(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  let out = obj.text || '';
  if (Array.isArray(obj.extra)) out += obj.extra.map(flattenJsonText).join('');
  if (Array.isArray(obj)) out += obj.map(flattenJsonText).join('');
  return out;
}

function formatPos(p) {
  return p ? `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}` : 'n/a';
}

module.exports = { createBot };

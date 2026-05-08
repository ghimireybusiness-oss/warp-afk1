/**
 * Minecraft AFK Bot — Entry Point
 * Node.js 20 LTS required (NOT Node 24).
 *
 * Loads configuration, sets up global crash protection,
 * and delegates lifecycle handling to the reconnect manager.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const log = require('./src/logger');
const ReconnectManager = require('./src/reconnect');

// --- Node.js version guard -------------------------------------------------
const major = parseInt(process.versions.node.split('.')[0], 10);
if (major >= 24) {
  log.error(`Node.js ${process.versions.node} is unsupported. Use Node.js 20 LTS.`);
  process.exit(1);
}
if (major < 20) {
  log.warn(`Node.js ${process.versions.node} detected. Node 20 LTS recommended.`);
}

// --- Load config -----------------------------------------------------------
const configPath = path.join(__dirname, 'config.json');
let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  log.error(`Failed to load config.json: ${err.message}`);
  process.exit(1);
}

// --- Global crash protection ----------------------------------------------
// These prevent the entire process from dying on transient packet/chunk errors.
process.on('uncaughtException', (err) => {
  log.error(`[uncaughtException] ${err.message}`);
  if (err.stack) log.debug(err.stack);
});

process.on('unhandledRejection', (reason) => {
  log.error(`[unhandledRejection] ${reason instanceof Error ? reason.message : reason}`);
});

process.on('SIGINT', () => {
  log.info('SIGINT received. Shutting down gracefully.');
  process.exit(0);
});
process.on('SIGTERM', () => {
  log.info('SIGTERM received. Shutting down gracefully.');
  process.exit(0);
});

// --- Boot ------------------------------------------------------------------
log.banner(`Minecraft AFK Bot — ${config.username}@${config.host}:${config.port} (${config.version})`);
const manager = new ReconnectManager(config);
manager.start();

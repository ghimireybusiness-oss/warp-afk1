/**
 * Pretty console logger with color and timestamps.
 */
'use strict';

const chalk = require('chalk');

const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

module.exports = {
  info:    (msg) => console.log(`${chalk.gray(ts())} ${chalk.cyan('[INFO] ')} ${msg}`),
  warn:    (msg) => console.log(`${chalk.gray(ts())} ${chalk.yellow('[WARN] ')} ${msg}`),
  error:   (msg) => console.log(`${chalk.gray(ts())} ${chalk.red('[ERROR]')} ${msg}`),
  success: (msg) => console.log(`${chalk.gray(ts())} ${chalk.green('[OK]   ')} ${msg}`),
  debug:   (msg) => process.env.DEBUG && console.log(`${chalk.gray(ts())} ${chalk.magenta('[DEBUG]')} ${msg}`),
  chat:    (msg) => console.log(`${chalk.gray(ts())} ${chalk.blueBright('[CHAT] ')} ${msg}`),
  event:   (tag, msg) => console.log(`${chalk.gray(ts())} ${chalk.hex('#FFA500')(`[${tag}]`)} ${msg}`),
  banner:  (msg) => {
    const line = '─'.repeat(Math.min(msg.length + 4, 80));
    console.log(chalk.cyan(`\n${line}\n  ${msg}\n${line}\n`));
  }
};

import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import settings from './settings.js';
import connectToWhatsApp from './connection.js';

let isBooting = false;
let bootedSocket = null;

function printBanner() {
  const line = '═'.repeat(72);
  console.log(chalk.cyan(line));
  console.log(chalk.cyan.bold('   DilzzXy WhatsApp AI Multi-Tool Bot')); 
  console.log(chalk.white(`   Bot    : ${settings.botIdentity.botName}`));
  console.log(chalk.white(`   Owner  : ${settings.botIdentity.ownerName} (${settings.botIdentity.owner})`));
  console.log(chalk.white(`   Node   : ${process.version}`));
  console.log(chalk.white(`   Mode   : ${process.env.NODE_ENV || 'development'}`));
  console.log(chalk.cyan(line));
}

function setupProcessGuards() {
  process.on('uncaughtException', (error) => {
    console.error(chalk.red('[uncaughtException]'), error);
  });

  process.on('unhandledRejection', (reason) => {
    console.error(chalk.red('[unhandledRejection]'), reason);
  });

  process.on('warning', (warning) => {
    console.warn(chalk.yellow('[warning]'), warning?.stack || warning);
  });

  const shutdown = async (signal) => {
    console.log(chalk.yellow(`[signal] ${signal} diterima, shutdown...`));
    try {
      await bootedSocket?.ws?.close?.();
    } catch (error) {
      console.error(chalk.red('[shutdown] gagal close socket'), error);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

function setupDevPluginWatcher() {
  if (process.env.NODE_ENV === 'production' || !settings.systemConfig.pluginWatchDevOnly) {
    return;
  }

  const pluginDir = settings.paths.plugin;
  if (!fs.existsSync(pluginDir)) return;

  fs.watch(pluginDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const fullPath = path.join(pluginDir, filename);
    console.log(chalk.magenta(`[plugin-watch] ${eventType}: ${fullPath}`));
  });
}

export async function bootstrap() {
  if (isBooting) {
    console.log(chalk.yellow('[boot] bootstrap already running, skipped.'));
    return bootedSocket;
  }

  isBooting = true;

  try {
    settings.initProjectFiles();
    settings.applyGlobals();
    printBanner();
    setupProcessGuards();
    setupDevPluginWatcher();

    bootedSocket = await connectToWhatsApp();
    return bootedSocket;
  } finally {
    isBooting = false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrap().catch((error) => {
    console.error(chalk.red('[fatal] gagal boot bot'), error);
    process.exit(1);
  });
}

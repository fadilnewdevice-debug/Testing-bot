import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pino from 'pino';
import axios from 'axios';
import mime from 'mime-types';
import { Boom } from '@hapi/boom';
import {
  makeWASocket,
  makeInMemoryStore,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  getContentType,
  jidDecode,
  downloadContentFromMessage,
  makeCacheableSignalKeyStore
} from '@itsliaaa/baileys';
import settings, {
  botIdentity,
  paths,
  messages,
  databaseFiles,
  initProjectFiles,
  applyGlobals,
  systemConfig,
  taskConfig
} from './settings.js';

const logger = pino({ level: 'silent' });
const tempQueue = new Map();
const msgRetryCounterCache = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = makeInMemoryStore({
  logger: pino({ level: 'silent' })
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeJid(jid = '') {
  if (!jid) return jid;
  if (jid.endsWith('@lid')) return jid.replace(/@lid$/, '@s.whatsapp.net');
  const decoded = jidDecode(jid);
  return decoded?.user && decoded?.server ? `${decoded.user}@${decoded.server}` : jid;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function resolveToBuffer(input) {
  if (!input) return Buffer.alloc(0);

  if (Buffer.isBuffer(input)) return input;

  if (input instanceof Uint8Array) return Buffer.from(input);

  if (typeof input === 'string') {
    if (/^data:.*?;base64,/i.test(input)) {
      return Buffer.from(input.split(',')[1], 'base64');
    }

    if (/^https?:\/\//i.test(input)) {
      const { data } = await axios.get(input, {
        responseType: 'arraybuffer',
        timeout: taskConfig.downloadTimeoutMs
      });
      return Buffer.from(data);
    }

    const localPath = path.isAbsolute(input) ? input : path.join(__dirname, input);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }

    return Buffer.from(input);
  }

  if (typeof input === 'object' && input.url) {
    return resolveToBuffer(input.url);
  }

  return Buffer.alloc(0);
}

function getTextFromMessage(message = {}) {
  const msg = message.message || message;
  if (!msg) return '';

  const type = getContentType(msg);
  if (!type) return '';

  const content = msg[type] || {};

  return (
    content.text
    || content.caption
    || content.conversation
    || content.contentText
    || content.selectedDisplayText
    || content.title
    || content.singleSelectReply?.selectedRowId
    || content.selectedId
    || ''
  );
}

function getQuotedObject(msg = {}) {
  const content = msg.message || {};
  const type = getContentType(content);
  if (!type) return null;

  const container = content[type] || {};
  const contextInfo = container.contextInfo || {};
  const quotedMessage = contextInfo.quotedMessage;
  if (!quotedMessage) return null;

  const quotedType = getContentType(quotedMessage);

  return {
    key: {
      remoteJid: msg.key.remoteJid,
      id: contextInfo.stanzaId,
      participant: contextInfo.participant,
      fromMe: normalizeJid(contextInfo.participant) === normalizeJid(global.nomorBot)
    },
    message: quotedMessage,
    mtype: quotedType,
    text: getTextFromMessage({ message: quotedMessage }),
    participant: contextInfo.participant,
    mentionedJid: contextInfo.mentionedJid || []
  };
}

function isJidGroup(jid = '') {
  return jid.endsWith('@g.us');
}

function isJidStatus(jid = '') {
  return jid === 'status@broadcast';
}

function isJidBroadcast(jid = '') {
  return jid.endsWith('@broadcast');
}

function shouldIgnoreMessage(msg) {
  const remoteJid = msg?.key?.remoteJid || '';
  if (!remoteJid) return true;

  if (isJidStatus(remoteJid)) return true;
  if (msg.key?.fromMe) return true;

  return false;
}

async function loadPluginHandler() {
  const pluginPath = path.join(paths.plugin, 'multiToolAi.js');
  if (!fs.existsSync(pluginPath)) {
    return { handleIncomingText: null, default: null };
  }

  const moduleUrl = pathToFileURL(pluginPath).href;
  return import(moduleUrl);
}

async function downloadMessageMedia(messagePart, mediaType) {
  const stream = await downloadContentFromMessage(messagePart, mediaType);
  return streamToBuffer(stream);
}

function installSocketHelpers(sock) {
  sock.decodeJid = normalizeJid;

  sock.queue = async (chatId, task) => {
    const current = tempQueue.get(chatId) || Promise.resolve();

    const runTask = current
      .catch(() => {})
      .then(async () => {
        await sleep(10);
        return task();
      });

    tempQueue.set(chatId, runTask.finally(() => {
      if (tempQueue.get(chatId) === runTask) tempQueue.delete(chatId);
    }));

    return runTask;
  };

  sock.getName = async (jid, withoutContact = false) => {
    const id = normalizeJid(jid);
    const isGroup = isJidGroup(id);

    if (isGroup) {
      const groupMeta = await sock.groupMetadata(id).catch(() => null);
      return groupMeta?.subject || 'Unknown Group';
    }

    const contact = store.contacts[id] || {};
    if (withoutContact) {
      return contact.name || contact.notify || id.split('@')[0];
    }

    return contact.verifiedName || contact.name || contact.notify || id.split('@')[0];
  };

  sock.sendText = async (jid, text, quoted, options = {}) => (
    sock.sendMessage(jid, { text, ...options }, { quoted })
  );

  sock.sendReact = async (jid, text, key) => (
    sock.sendMessage(jid, { react: { text, key } })
  );

  sock.sendImage = async (jid, source, caption = '', quoted, options = {}) => {
    const buffer = await resolveToBuffer(source);
    return sock.sendMessage(jid, { image: buffer, caption, ...options }, { quoted });
  };

  sock.sendVideo = async (jid, source, caption = '', quoted, options = {}) => {
    const buffer = await resolveToBuffer(source);
    return sock.sendMessage(jid, { video: buffer, caption, ...options }, { quoted });
  };

  sock.sendAudio = async (jid, source, quoted, options = {}) => {
    const buffer = await resolveToBuffer(source);
    return sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', ptt: false, ...options }, { quoted });
  };

  sock.sendDocument = async (jid, source, fileName = 'file', quoted, options = {}) => {
    const buffer = await resolveToBuffer(source);
    const mimetype = mime.lookup(fileName) || 'application/octet-stream';
    return sock.sendMessage(jid, {
      document: buffer,
      mimetype,
      fileName,
      ...options
    }, { quoted });
  };

  sock.sendFile = async (jid, source, fileName = 'file', caption = '', quoted, options = {}) => {
    const buffer = await resolveToBuffer(source);
    const mimetype = mime.lookup(fileName) || 'application/octet-stream';

    if (mimetype.startsWith('image/')) {
      return sock.sendMessage(jid, { image: buffer, caption, ...options }, { quoted });
    }

    if (mimetype.startsWith('video/')) {
      return sock.sendMessage(jid, { video: buffer, caption, ...options }, { quoted });
    }

    if (mimetype.startsWith('audio/')) {
      return sock.sendMessage(jid, { audio: buffer, mimetype, ...options }, { quoted });
    }

    return sock.sendDocument(jid, buffer, fileName, quoted, options);
  };

  sock.sendButton = async (jid, text, footer, buttons = [], quoted, options = {}) => {
    const formattedButtons = buttons.map((btn, idx) => ({
      buttonId: btn.id || `btn_${idx + 1}`,
      buttonText: { displayText: btn.text || `Button ${idx + 1}` },
      type: 1
    }));

    return sock.sendMessage(jid, {
      text,
      footer,
      buttons: formattedButtons,
      headerType: 1,
      ...options
    }, { quoted });
  };

  sock.sendList = async (jid, text, footer, title, buttonText, sections = [], quoted, options = {}) => (
    sock.sendMessage(jid, { text, footer, title, buttonText, sections, ...options }, { quoted })
  );

  sock.sendPoll = async (jid, name, values = [], selectableCount = 1, quoted) => (
    sock.sendMessage(jid, { poll: { name, values, selectableCount } }, { quoted })
  );

  sock.sendContact = async (jid, contacts = [], quoted, options = {}) => {
    const list = Array.isArray(contacts) ? contacts : [contacts];
    const vcardList = list.map((contact) => {
      const number = String(contact.number || '').replace(/[^0-9]/g, '');
      const name = contact.name || number;
      const vcard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${name}`,
        `TEL;type=CELL;type=VOICE;waid=${number}:${number}`,
        'END:VCARD'
      ].join('\n');

      return { displayName: name, vcard };
    });

    return sock.sendMessage(jid, { contacts: { displayName: `${vcardList.length} kontak`, contacts: vcardList }, ...options }, { quoted });
  };

  sock.sendCarousel = async (jid, text, items = [], quoted, options = {}) => {
    const sections = [{
      title: 'Pilihan',
      rows: items.map((item, idx) => ({
        title: item.title || `Item ${idx + 1}`,
        description: item.description || '',
        rowId: item.id || `carousel_${idx + 1}`
      }))
    }];

    return sock.sendList(jid, text, options.footer || '', options.title || 'Menu', options.buttonText || 'Lihat', sections, quoted, options);
  };

  sock.sendInteractive = async (jid, payload, quoted, options = {}) => (
    sock.sendMessage(jid, payload, { quoted, ...options })
  );

  sock.copyNForward = async (jid, message, forceForward = false, options = {}) => {
    let vtype;
    if (options.readViewOnce) {
      message.message = message.message?.ephemeralMessage?.message || message.message;
      vtype = Object.keys(message.message.viewOnceMessage?.message || {})[0];
      delete message.message?.ignore;
      delete message.message?.viewOnceMessage?.message?.[vtype]?.viewOnce;
      message.message = {
        ...message.message.viewOnceMessage.message
      };
    }

    const content = await sock.generateForwardMessageContent(message, forceForward);
    const ctype = Object.keys(content)[0];
    const context = message.message?.[Object.keys(message.message)[0]]?.contextInfo || {};
    content[ctype].contextInfo = {
      ...context,
      ...content[ctype].contextInfo,
      ...options.contextInfo
    };

    const waMessage = await sock.generateWAMessageFromContent(jid, content, options ? {
      ...content[ctype],
      ...options,
      ...(options.contextInfo ? { contextInfo: options.contextInfo } : {})
    } : {});

    await sock.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
    return waMessage;
  };

  sock.cMod = (jid, copy, text = '', sender = sock.user?.id, options = {}) => {
    const mtype = getContentType(copy.message);
    const msg = copy.message[mtype];

    if (typeof msg === 'string') {
      copy.message[mtype] = text || msg;
    } else if (msg.caption) {
      msg.caption = text || msg.caption;
    } else if (msg.text) {
      msg.text = text || msg.text;
    }

    if (typeof msg !== 'string') {
      copy.message[mtype] = { ...msg, ...options };
    }

    copy.key.participant = sender;
    copy.key.remoteJid = jid;
    copy.key.fromMe = normalizeJid(sender) === normalizeJid(sock.user?.id);

    return copy;
  };
}

function serializeMessage(sock, rawMessage) {
  const m = rawMessage;
  const chat = m.key.remoteJid;
  const sender = normalizeJid(m.key.participant || (m.key.fromMe ? sock.user?.id : chat));
  const mtype = getContentType(m.message || {});
  const text = getTextFromMessage(m);
  const quoted = getQuotedObject(m);
  const mentions = m.message?.[mtype]?.contextInfo?.mentionedJid || [];

  const s = {
    id: m.key.id,
    chat,
    sender,
    pushName: m.pushName || 'No Name',
    fromMe: Boolean(m.key.fromMe),
    isGroup: isJidGroup(chat),
    isStatus: isJidStatus(chat),
    isBroadcast: isJidBroadcast(chat),
    mtype,
    text,
    mentions,
    quoted,
    raw: m,
    message: m.message,
    reply: (txt, opts = {}) => sock.sendText(chat, txt, m, opts),
    react: (emoji) => sock.sendReact(chat, emoji, m.key),
    sendText: (txt, opts = {}) => sock.sendText(chat, txt, m, opts),
    sendImage: (src, caption = '', opts = {}) => sock.sendImage(chat, src, caption, m, opts),
    sendVideo: (src, caption = '', opts = {}) => sock.sendVideo(chat, src, caption, m, opts),
    sendAudio: (src, opts = {}) => sock.sendAudio(chat, src, m, opts),
    sendFile: (src, fileName = 'file', caption = '', opts = {}) => sock.sendFile(chat, src, fileName, caption, m, opts),
    downloadMedia: async () => {
      if (!mtype || !m.message?.[mtype]) return Buffer.alloc(0);
      const mediaType = mtype.replace('Message', '');
      return downloadMessageMedia(m.message[mtype], mediaType);
    },
    downloadQuotedMedia: async () => {
      if (!quoted?.mtype || !quoted?.message?.[quoted.mtype]) return Buffer.alloc(0);
      const mediaType = quoted.mtype.replace('Message', '');
      return downloadMessageMedia(quoted.message[quoted.mtype], mediaType);
    }
  };

  return s;
}

async function handleIncomingMessage(sock, msg) {
  if (!msg?.message || shouldIgnoreMessage(msg)) return;

  const serialized = serializeMessage(sock, msg);

  try {
    const pluginModule = await loadPluginHandler();
    if (typeof pluginModule.handleIncomingText === 'function') {
      await pluginModule.handleIncomingText({ sock, m: serialized, settings });
      return;
    }

    if (typeof pluginModule.default === 'function') {
      await pluginModule.default({ sock, m: serialized, settings });
      return;
    }

    if (serialized.text) {
      await serialized.reply(messages.wait);
    }
  } catch (error) {
    console.error('[plugin-error]', error);
    if (serialized?.chat) {
      await sock.sendText(serialized.chat, messages.error, serialized.raw).catch(() => null);
    }
  }
}

export default async function connectToWhatsApp() {
  initProjectFiles();
  applyGlobals();

  const { state, saveCreds } = await useMultiFileAuthState(paths.session);
  const { version } = await fetchLatestBaileysVersion();

  if (fs.existsSync(databaseFiles.baileysStore)) {
    try {
      store.readFromFile(databaseFiles.baileysStore);
    } catch (error) {
      console.warn('[store] gagal baca store file:', error?.message || error);
    }
  }

  setInterval(() => {
    try {
      store.writeToFile(databaseFiles.baileysStore);
    } catch (error) {
      console.warn('[store] gagal menulis store:', error?.message || error);
    }
  }, systemConfig.writeStoreIntervalMs).unref();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    msgRetryCounterCache,
    defaultQueryTimeoutMs: taskConfig.requestTimeoutMs,
    browser: ['DilzzXy AI', 'Chrome', '1.0.0']
  });

  store.bind(sock.ev);
  installSocketHelpers(sock);

  if (!sock.authState.creds.registered) {
    const pairingTarget = botIdentity.botNumber || botIdentity.owner;
    const pairingCode = await sock.requestPairingCode(pairingTarget);
    console.log(`[pairing] Kode pairing untuk ${pairingTarget}: ${pairingCode}`);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      console.log(`[connection] connected as ${sock.user?.id || 'unknown'}`);
    }

    if (connection === 'close') {
      const disconnectError = lastDisconnect?.error;
      const statusCode = disconnectError instanceof Boom
        ? disconnectError.output?.statusCode
        : Number(disconnectError?.output?.statusCode || 0);

      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.warn(`[connection] closed (code=${statusCode || 'unknown'})`);

      if (!loggedOut) {
        console.log('[connection] mencoba reconnect...');
        await sleep(1500);
        await connectToWhatsApp();
      } else {
        console.warn('[connection] sesi logout. hapus folder session lalu pair ulang.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages: upsertMessages, type }) => {
    if (!Array.isArray(upsertMessages) || type !== 'notify') return;

    for (const msg of upsertMessages) {
      const chatId = msg?.key?.remoteJid || 'unknown-chat';
      await sock.queue(chatId, () => handleIncomingMessage(sock, msg));
    }
  });

  sock.ev.on('group-participants.update', (event) => {
    console.log('[group-participants.update]', event);
  });

  sock.ev.on('groups.update', (event) => {
    console.log('[groups.update]', event);
  });

  sock.ev.on('call', (calls) => {
    console.log('[call-event]', calls);
  });

  return sock;
}

export {
  tempQueue,
  msgRetryCounterCache,
  isJidGroup,
  isJidStatus,
  isJidBroadcast,
  shouldIgnoreMessage,
  getContentType,
  getTextFromMessage,
  getQuotedObject,
  resolveToBuffer,
  streamToBuffer,
  serializeMessage
};

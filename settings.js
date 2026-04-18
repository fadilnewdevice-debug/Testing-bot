import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const botIdentity = {
  owner: '6285659219300',
  ownerName: 'DilzzXy lagi cape',
  botNumber: '6285643477246',
  botName: '✦ 𝖣𝗂𝗅𝗓𝗓𝖷𝗒 𝖣𝖾𝗏𝖾𝗅𝗈𝗉𝗆𝖾𝗇𝗍 𝖠𝖨',
  packname: 'DilzzXy',
  author: ''
};

export const links = {
  website: '',
  github: '',
  group: '',
  channel: ''
};

export const pricing = {
  premiumWeekly: 10000,
  premiumMonthly: 25000,
  premiumPermanent: 100000
};

export const payment = {
  dana: '',
  gopay: '',
  ovo: '',
  qris: ''
};

export const imageAssets = {
  menu: path.join(__dirname, 'media', 'image', 'menu.jpg'),
  thumbnail: path.join(__dirname, 'media', 'image', 'thumbnail.jpg')
};

export const delayConfig = {
  typingMs: 700,
  reactionMs: 200,
  retryMs: 500
};

export const messages = {
  wait: 'Bentar ya, lagi diproses...',
  done: 'Beres ✅',
  error: 'Yah error, coba lagi bentar lagi ya.',
  ownerOnly: 'Fitur ini khusus owner.',
  premiumOnly: 'Fitur ini khusus user premium.',
  limitReached: 'Limit kamu habis, upgrade premium biar lanjut gas.',
  botAdminRequired: 'Bot harus jadi admin dulu buat jalanin fitur ini.',
  adminOnly: 'Fitur ini khusus admin grup.',
  banned: 'Kamu lagi dibatasi aksesnya.'
};

export const limitPolicy = {
  free: 20,
  premium: 2000,
  owner: Number.POSITIVE_INFINITY
};

export const accessControl = {
  ownerNumbers: [botIdentity.owner],
  premiumNumbers: [],
  bannedNumbers: []
};

export const systemConfig = {
  timezone: 'Asia/Jakarta',
  locale: 'id-ID',
  autoRead: false,
  autoTyping: false,
  selfMode: false,
  publicMode: true,
  printIncoming: true,
  writeStoreIntervalMs: 30000,
  pluginWatchDevOnly: true
};

export const panelConfig = {
  enabled: false,
  domain: '',
  apiKey: '',
  egg: '',
  nestId: ''
};

const rootDir = __dirname;

export const paths = {
  root: rootDir,
  session: path.join(rootDir, 'session'),
  database: path.join(rootDir, 'database'),
  tmp: path.join(rootDir, 'tmp'),
  logs: path.join(rootDir, 'logs'),
  plugin: path.join(rootDir, 'plugin'),
  providers: path.join(rootDir, 'providers'),
  ai: path.join(rootDir, 'ai'),
  downloader: path.join(rootDir, 'downloader'),
  tools: path.join(rootDir, 'tools'),
  media: path.join(rootDir, 'media'),
  image: path.join(rootDir, 'image'),
  maker: path.join(rootDir, 'maker'),
  search: path.join(rootDir, 'search'),
  stickers: path.join(rootDir, 'stickers'),
  system: path.join(rootDir, 'system')
};

export const databaseFiles = {
  sessions: path.join(paths.database, 'sessions.json'),
  users: path.join(paths.database, 'users.json'),
  groups: path.join(paths.database, 'groups.json'),
  premium: path.join(paths.database, 'premium.json'),
  owner: path.join(paths.database, 'owner.json'),
  limits: path.join(paths.database, 'limits.json'),
  cache: path.join(paths.database, 'cache.json'),
  panel: path.join(paths.database, 'panel.json'),
  game: path.join(paths.database, 'game.json'),
  rpg: path.join(paths.database, 'rpg.json'),
  autoAiSettings: path.join(paths.database, 'autoAiSettings.json'),
  autoAiUserContext: path.join(paths.database, 'autoAiUserContext.json'),
  autoAiGroupHistories: path.join(paths.database, 'autoAiGroupHistories.json'),
  baileysStore: path.join(paths.database, 'baileys_store.json')
};

const providerDefaults = {
  timeoutMs: 30000
};

export const apiProviders = {
  paxsenix: {
    name: 'paxsenix',
    baseURL: 'https://api.paxsenix.org',
    key: 'sk-paxsenix-IcW_SC9XpYSyv9Spi2CrfORm_wJejF1XQzJdNnL17tVT4sfT',
    useKey: true,
    weight: 2,
    ...providerDefaults
  },
  zennz: {
    name: 'zennz',
    baseURL: 'https://api.zenzxz.my.id',
    key: '',
    useKey: false,
    weight: 3,
    ...providerDefaults
  },
  ourin: {
    name: 'ourin',
    baseURL: 'https://api.ourin.my.id',
    key: '',
    useKey: false,
    weight: 3,
    ...providerDefaults
  },
  nexray: {
    name: 'nexray',
    baseURL: 'https://api.nexray.web.id',
    key: '',
    useKey: false,
    weight: 3,
    ...providerDefaults
  },
  apialip: {
    name: 'apialip',
    baseURL: 'https://docs-alip.clutch.web.id',
    key: 'alipaiapikeybaru',
    useKey: true,
    weight: 1,
    ...providerDefaults
  },
  yudz: {
    name: 'yudz',
    baseURL: 'https://api.yydz.biz.id',
    key: 'alipaixyudz',
    useKey: true,
    weight: 1,
    ...providerDefaults
  },
  termai: {
    name: 'termai',
    baseURL: 'https://api.termai.cc',
    key: 'alipaitermai2026',
    useKey: true,
    weight: 1,
    ...providerDefaults
  },
  fgsi: {
    name: 'fgsi',
    baseURL: 'https://fgsi.dpdns.org',
    key: 'RahmadXElaina',
    useKey: true,
    weight: 1,
    ...providerDefaults
  },
  pitu: {
    name: 'pitu',
    baseURL: 'https://api.pitucode.com',
    key: 'alipaipitu2026',
    useKey: true,
    weight: 1,
    ...providerDefaults
  }
};

export const capabilityMap = {
  download: ['paxsenix', 'zennz', 'ourin', 'nexray', 'apialip', 'pitu'],
  search: ['paxsenix', 'zennz', 'ourin', 'nexray', 'yudz'],
  ai: ['paxsenix', 'zennz', 'ourin', 'termai', 'fgsi'],
  image: ['paxsenix', 'zennz', 'ourin'],
  maker: ['zennz', 'ourin', 'apialip'],
  sticker: ['zennz', 'ourin', 'pitu'],
  primbon: ['yudz', 'apialip'],
  islami: ['yudz', 'apialip'],
  fun: ['zennz', 'ourin', 'apialip'],
  rpg: ['paxsenix', 'yudz'],
  panel: ['paxsenix']
};

export const taskConfig = {
  requestTimeoutMs: 30000,
  downloadTimeoutMs: 120000,
  aiTimeoutMs: 60000,
  toolTimeoutMs: 45000,
  searchSessionTtlMs: 10 * 60 * 1000,
  queueConcurrencyPerChat: 1,
  maxQueueSizePerChat: 50
};

export function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function ensureJsonFileSync(filePath, fallback = {}) {
  const dirPath = path.dirname(filePath);
  ensureDirSync(dirPath);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `${JSON.stringify(fallback, null, 2)}\n`, 'utf8');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) {
    fs.writeFileSync(filePath, `${JSON.stringify(fallback, null, 2)}\n`, 'utf8');
    return;
  }

  try {
    JSON.parse(content);
  } catch {
    fs.writeFileSync(filePath, `${JSON.stringify(fallback, null, 2)}\n`, 'utf8');
  }
}

export function initProjectFiles() {
  Object.values(paths).forEach((dirPath) => ensureDirSync(dirPath));

  ensureJsonFileSync(databaseFiles.sessions, {});
  ensureJsonFileSync(databaseFiles.users, {});
  ensureJsonFileSync(databaseFiles.groups, {});
  ensureJsonFileSync(databaseFiles.premium, accessControl.premiumNumbers);
  ensureJsonFileSync(databaseFiles.owner, accessControl.ownerNumbers);
  ensureJsonFileSync(databaseFiles.limits, {});
  ensureJsonFileSync(databaseFiles.cache, {});
  ensureJsonFileSync(databaseFiles.panel, {});
  ensureJsonFileSync(databaseFiles.game, {});
  ensureJsonFileSync(databaseFiles.rpg, {});
  ensureJsonFileSync(databaseFiles.autoAiSettings, {});
  ensureJsonFileSync(databaseFiles.autoAiUserContext, {});
  ensureJsonFileSync(databaseFiles.autoAiGroupHistories, {});
  ensureJsonFileSync(databaseFiles.baileysStore, {});
}

export function applyGlobals() {
  global.owner = [botIdentity.owner];
  global.namaOwner = botIdentity.ownerName;
  global.nomorBot = botIdentity.botNumber;
  global.botname = botIdentity.botName;
  global.packname = botIdentity.packname;
  global.author = botIdentity.author;

  global.limitawal = {
    premium: limitPolicy.premium,
    free: limitPolicy.free,
    owner: limitPolicy.owner
  };

  global.links = links;
  global.payment = payment;
  global.mess = messages;
  global.delayConfig = delayConfig;
  global.paths = paths;
  global.apiProviders = apiProviders;
  global.capabilityMap = capabilityMap;
  global.taskConfig = taskConfig;
}

const settings = {
  botIdentity,
  links,
  pricing,
  payment,
  imageAssets,
  delayConfig,
  messages,
  limitPolicy,
  accessControl,
  systemConfig,
  panelConfig,
  paths,
  databaseFiles,
  apiProviders,
  capabilityMap,
  taskConfig,
  ensureDirSync,
  ensureJsonFileSync,
  initProjectFiles,
  applyGlobals
};

export default settings;

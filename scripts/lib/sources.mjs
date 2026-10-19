const FEEDS = [
  { name: '滚动', url: 'https://www.chinanews.com.cn/rss/scroll-news.xml' },
  { name: '国际', url: 'https://www.chinanews.com.cn/rss/world.xml' },
  { name: '财经', url: 'https://www.chinanews.com.cn/rss/finance.xml' },
  { name: '教育', url: 'https://www.chinanews.com.cn/rss/edu.xml' },
  { name: '健康', url: 'https://www.chinanews.com.cn/rss/health.xml' },
];

const BAIDU_BOARDS = ['realtime', 'finance', 'livelihood', 'new_entertainment', 'internation_news'];

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ldquo: '“', rdquo: '”',
  lsquo: '‘', rsquo: '’', hellip: '…', mdash: '—', ndash: '–', middot: '·', times: '×',
};

function decodeEntities(s) {
  return String(s).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

export function stripHTML(s) {
  return decodeEntities(
    String(s)
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
  const m = block.match(re);
  return m ? stripHTML(m[1]) : '';
}

export function parseRSS(xml) {
  const items = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const title = tag(block, 'title');
    if (!title) continue;
    const link = tag(block, 'link') || (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '');
    const desc = tag(block, 'description');
    const dateRaw = tag(block, 'pubDate') || tag(block, 'dc:date');
    const date = dateRaw && !Number.isNaN(Date.parse(dateRaw)) ? new Date(dateRaw) : null;
    items.push({ title, summary: desc, url: link, date });
  }
  return items;
}

async function getText(url, timeout = 20000) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function getBaiduBoard(tab) {
  const text = await getText(`https://top.baidu.com/api/board?platform=wise&tab=${tab}`);
  const json = JSON.parse(text);
  const cards = json?.data?.cards || [];
  const out = [];
  const walk = (node) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const word = node.word || node.query;
    if (typeof word === 'string' && word.trim()) {
      out.push(node);
      return;
    }
    if (node.content) walk(node.content);
  };
  walk(cards);
  return out;
}

export async function gatherSources(log = () => {}) {
  const errors = [];
  const news = [];

  const feedResults = await Promise.allSettled(
    FEEDS.map(async (f) => {
      const xml = await getText(f.url);
      return parseRSS(xml).map((it) => ({ ...it, source: '中国新闻网', board: f.name }));
    })
  );
  feedResults.forEach((r, i) => {
    if (r.status === 'fulfilled') news.push(...r.value);
    else errors.push(`RSS ${FEEDS[i].name}：${r.reason?.message || r.reason}`);
  });

  const hot = [];
  const boardResults = await Promise.allSettled(
    BAIDU_BOARDS.map(async (tab) => {
      const list = await getBaiduBoard(tab);
      return list.map((x) => ({
        title: stripHTML(x.word || x.query || ''),
        summary: stripHTML(x.desc || ''),
        url: x.url || '',
        date: new Date(),
        source: '百度热搜',
        board: tab,
        hot: Number(x.hotScore) || 0,
      }));
    })
  );
  boardResults.forEach((r, i) => {
    if (r.status === 'fulfilled') hot.push(...r.value);
    else errors.push(`百度热搜 ${BAIDU_BOARDS[i]}：${r.reason?.message || r.reason}`);
  });

  log(`新闻源：${news.length} 条 RSS，${hot.length} 条热搜`);
  return { news, hot, errors };
}

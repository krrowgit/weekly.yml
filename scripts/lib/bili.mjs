import crypto from 'node:crypto';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28,
  14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21,
  56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class BiliClient {
  constructor({ cookie = '', delay = 2200, retries = 3, log = () => {} } = {}) {
    this.cookieExtra = cookie;
    this.delay = delay;
    this.retries = retries;
    this.log = log;
    this.nextAt = 0;
    this.buvid3 = '';
    this.buvid4 = '';
    this.mixin = '';
    this.cookie = '';
    this.stats = { requests: 0, retries: 0, failures: 0 };
  }

  async init() {
    const spi = await this.rawJSON('https://api.bilibili.com/x/frontend/finger/spi');
    this.buvid3 = spi?.data?.b_3 || '';
    this.buvid4 = spi?.data?.b_4 || '';
    this.refreshCookie();
    await this.refreshKeys();
    this.refreshCookie();
    if (!this.mixin) throw new Error('B 站 wbi 密钥获取失败');
    this.log(`B站客户端就绪 buvid3=${this.buvid3.slice(0, 8)}…`);
  }

  async refreshKeys() {
    const nav = await this.rawJSON('https://api.bilibili.com/x/web-interface/nav');
    const img = nav?.data?.wbi_img?.img_url;
    const sub = nav?.data?.wbi_img?.sub_url;
    if (!img || !sub) throw new Error('B 站 nav 接口未返回 wbi_img');
    const a = img.split('/').pop().split('.')[0];
    const b = sub.split('/').pop().split('.')[0];
    this.mixin = TAB.map((i) => (a + b)[i]).join('').slice(0, 32);
  }

  refreshCookie() {
    const parts = [
      `buvid3=${this.buvid3}`,
      `buvid4=${this.buvid4}`,
      `b_nut=${Math.floor(Date.now() / 1000)}`,
      'CURRENT_FNVAL=4048',
      `buvid_fp=${md5(this.buvid3 + this.buvid4)}`,
    ];
    if (this.cookieExtra) parts.push(this.cookieExtra);
    this.cookie = parts.join('; ');
  }

  async rotate() {
    try {
      const spi = await this.rawJSON('https://api.bilibili.com/x/frontend/finger/spi');
      if (spi?.data?.b_3) {
        this.buvid3 = spi.data.b_3;
        this.buvid4 = spi.data.b_4;
        this.refreshCookie();
        this.log('已轮换 B 站访客指纹');
      }
    } catch {}
  }

  async rawJSON(url) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Referer: 'https://www.bilibili.com/',
        Origin: 'https://www.bilibili.com',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      signal: AbortSignal.timeout(20000),
    });
    return res.json();
  }

  sign(params) {
    const all = { ...params, wts: Math.floor(Date.now() / 1000) };
    const query = Object.keys(all)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(all[k]).replace(/[!'()*]/g, ''))}`)
      .join('&');
    return `${query}&w_rid=${md5(query + this.mixin)}`;
  }

  async wait() {
    const gap = this.nextAt - Date.now();
    if (gap > 0) await sleep(gap);
    this.nextAt = Date.now() + this.delay + Math.floor(Math.random() * 500);
  }

  async call(url, params = {}, { signed = true } = {}) {
    let lastErr;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      await this.wait();
      this.stats.requests++;
      const target = signed ? `${url}?${this.sign(params)}` : url;
      try {
        const res = await fetch(target, {
          headers: {
            'User-Agent': UA,
            Referer: 'https://www.bilibili.com/',
            Origin: 'https://www.bilibili.com',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            Cookie: this.cookie,
          },
          signal: AbortSignal.timeout(20000),
        });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`非 JSON 响应（HTTP ${res.status}）`);
        }
        if (data.code === 0) return data.data;
        lastErr = new Error(`B站接口 ${data.code}: ${data.message || ''}`);
        if ([-352, -412, -799, -509].includes(data.code) && attempt < this.retries) {
          this.stats.retries++;
          const backoff = 6000 * (attempt + 1) + Math.floor(Math.random() * 2500);
          this.log(`B站风控 ${data.code}，${Math.round(backoff / 1000)}s 后重试`);
          await sleep(backoff);
          await this.rotate();
          continue;
        }
        throw lastErr;
      } catch (err) {
        lastErr = err;
        if (attempt < this.retries) {
          this.stats.retries++;
          await sleep(4000 * (attempt + 1));
          continue;
        }
      }
    }
    this.stats.failures++;
    throw lastErr;
  }

  async search(keyword, pageSize = 30) {
    return this.call('https://api.bilibili.com/x/web-interface/wbi/search/type', {
      search_type: 'video',
      keyword,
      order: 'totalrank',
      page: 1,
      page_size: pageSize,
    });
  }

  async view(bvid) {
    return this.call(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`, {}, { signed: false });
  }

  async comments(aid, ps = 20) {
    return this.call(
      `https://api.bilibili.com/x/v2/reply?type=1&oid=${aid}&sort=2&ps=${ps}&pn=1`,
      {},
      { signed: false }
    );
  }
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BiliClient } from './lib/bili.mjs';
import { gatherSources, stripHTML } from './lib/sources.mjs';
import { SECTIONS, ANGLES, selectTopics, cleanTitle, looseSame } from './lib/topics.mjs';
import { writeData } from './lib/write-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const log = (msg) => console.log(`[collect] ${msg}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WHITE = new Set([
  '央视新闻', '人民日报', '新华社', '央视网', '央视网快看', '中国新闻网', '中新视频',
  '科技日报', '央视财经', '央视频', '环球网', '中国日报', '光明日报', '经济日报',
]);

const BAD_COMMENT = /https?:\/\/|www\.|回复\s*@|^\[.*\]$|^(好|哈哈+|支持|赞|前排|第一|路过|签到)$/;

function parseArgs(argv) {
  const opts = { force: false, dry: false, offline: false, limit: 4, min: 8, week: '', date: '' };
  for (const a of argv) {
    if (a === '--force') opts.force = true;
    else if (a === '--dry') opts.dry = true;
    else if (a === '--offline') opts.offline = true;
    else if (a.startsWith('--limit=')) opts.limit = Math.max(1, Number(a.split('=')[1]) || 4);
    else if (a.startsWith('--min=')) opts.min = Math.max(1, Number(a.split('=')[1]) || 8);
    else if (a.startsWith('--week=')) opts.week = a.split('=')[1];
    else if (a.startsWith('--date=')) opts.date = a.split('=')[1];
  }
  return opts;
}

const p2 = (n) => String(n).padStart(2, '0');

function rangeText(monday, sunday) {
  return `${monday.getUTCFullYear()}.${p2(monday.getUTCMonth() + 1)}.${p2(monday.getUTCDate())} — ${p2(sunday.getUTCMonth() + 1)}.${p2(sunday.getUTCDate())}`;
}

function metaFromId(id) {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(id);
  if (!m) throw new Error(`周次格式应为 2026-W43，收到：${id}`);
  const year = Number(m[1]);
  const week = Number(m[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4.getTime() - (jan4Day - 1) * 86400e3 + (week - 1) * 7 * 86400e3);
  const sunday = new Date(monday.getTime() + 6 * 86400e3);
  return { id, label: `第 ${week} 周`, range: rangeText(monday, sunday), week };
}

function currentMeta(now = new Date()) {
  const bj = new Date(now.getTime() + 8 * 3600e3);
  const day = bj.getUTCDay() || 7;
  const monday = new Date(bj.getTime() - (day - 1) * 86400e3);
  const thursday = new Date(monday.getTime() + 3 * 86400e3);
  const year = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((thursday - yearStart) / 86400e3 + 1) / 7);
  const sunday = new Date(monday.getTime() + 6 * 86400e3);
  return { id: `${year}-W${p2(week)}`, label: `第 ${week} 周`, range: rangeText(monday, sunday), week };
}

function updatedText() {
  const bj = new Date(Date.now() + 8 * 3600e3);
  return `${bj.getUTCFullYear()}-${p2(bj.getUTCMonth() + 1)}-${p2(bj.getUTCDate())} ${p2(bj.getUTCHours())}:${p2(bj.getUTCMinutes())}`;
}

function dateText(d) {
  const bj = new Date(new Date(d).getTime() + 8 * 3600e3);
  return `${p2(bj.getUTCMonth() + 1)}.${p2(bj.getUTCDate())}`;
}

function bigrams(s) {
  const t = String(s || '').toLowerCase().replace(/[\s“”"'‘’（）()《》【】[\]，,。.、；;：:！!？?—\-·]/g, '');
  const out = new Set();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}

function titleSim(a, b) {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const jac = inter / (A.size + B.size - inter);
  const overlap = inter / Math.min(A.size, B.size);
  return Math.max(jac, overlap * 0.85);
}

function sharedBigrams(a, b) {
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter;
}

function searchKeyword(title) {
  return String(title)
    .replace(/[（(][^）)]{0,24}[）)]/g, ' ')
    .replace(/[“”"《》【】|｜:：,，。！!？?、·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28);
}

function pickComments(data) {
  const list = Array.isArray(data?.replies) ? data.replies : [];
  const out = [];
  const seen = new Set();
  for (const c of list) {
    let t = String(c?.content?.message || '').replace(/\s+/g, ' ').trim();
    t = t.replace(/^回复\s*@[^:：]{1,24}[:：]\s*/, '');
    if (t.length < 6 || t.length > 140) continue;
    if (BAD_COMMENT.test(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push({ u: c.member?.uname || '网友', like: Number(c.like) || 0, t });
    if (out.length >= 3) break;
  }
  return out;
}

async function pickVideo(client, event) {
  const kw = searchKeyword(event.title);
  if (kw.length < 4) return null;
  let result;
  try {
    result = await client.search(kw);
  } catch (e) {
    log(`搜索失败「${kw}」：${e.message}`);
    return null;
  }
  const now = Date.now() / 1000;
  const candidates = (result?.result || [])
    .map((v) => {
      const title = stripHTML(v.title || '');
      return {
        bvid: v.bvid,
        title,
        author: v.author || '',
        play: Number(v.play) || 0,
        pubdate: Number(v.pubdate) || 0,
        sim: titleSim(kw, title),
        shared: sharedBigrams(kw, title),
      };
    })
    .filter((v) => {
      if (!v.bvid) return false;
      if (!WHITE.has(v.author) && now - v.pubdate > 60 * 86400) return false;
      if (WHITE.has(v.author)) return v.sim >= 0.05 && v.shared >= 1;
      return v.sim >= 0.12 && v.shared >= 2;
    })
    .sort((a, b) => {
      const sa = (WHITE.has(a.author) ? 150 : 0) + (now - a.pubdate < 12 * 86400 ? 35 : 0) + Math.min(a.play / 10000, 60) + a.sim * 120 + a.shared * 6;
      const sb = (WHITE.has(b.author) ? 150 : 0) + (now - b.pubdate < 12 * 86400 ? 35 : 0) + Math.min(b.play / 10000, 60) + b.sim * 120 + b.shared * 6;
      return sb - sa;
    })
    .slice(0, 3);

  let fallback = null;
  for (const c of candidates) {
    let detail;
    try {
      detail = await client.view(c.bvid);
    } catch {
      continue;
    }
    if (!detail) continue;
    const reply = Number(detail.stat?.reply) || 0;
    if (reply < 2) {
      if (!fallback) fallback = { detail, comments: [] };
      continue;
    }
    let comments = [];
    try {
      comments = pickComments(await client.comments(detail.aid));
    } catch {}
    return { detail, comments };
  }
  return fallback;
}

function angleFor(category, i) {
  const list = ANGLES[category] || ANGLES.livelihood;
  return list[i % list.length];
}

function noteFor(meta, items) {
  const tags = [...new Set(items.flatMap((i) => i.tags || []))].slice(0, 4);
  return tags.length ? `本期关键词：${tags.join(' / ')}` : meta.note;
}

function loadData() {
  const file = path.join(root, 'data.json');
  if (!fs.existsSync(file)) return { site: { title: '每周热点素材库', intro: '' }, weeks: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const data = loadData();
  const meta = opts.week ? metaFromId(opts.week) : currentMeta(opts.date ? new Date(opts.date) : new Date());

  if (data.weeks.some((w) => w.id === meta.id) && !opts.force) {
    log(`${meta.id} 已存在，跳过。需要覆盖请加 --force`);
    return;
  }

  log(`开始采集 ${meta.id}（${meta.range}）`);
  const sources = await gatherSources(log);
  const usedTitles = data.weeks
    .slice(0, 2)
    .flatMap((w) => w.sections.flatMap((s) => s.items.map((i) => i.title)));

  const topics = selectTopics(sources, { usedTitles });
  for (const s of SECTIONS) log(`选题 ${s.title}：${(topics[s.id] || []).length} 条候选`);

  let client = null;
  const warnings = [];
  if (!opts.offline) {
    client = new BiliClient({ cookie: process.env.BILI_COOKIE || '', delay: 2400, log: (m) => log(m) });
    try {
      await client.init();
    } catch (e) {
      warnings.push('B 站接口暂时不可用，本期以新闻概括为主');
      log(`B 站初始化失败：${e.message}`);
      client = null;
    }
  } else {
    warnings.push('离线模式：仅重排往期视频');
  }

  const sections = [];
  let carried = 0;

  for (const s of SECTIONS) {
    const items = [];
    const events = topics[s.id] || [];
    for (const ev of events) {
      if (items.length >= opts.limit) break;
      let picked = null;
      if (client) picked = await pickVideo(client, ev);
      if (!picked) continue;
      const d = picked.detail;
      const pubMs = (Number(d.pubdate) || 0) * 1000;
      const videoOld = pubMs && Date.now() - pubMs > 21 * 86400e3;
      const pubBj = new Date(pubMs + 8 * 3600e3);
      const summary = ev.summary;
      items.push({
        id: `${meta.id}-${s.id}-${items.length + 1}`,
        date: dateText(ev.date),
        sourceType: ev.source || '网络',
        title: ev.title,
        summary,
        angle: angleFor(s.id, items.length),
        tags: ev.tags?.length ? ev.tags : [s.title],
        video: {
          bvid: d.bvid,
          title: cleanTitle(d.title),
          author: d.owner?.name || '',
          play: Number(d.stat?.view) || 0,
          reply: Number(d.stat?.reply) || 0,
          ...(videoOld ? { note: `背景视频 · ${pubBj.getUTCFullYear()}.${p2(pubBj.getUTCMonth() + 1)}` } : {}),
        },
        comments: picked.comments,
      });
      log(`  ✓ ${s.title}：${ev.title.slice(0, 28)} ← ${d.owner?.name} ${d.bvid}`);
    }

    if (items.length < opts.limit && data.weeks.length) {
      const prev = data.weeks[0].sections.find((x) => x.id === s.id);
      for (const old of prev?.items || []) {
        if (items.length >= opts.limit) break;
        if (
          items.some(
            (x) =>
              looseSame(x.title, old.title) ||
              (x.tags?.length && old.tags?.length && x.tags.some((t) => old.tags.includes(t)))
          )
        )
          continue;
        items.push({ ...old, id: `${meta.id}-${s.id}-${items.length + 1}`, carryOver: true });
        carried++;
      }
    }

    sections.push({ ...s, note: noteFor(s, items), items });
  }

  const totalNew = sections.reduce((n, s) => n + s.items.filter((i) => !i.carryOver).length, 0);
  if (totalNew < opts.min) {
    throw new Error(`本周只抓到 ${totalNew} 条新素材（低于下限 ${opts.min}），已保留原数据`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sources: { rss: sources.news.length, hot: sources.hot.length },
    bili: client?.stats || null,
    newItems: totalNew,
    carriedOver: carried,
    warnings,
    errors: sources.errors,
  };

  const week = {
    id: meta.id,
    label: meta.label,
    range: meta.range,
    updated: updatedText(),
    editorial: false,
    report,
    sections,
  };

  data.weeks = [week, ...data.weeks].slice(0, 16);
  const out = writeData(root, data, { dry: opts.dry });
  fs.writeFileSync(path.join(root, 'collection-report.json'), JSON.stringify(report, null, 2) + '\n');

  log(`完成：新增 ${totalNew} 条，补位 ${carried} 条 → ${out.jsFile}`);
  if (warnings.length) log(`提示：${warnings.join('；')}`);
}

main().catch((e) => {
  log(`失败：${e.message}`);
  try {
    const report = { generatedAt: new Date().toISOString(), ok: false, error: e.message, warnings: [e.message] };
    fs.writeFileSync(path.join(root, 'collection-report.json'), JSON.stringify(report, null, 2) + '\n');
  } catch {}
  process.exitCode = 1;
});

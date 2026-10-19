export const SECTIONS = [
  { id: 'livelihood', no: '01', title: '民生经济', en: 'LIVELIHOOD & ECONOMY', note: '本周的政策、数据与生活切面。' },
  { id: 'world', no: '02', title: '世界时政', en: 'WORLD AFFAIRS', note: '本周值得关注的国际动向与地区局势。' },
  { id: 'science', no: '03', title: '科学突破', en: 'SCIENCE & BREAKTHROUGHS', note: '本周的基础研究、前沿技术与科学传播。' },
  { id: 'culture', no: '04', title: '网络文化热点', en: 'INTERNET CULTURE', note: '本周热搜里的生活方式、审美与情绪。' },
];

export const ANGLES = {
  livelihood: [
    '从一组数字落到一个具体的人，适合做开场对比。',
    '先说政策，再说它怎样改变普通人的一周。',
    '把“宏观数据”和“个体体感”并置，容易引发共鸣。',
  ],
  world: [
    '先讲事实，再讲它改变了什么预期。',
    '适合放进“不确定性”主题段落，用时间线串起来。',
    '从一条现场视频切入，再补背景与影响。',
  ],
  science: [
    '用“它解决了什么问题”开场，而不是术语。',
    '从基础研究讲到日常生活，让听众找到连接点。',
    '把“第一次”讲清楚：第一次意味着什么、难在哪里。',
  ],
  culture: [
    '从热搜现象切入，问一句“为什么是现在”。',
    '适合做轻松的转场或现场互动提问。',
    '把评论区当作社会情绪样本，读出分歧与共识。',
  ],
};

const KEYWORDS = {
  livelihood: [
    'GDP', '经济', '消费', '收入', '物价', '房价', '房子', '购房', '房贷', '贴息', '楼市',
    '就业', '失业', '医保', '社保', '养老金', '教育', '开学', '大学生', '生活费', '粮食',
    '秋粮', '丰收', '农业', '农民', '国考', '考研', '招聘', '工资', '存款', '存单', '利率',
    '银行', '理财', '旅游', '出行', '降温', '冷空气', '台风', '暴雨', '菜价', '猪肉', '油价',
    '快递', '外卖', '育儿', '生育', '假期', '春运', '个税', '公积金', '租房', 'A股', '股市',
    '人民币', '汇率', '外贸', '机器人',
  ],
  world: [
    '美国', '特朗普', '日本', '高市', '靖国', '俄罗斯', '俄乌', '乌克兰', '泽连斯基', '普京',
    '以色列', '加沙', '伊朗', '法国', '马克龙', '英国', '德国', '欧盟', '联合国', '外交',
    '军演', '导弹', '无人机', '袭击', '大选', '制裁', '停火', '谈判', '首相', '总统',
    '外交部', '使馆', '中东', '朝鲜', '韩国', '印度', '菲律宾', '欧盟',
  ],
  science: [
    '诺贝尔', '诺奖', '突破', '航天', '火箭', '卫星', '嫦娥', '天问',
    '空间站', '量子', '核聚变', '人工智能', 'AI', '脑机', '基因', '细胞', '疫苗', '新药',
    '临床', '超导', '芯片', '光刻', '深海', '考古', '恐龙', '化石', '科研',
    '国际标准', '计量', '闰秒', '中微子', '探测器', '首例', '研发', '首款', '首次', '科学家', '实验室',
  ],
  culture: [
    '热搜', '走红', '爆火', '出圈', '年轻人', '大学生', '打工人', '维密', '明星',
    '演员', '歌手', '综艺', '电影', '电视剧', '短剧', '游戏', '动漫', '演唱会', '音乐节',
    '文旅', '打卡', '美食', '食堂', '酒店', '钢笔', '潮玩', '盲盒', '直播', '短视频',
    '梗', '表情包', '审美', '穿搭', '咖啡', '奶茶', '时尚', '秀场',
  ],
};

const BOARD_BONUS = {
  livelihood: { livelihood: 6, finance: 6, realtime: 1 },
  world: { internation_news: 7, realtime: 1 },
  science: { realtime: 1 },
  culture: { new_entertainment: 7, realtime: 2 },
};

const FEED_BONUS = {
  livelihood: { 财经: 4, 健康: 2, 滚动: 1 },
  world: { 国际: 4, 滚动: 1 },
  science: { 健康: 2, 滚动: 1 },
  culture: { 教育: 2, 滚动: 1 },
};

const DATE_RE = /^[（(][^）)]{0,24}[）)]\s*/;
const CULTURE_BLOCK = /袭击|遇害|身亡|去世|逝世|车祸|坠亡|自杀|强奸|猥亵|虐杀|凶杀|遗体|猝死/;
const SCIENCE_STRONG =
  /诺贝尔|诺奖|量子|核聚变|超导|芯片|光刻|脑机|基因编辑|中微子|引力波|黑洞|暗物质|新物种|化石|考古发现|航天|嫦娥|天问|空间站|卫星|疫苗|新药|临床|国际标准|计量|闰秒|探测|观测|研发|问世|合成|首例|获批|上市|发射|着陆|对接/;
const SCIENCE_BLOCK =
  /峰会|论坛|会议|博览会|展览|大赛|活动|开幕|举行|举办|招聘|招生|课程|培训|养生|护肤|减肥|科普日|科创实践|学子上演|发布会|启动仪式|交流会|研讨会|出口|销量|概念股|股价|GDP|经济|专家|论道|齐聚/;

export function cleanTitle(raw) {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .replace(/^【[^】]{1,12}】\s*/, '')
    .replace(/^（[^）]{1,12}）\s*/, '')
    .replace(/\s*[-_|｜]\s*(中国新闻网|中新网|百度热搜).*$/, '')
    .trim();
}

export function cleanSummary(raw, title = '') {
  let s = String(raw || '')
    .replace(/\s+/g, ' ')
    .replace(/^中新(网|社)[^。]{0,48}电[，,]?\s*/, '')
    .replace(/^据[^，。]{0,30}报道[，,]\s*/, '')
    .replace(DATE_RE, '')
    .trim();
  if (!s) s = title;
  if (s.length > 190) {
    const cut = s.slice(0, 190);
    const idx = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'), cut.lastIndexOf('！'));
    s = (idx > 80 ? cut.slice(0, idx + 1) : cut.replace(/[，,、][^，,、]*$/, '')) + '…';
  }
  return s;
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\s“”"'‘’（）()《》【】[\]，,。.、；;：:！!？?—\-·]/g, '');
}

function bigrams(s) {
  const out = new Set();
  const t = norm(s);
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}

export function similar(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length > 8 && nb.length > 8 && (na.includes(nb) || nb.includes(na))) return true;
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return false;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter) > 0.72;
}

export function looseSame(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length > 8 && nb.length > 8 && (na.includes(nb) || nb.includes(na))) return true;
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return false;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / Math.min(A.size, B.size) > 0.45;
}

function classify(item) {
  const title = item.title || '';
  const summary = item.summary || '';
  let best = null;
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    let score = 0;
    let titleHits = 0;
    const hits = [];
    for (const w of words) {
      const inTitle = title.includes(w);
      const inSummary = summary.includes(w);
      if (!inTitle && !inSummary) continue;
      score += inTitle ? 3 : 1;
      if (inTitle) titleHits++;
      hits.push({ w, inTitle });
    }
    if (!titleHits) continue;
    score += BOARD_BONUS[cat]?.[item.board] || 0;
    score += FEED_BONUS[cat]?.[item.board] || 0;
    if (item.source === '百度热搜') score += 1;
    if (summary.length >= 25) score += 5;
    if (item.date && Date.now() - new Date(item.date).getTime() < 2 * 86400e3) score += 2;
    if (!best || score > best.score) {
      best = {
        category: cat,
        score,
        tags: hits.sort((a, b) => Number(b.inTitle) - Number(a.inTitle)).map((h) => h.w).slice(0, 4),
      };
    }
  }
  return best;
}

export function selectTopics({ news, hot }, { usedTitles = [], perCategory = 8 } = {}) {
  const entries = [];
  for (const item of [...hot, ...news]) {
    const title = cleanTitle(item.title);
    if (!title || title.length < 4) continue;
    const summary = cleanSummary(item.summary, title);
    const result = classify({ ...item, title, summary });
    if (!result || result.score < 4) continue;
    if (result.category === 'culture' && CULTURE_BLOCK.test(title)) continue;
    if (result.category === 'science') {
      if (SCIENCE_BLOCK.test(title) || !SCIENCE_STRONG.test(title)) continue;
    }
    entries.push({
      title,
      summary,
      url: item.url || '',
      date: item.date || new Date(),
      source: item.source || '',
      board: item.board || '',
      category: result.category,
      score: result.score,
      tags: result.tags,
    });
  }

  entries.sort((a, b) => b.score - a.score);
  const byCategory = Object.fromEntries(SECTIONS.map((s) => [s.id, []]));
  const selected = [];

  for (const entry of entries) {
    if (usedTitles.some((t) => looseSame(t, entry.title))) continue;
    const dup = selected.find((x) => similar(x.title, entry.title));
    if (dup) {
      if (dup.category === entry.category && entry.summary.length > dup.summary.length + 12) {
        dup.summary = entry.summary;
      }
      continue;
    }
    const list = byCategory[entry.category];
    if (!list || list.length >= perCategory) continue;
    if (entry.category === 'culture' && entry.tags?.[0] && list.some((x) => x.tags?.[0] === entry.tags[0])) continue;
    list.push(entry);
    selected.push(entry);
  }

  return byCategory;
}

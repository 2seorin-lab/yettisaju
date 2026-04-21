require('dotenv').config();
const express = require('express');
const path    = require('path');
const crypto  = require('crypto');
const fs      = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'html')));

// ── 사주 계산 상수 ────────────────────────────────────────────────────────────
const STEMS    = ['갑','을','병','정','무','기','경','신','임','계'];
const BRANCHES = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const S_ELEM   = ['木','木','火','火','土','土','金','金','水','水'];
const B_ELEM   = ['水','土','木','木','土','火','火','土','金','金','土','水'];
const YY       = ['양','음','양','음','양','음','양','음','양','음'];
const ANIMALS  = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지'];

// 오행 상생: 木→火→土→金→水→木
const GENERATED_BY = { '火':'木','土':'火','金':'土','水':'金','木':'水' };

// ── 일간(日干) 특성 데이터베이스 ────────────────────────────────────────────
const ILGAN = {
  '갑': {
    nature: '양목(陽木)',
    symbol: '우뚝 선 소나무',
    personality: '리더십이 강하고 목표를 향해 직진하는 기질. 정의감이 넘치고 한번 마음먹으면 끝까지 밀어붙이는 추진력이 있음. 고집이 세지만 그만큼 신뢰감을 줌.',
    strengths: '추진력, 리더십, 정직함, 책임감, 개척정신',
    weaknesses: '고집, 융통성 부족, 직선적이라 상처를 줄 수 있음',
    career: '경영·창업, 법조, 교육, 건설, 의료',
    love: '한 사람에게 깊고 충실하나 자존심이 강해 먼저 사과하기 어려움. 부드럽고 포용력 있는 상대와 잘 맞음.',
    money: '꾸준한 노력으로 재물을 쌓는 스타일. 성실한 사업이나 직장에서 재물운이 옴.',
    advice: '때로는 한 발 물러서는 유연함도 힘입니다.',
  },
  '을': {
    nature: '음목(陰木)',
    symbol: '유연하게 뻗는 덩굴',
    personality: '부드럽고 유연하지만 내면은 질긴 생명력을 가짐. 예술적 감각과 섬세함이 뛰어나며 사람들과 잘 어울림. 환경에 잘 적응하나 때로 우유부단해 보임.',
    strengths: '유연성, 친화력, 예술적 감각, 적응력, 끈기',
    weaknesses: '우유부단, 의존적 성향, 자기주장이 약함',
    career: '예술·디자인, 미용·뷰티, 교육, 서비스, 의료',
    love: '감성적이고 로맨틱한 연애를 원함. 안정감 있고 든든한 상대에게 끌림. 감정 표현이 풍부하나 상처도 잘 받음.',
    money: '재물운은 꾸준하나 한방 대박보다 여러 경로에서 조금씩 모이는 형태.',
    advice: '스스로의 의견을 더 강하게 표현해도 됩니다. 당신의 유연함은 지혜입니다.',
  },
  '병': {
    nature: '양화(陽火)',
    symbol: '뜨겁게 타오르는 태양',
    personality: '밝고 외향적이며 어디서든 존재감이 넘침. 열정이 강하고 카리스마가 있으나 감정 기복이 크고 충동적인 면이 있음. 에너지로 주변에 활기를 줌.',
    strengths: '카리스마, 열정, 사교성, 표현력, 긍정적 에너지',
    weaknesses: '충동성, 감정 기복, 지속력 부족, 인정욕구가 강함',
    career: '연예·방송, 영업·마케팅, 정치, 강연, 요식업',
    love: '열정적이고 표현이 풍부한 연애를 함. 빨리 불태우고 빨리 식는 경향. 새로운 자극을 주는 상대와 잘 맞음.',
    money: '돈이 들어오면 빠르게 쓰는 성향. 화려한 지출을 조심해야 하며 계획적인 저축이 중요.',
    advice: '뜨거운 열정만큼 꾸준함도 갖추면 무서운 사람이 됩니다.',
  },
  '정': {
    nature: '음화(陰火)',
    symbol: '은은하게 타오르는 촛불',
    personality: '섬세하고 집중력이 강하며 한번 빠지면 깊이 파고드는 성격. 겉으로는 차분해 보이나 내면은 뜨거운 열정을 품고 있음. 직관력과 통찰력이 뛰어남.',
    strengths: '집중력, 섬세함, 직관력, 예술성, 깊이 있는 사고',
    weaknesses: '과도한 집착, 완벽주의, 내성적인 면',
    career: '예술·음악, 연구·학문, IT·기술, 종교·철학, 의료',
    love: '조용하지만 깊고 진지한 연애를 원함. 한번 마음을 주면 잘 변하지 않음. 감정 상처를 오래 품는 경향.',
    money: '전문성을 바탕으로 한 수입이 주된 재물 루트.',
    advice: '완벽하지 않아도 괜찮습니다. 당신의 내면 빛은 이미 충분합니다.',
  },
  '무': {
    nature: '양토(陽土)',
    symbol: '묵직하고 넓은 대지',
    personality: '안정적이고 신뢰감이 높으며 주변을 든든하게 지켜줌. 대범하고 포용력이 있으나 한번 결정한 것은 잘 바꾸지 않는 고집도 있음.',
    strengths: '안정감, 신뢰감, 포용력, 인내심, 실행력',
    weaknesses: '변화 거부, 고집, 느린 결정',
    career: '금융·보험, 부동산, 경영관리, 농업·식품, 공무원',
    love: '천천히 깊어지는 연애 스타일. 한번 맺은 인연을 소중히 여기고 오래 가는 관계를 만듦.',
    money: '부동산·안정 자산에서 재물운이 강함. 꾸준히 축적하는 방식이 맞음.',
    advice: '변화를 두려워하지 마세요. 당신의 안정성이 발판이 되어야지 족쇄가 되어선 안 됩니다.',
  },
  '기': {
    nature: '음토(陰土)',
    symbol: '세심하게 가꾸는 비옥한 밭',
    personality: '꼼꼼하고 세심하며 현실적인 판단력이 뛰어남. 배려심이 깊고 실용적이나 걱정이 많고 잔소리 성향이 있음. 실무 능력이 탁월함.',
    strengths: '세심함, 현실감각, 실무능력, 배려심, 꼼꼼함',
    weaknesses: '걱정이 많음, 소심함, 확장성 부족',
    career: '교육, 상담·복지, 의료·간호, 행정·사무, 식품',
    love: '상대를 세심하게 챙기는 연애 스타일. 실용적이고 현실적인 관계를 원함. 불안감이 많아 확인을 자주 원함.',
    money: '알뜰하게 모으는 스타일. 재물이 조금씩 꾸준히 쌓임.',
    advice: '걱정은 미래를 바꾸지 못합니다. 준비됐다면 과감하게 나아가도 됩니다.',
  },
  '경': {
    nature: '양금(陽金)',
    symbol: '결단력 있는 단단한 쇠',
    personality: '결단력이 강하고 원칙을 중시하며 의리가 있음. 카리스마와 리더십이 있으나 독선적이 될 수 있음. 한번 결정하면 강하게 밀어붙임.',
    strengths: '결단력, 의리, 실행력, 리더십, 카리스마',
    weaknesses: '독선, 완고함, 감정표현이 서툼',
    career: '군인·경찰, 법조, 스포츠, 제조·기술, 경영',
    love: '책임감 있고 의리 있는 파트너. 감정 표현이 서툴지만 행동으로 사랑을 표현함.',
    money: '승부 기질이 있어 사업·투자에서 큰 재물을 만들 수 있으나 한방에 무너지는 위험도 있음.',
    advice: '날카로운 칼도 칼집이 있을 때 더 빛납니다. 부드러움이 당신을 더 강하게 합니다.',
  },
  '신': {
    nature: '음금(陰金)',
    symbol: '아름다움을 추구하는 보석',
    personality: '예민하고 섬세하며 미적 감각이 뛰어남. 완벽주의 성향이 있고 자신과 주변에 높은 기준을 세움. 날카로운 직관력으로 상황을 빠르게 파악함.',
    strengths: '섬세함, 미적감각, 완벽주의, 직관력, 분석력',
    weaknesses: '예민함, 상처를 잘 받음, 비판적 성향',
    career: '예술·패션·뷰티, 의료·치과, 디자인, 법조, IT',
    love: '이상형이 높고 까다로운 연애 기준을 가짐. 상처를 잘 받고 오래 기억함.',
    money: '섬세한 분석력으로 재물 관리를 잘함. 패션·뷰티·예술 분야에서 수입이 좋음.',
    advice: '완벽하지 않아도 충분히 사랑받을 자격이 있습니다. 스스로를 더 너그럽게 대해주세요.',
  },
  '임': {
    nature: '양수(陽水)',
    symbol: '깊고 넓은 바다',
    personality: '지혜롭고 통찰력이 있으며 큰 그림을 봄. 포용력이 넓고 사람들을 잘 받아들이나 결정적일 때 우유부단해지기도 함. 변화에 강하고 적응력이 뛰어남.',
    strengths: '지혜, 포용력, 통찰력, 유연성, 창의성',
    weaknesses: '우유부단, 비밀이 많음, 감정 기복',
    career: '연구·학문, IT·인터넷, 심리·상담, 예술, 무역·외교',
    love: '깊고 신비로운 매력으로 이성을 끌어당김. 자유로운 관계를 선호하며 너무 얽매이는 것을 답답해함.',
    money: '지식·정보·창의성으로 돈을 버는 타입. 여러 수입원을 가지는 것이 유리.',
    advice: '당신의 깊이는 남들이 쉽게 따라올 수 없는 무기입니다. 그 지혜를 행동으로 연결하세요.',
  },
  '계': {
    nature: '음수(陰水)',
    symbol: '섬세하고 깊은 이슬',
    personality: '감수성이 풍부하고 직관력이 뛰어남. 내성적이나 마음을 열면 깊은 유대감을 형성함. 섬세하고 예민하여 타인의 감정을 잘 캐치함.',
    strengths: '감수성, 직관력, 섬세함, 공감능력, 예술성',
    weaknesses: '내성적, 감정 상처가 깊음, 우울감 경향',
    career: '예술·문학, 심리·상담, 의료, 교육, 종교·철학',
    love: '감성적이고 로맨틱한 사랑을 꿈꿈. 공감해주는 따뜻한 상대에게 깊이 빠짐.',
    money: '예술·감성 관련 분야에서 재능을 돈으로 연결하는 것이 유리. 감정적 소비를 조심.',
    advice: '당신의 감수성은 세상이 미처 보지 못한 것을 보는 힘입니다.',
  },
};

// ── 오행 분석 ─────────────────────────────────────────────────────────────
function analyzeElements(pillars) {
  const count = { '木':0,'火':0,'土':0,'金':0,'水':0 };
  ['year','month','day','hour'].forEach(k => {
    count[pillars[k].stemElem]++;
    count[pillars[k].branchElem]++;
  });
  const sorted   = Object.entries(count).sort((a,b) => b[1]-a[1]);
  const dominant = sorted[0][0];
  const weak     = sorted[sorted.length-1][0];
  const yongsin  = GENERATED_BY[weak] || dominant;
  return { count, dominant, weak, yongsin };
}

// ── 사주 팔자 계산 ────────────────────────────────────────────────────────
function calcSaju(year, month, day, hour) {
  const beforeIpchun = month < 2 || (month === 2 && day < 4);
  const sy = beforeIpchun ? year - 1 : year;

  const ySi = ((sy - 4) % 10 + 10) % 10;
  const yBi = ((sy - 4) % 12 + 12) % 12;

  const termDays = [6,4,6,5,6,6,7,7,8,8,7,7];
  const mOff = day >= termDays[month-1] ? (month-2+12)%12 : (month-3+12)%12;
  const mBi  = (mOff + 2) % 12;
  const mSi  = ([2,4,6,8,0][Math.floor(ySi/2)%5] + mOff) % 10;

  const days = Math.round((new Date(year,month-1,day) - new Date(2000,0,1)) / 86400000);
  const dIdx = ((days + 16) % 60 + 60) % 60;
  const dSi  = dIdx % 10;
  const dBi  = dIdx % 12;

  const hBi   = hour === 23 ? 0 : Math.floor((hour+1)/2) % 12;
  const hSi   = ([0,2,4,6,8][dSi%5] + hBi) % 10;

  const p = (si, bi) => ({
    stem: STEMS[si], branch: BRANCHES[bi],
    stemElem: S_ELEM[si], branchElem: B_ELEM[bi],
    yinyang: YY[si], char: STEMS[si]+BRANCHES[bi],
  });

  return {
    year: p(ySi,yBi), month: p(mSi,mBi),
    day:  p(dSi,dBi), hour:  p(hSi,hBi),
    animal: ANIMALS[yBi],
  };
}

// ── API 엔드포인트 ────────────────────────────────────────────────────────
app.post('/api/saju', async (req, res) => {
  const { name, gender, year, month, day, hour, hourUnknown } = req.body;

  if (!name || !year || !month || !day)
    return res.status(400).json({ error: '필수 정보가 없습니다.' });
  if (!process.env.GEMINI_API_KEY)
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.' });

  const h       = hourUnknown ? 12 : parseInt(hour);
  const pillars = calcSaju(parseInt(year), parseInt(month), parseInt(day), h);
  const elem    = analyzeElements(pillars);
  const traits  = ILGAN[pillars.day.stem];
  const gKor    = gender === 'male' ? '남성' : '여성';
  const age     = new Date().getFullYear() - parseInt(year) + 1;
  const curYear = new Date().getFullYear();

  // 오행 분포 요약 문자열
  const elemSummary = Object.entries(elem.count)
    .map(([k,v]) => `${k}${v}개`).join(' ');

  // ── AI에게 넘길 분석 데이터 (이미 계산 완료) ──────────────────────────
  const analysisData = `
[사전 분석 결과 — 이 데이터를 그대로 활용해 리딩을 작성하세요]

의뢰인: ${name} (${gKor}, ${year}년생 ${pillars.animal}띠, 현재 ${age}세)
일간: ${pillars.day.stem} (${traits.nature}) — ${traits.symbol}

사주 팔자:
  년주 ${pillars.year.char} / 월주 ${pillars.month.char} / 일주 ${pillars.day.char} / 시주 ${pillars.hour.char}${hourUnknown ? ' (시간 미상)' : ''}

오행 분포: ${elemSummary}
  → 강한 오행: ${elem.dominant} / 약한 오행: ${elem.weak} / 용신(도움이 되는 기운): ${elem.yongsin}

성격 핵심: ${traits.personality}
강점: ${traits.strengths}
약점: ${traits.weaknesses}
적합 직업: ${traits.career}
연애 스타일: ${traits.love}
재물 성향: ${traits.money}
핵심 조언: ${traits.advice}`.trim();

  const prompt = `당신은 사주 명리학 글쓰기 전문가입니다.
아래 사전 분석 데이터를 바탕으로, ${name}님을 위한 따뜻하고 신비로운 사주 리딩을 JSON으로 작성해주세요.
데이터를 그대로 읽지 말고, 자연스럽고 감성적인 한국어 문장으로 풀어쓰세요.

${analysisData}

마크다운·코드블록 없이 순수 JSON만 출력:
{
  "intro": "${name}님에게 건네는 첫 마디. 띠와 일간의 이미지를 엮어 2-3문장으로.",
  "sections": [
    {"id":"personality","title":"타고난 기질과 성품","summary":"한 줄 핵심","content":"위 성격 데이터를 바탕으로 4-5문장. 강점·약점을 ${name}님 이름 넣어 자연스럽게."},
    {"id":"love","title":"연애와 인연","summary":"한 줄 핵심","content":"연애 스타일 데이터 활용 4-5문장. 잘 맞는 상대, 주의할 패턴 포함."},
    {"id":"money","title":"재물과 돈","summary":"한 줄 핵심","content":"재물 성향 데이터 활용 4-5문장. 용신 ${elem.yongsin} 기운이 재물에 미치는 영향 포함."},
    {"id":"career","title":"직업과 커리어","summary":"한 줄 핵심","content":"적합 직업 데이터 활용 4-5문장. ${age}세 현재 시점의 커리어 조언 포함."},
    {"id":"thisyear","title":"${curYear}년 운세","summary":"한 줄 핵심","content":"올해 운의 흐름 4-5문장. 강한 오행 ${elem.dominant}과 약한 오행 ${elem.weak}을 바탕으로 좋은 시기·주의 시기 포함."},
    {"id":"flow","title":"인생의 큰 흐름","summary":"한 줄 핵심","content":"전체 인생 흐름 4-5문장. 핵심 조언을 마지막에 자연스럽게 녹여 마무리."}
  ]
}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'saju', data: pillars })}\n\n`);

  try {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2500, temperature: 0.85 },
        }),
      }
    );

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      throw new Error(`Gemini 오류 (${apiRes.status}): ${errText.slice(0,300)}`);
    }

    const data = await apiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } catch (err) {
    console.error('Gemini API 오류:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
  }

  res.end();
});

// ── 리딩 저장 & 공유 ────────────────────────────────────────────────────────
app.post('/api/save', (req, res) => {
  const { form, pillars, reading } = req.body;
  if (!form || !pillars || !reading)
    return res.status(400).json({ error: '데이터가 없습니다.' });

  const id       = crypto.randomBytes(6).toString('hex');
  const filePath = path.join(DATA_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ form, pillars, reading, createdAt: Date.now() }));
  res.json({ id });
});

app.get('/api/reading/:id', (req, res) => {
  const { id } = req.params;
  if (!/^[a-f0-9]{12}$/.test(id))
    return res.status(400).json({ error: '잘못된 ID입니다.' });
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: '리딩을 찾을 수 없습니다.' });
  res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
});

app.get('/api/config', (_req, res) => {
  res.json({ kakaoJsKey: process.env.KAKAO_JS_KEY || '' });
});

// ── 라우트 & 서버 ─────────────────────────────────────────────────────────
app.get('/',          (req, res) => res.sendFile(path.join(__dirname, 'html', 'main.html')));
app.get('/input',     (req, res) => res.sendFile(path.join(__dirname, 'html', 'input.html')));
app.get('/result',    (req, res) => res.sendFile(path.join(__dirname, 'html', 'result.html')));
app.get('/share/:id', (req, res) => res.sendFile(path.join(__dirname, 'html', 'share.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  명림당 (明林堂) 실행 중`);
  console.log(`  → http://localhost:${PORT}\n`);
});

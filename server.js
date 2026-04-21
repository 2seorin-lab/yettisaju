require('dotenv').config();
const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'html')));

// ── 사주 계산 상수 ──────────────────────────────────────────────────────────
const STEMS   = ['갑','을','병','정','무','기','경','신','임','계'];
const BRANCHES= ['자','축','인','묘','진','사','오','미','신','유','술','해'];
const S_ELEM  = ['木','木','火','火','土','土','金','金','水','水'];
const B_ELEM  = ['水','土','木','木','土','火','火','土','金','金','土','水'];
const YY      = ['양','음','양','음','양','음','양','음','양','음'];

function calcSaju(year, month, day, hour) {
  // 입춘(약 2월 4일) 이전이면 전년도로 년주 계산
  const beforeIpchun = month < 2 || (month === 2 && day < 4);
  const sy = beforeIpchun ? year - 1 : year;

  // 년주
  const ySi = ((sy - 4) % 10 + 10) % 10;
  const yBi = ((sy - 4) % 12 + 12) % 12;

  // 월주 — 절기 시작일(근사값)
  const termDays = [6, 4, 6, 5, 6, 6, 7, 7, 8, 8, 7, 7];
  const mOff = day >= termDays[month - 1]
    ? (month - 2 + 12) % 12
    : (month - 3 + 12) % 12;
  const mBi   = (mOff + 2) % 12;
  const yGrp  = Math.floor(ySi / 2) % 5;
  const mBase = [2, 4, 6, 8, 0][yGrp];
  const mSi   = (mBase + mOff) % 10;

  // 일주 — 기준: 2000-01-01 = 경진(庚辰) = idx 16
  const ref  = new Date(2000, 0, 1);
  const tgt  = new Date(year, month - 1, day);
  const days = Math.round((tgt - ref) / 86400000);
  const dIdx = ((days + 16) % 60 + 60) % 60;
  const dSi  = dIdx % 10;
  const dBi  = dIdx % 12;

  // 시주
  const hBi   = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
  const hBase = [0, 2, 4, 6, 8][dSi % 5];
  const hSi   = (hBase + hBi) % 10;

  const p = (si, bi) => ({
    stem: STEMS[si], branch: BRANCHES[bi],
    stemElem: S_ELEM[si], branchElem: B_ELEM[bi],
    yinyang: YY[si],
    char: STEMS[si] + BRANCHES[bi],
  });

  return {
    year:  p(ySi, yBi),
    month: p(mSi, mBi),
    day:   p(dSi, dBi),
    hour:  p(hSi, hBi),
  };
}

// ── API 엔드포인트 ─────────────────────────────────────────────────────────
app.post('/api/saju', async (req, res) => {
  const { name, gender, year, month, day, hour, hourUnknown } = req.body;

  if (!name || !year || !month || !day) {
    return res.status(400).json({ error: '필수 정보가 없습니다.' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.' });
  }

  const h       = hourUnknown ? 12 : parseInt(hour);
  const pillars = calcSaju(parseInt(year), parseInt(month), parseInt(day), h);
  const gKor    = gender === 'male' ? '남성' : '여성';
  const hourStr = hourUnknown ? '시간 미상' : `${hour}시`;
  const curYear = new Date().getFullYear();

  const prompt = `당신은 수십 년 경력의 한국 사주 명리학 전문가입니다.
따뜻하고 신비로운 어조로, 오래된 명인이 직접 이야기해주듯 사주를 풀어주세요.

[의뢰인]
이름: ${name} (${gKor})
생년월일시: ${year}년 ${month}월 ${day}일 ${hourStr}${hourUnknown ? '\n(시각 미상 — 시주는 참고용)' : ''}

[사주 팔자]
년주: ${pillars.year.char}  (${pillars.year.stemElem}/${pillars.year.branchElem}, ${pillars.year.yinyang})
월주: ${pillars.month.char} (${pillars.month.stemElem}/${pillars.month.branchElem})
일주: ${pillars.day.char}   ← 일간 ${pillars.day.stem} 이 ${name}님의 본성
시주: ${pillars.hour.char}  (${pillars.hour.stemElem}/${pillars.hour.branchElem})${hourUnknown ? ' [미상]' : ''}

아래 JSON만 출력하세요. 마크다운, 코드블록 없이 순수 JSON:
{
  "intro": "사주 전체를 아우르는 첫인상 3-4문장. 이름 사용. 따뜻하고 신비로운 어조.",
  "sections": [
    {
      "id": "personality",
      "title": "타고난 기질과 성품",
      "summary": "핵심 한 줄",
      "content": "5-6문장 상세 리딩. 일간 ${pillars.day.stem}의 특성, 오행 균형, 강점과 약점, 타인에게 어떻게 보이는지."
    },
    {
      "id": "love",
      "title": "연애와 인연",
      "summary": "핵심 한 줄",
      "content": "5-6문장. 인연의 특성, 잘 맞는 상대, 주의할 패턴, 운이 오는 시기와 나이대."
    },
    {
      "id": "money",
      "title": "재물과 돈",
      "summary": "핵심 한 줄",
      "content": "5-6문장. 재물운 특성, 돈 버는 방식, 조심할 지출 패턴, 재물이 모이는 시기."
    },
    {
      "id": "career",
      "title": "직업과 커리어",
      "summary": "핵심 한 줄",
      "content": "5-6문장. 잘 맞는 직업군, 일하는 스타일, 커리어 조언, 성공이 열리는 시기."
    },
    {
      "id": "thisyear",
      "title": "${curYear}년 운세",
      "summary": "핵심 한 줄",
      "content": "5-6문장. 올해 운의 흐름, 좋은 시기와 조심할 시기, 월별 흐름, 구체적인 조언."
    },
    {
      "id": "flow",
      "title": "인생의 큰 흐름",
      "summary": "핵심 한 줄",
      "content": "5-6문장. 전체 인생 운의 패턴, 황금기 시기, 주의해야 할 시기, 마음에 새길 말."
    }
  ]
}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // 먼저 사주 팔자 데이터 전송
  res.write(`data: ${JSON.stringify({ type: 'saju', data: pillars })}\n\n`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 3500,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } catch (err) {
    console.error('Claude API 오류:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
  }

  res.end();
});

// ── 페이지 라우트 ──────────────────────────────────────────────────────────
app.get('/',       (req, res) => res.sendFile(path.join(__dirname, 'html', 'main.html')));
app.get('/input',  (req, res) => res.sendFile(path.join(__dirname, 'html', 'input.html')));
app.get('/result', (req, res) => res.sendFile(path.join(__dirname, 'html', 'result.html')));

// ── 서버 시작 ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  명림당 (明林堂) 실행 중`);
  console.log(`  → http://localhost:${PORT}\n`);
});

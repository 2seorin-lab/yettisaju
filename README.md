# 예띠사주

명림당 사주 리딩 서비스 — 생년월일시를 입력하면 사주팔자를 분석해주는 웹앱입니다.

## 기술 스택

- **Backend**: Node.js + Express
- **AI**: Google Generative AI (`@google/generative-ai`)
- **Frontend**: 순수 HTML/CSS/JS (`html/` 폴더)

## 프로젝트 구조

```
yettisaju/
├── index.html        # GitHub Pages 진입점 (html/main.html로 리다이렉트)
├── server.js         # Express 서버 (사주 계산 API)
├── html/
│   ├── main.html     # 메인 페이지
│   ├── input.html    # 정보 입력 페이지
│   ├── result.html   # 결과 페이지
│   └── share.html    # 공유 페이지
├── data/             # 사주 결과 저장 (로컬)
└── package.json
```

## 로컬 실행

```bash
npm install
npm start
```

`.env` 파일에 Google AI API 키를 설정해야 합니다.

## GitHub Pages 배포

- URL: https://2seorin-lab.github.io/yettisaju/
- 루트의 `index.html`이 `html/main.html`로 리다이렉트합니다.
- GitHub Pages는 정적 파일만 서빙하므로, 사주 계산 API(`server.js`)는 동작하지 않습니다.
- API가 필요한 기능은 별도 서버(Render, Railway 등)에 배포 후 연결해야 합니다.

## GitHub Pages 설정 방법

1. GitHub 저장소 → Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `main` / `/ (root)` 선택 후 Save

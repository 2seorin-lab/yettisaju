# 프로젝트 컨텍스트

명림당 사주 리딩 서비스. 생년월일시 입력 → 사주팔자 계산 → AI 해석 → 결과 출력 흐름.

## 핵심 파일

- `server.js` — Express 서버. 사주 계산 로직(천간/지지/오행) + Google AI API 호출 포함
- `html/main.html` — 메인 페이지 (GitHub Pages 진입점)
- `html/input.html` — 사주 입력 폼
- `html/result.html` — AI 사주 결과 출력
- `html/share.html` — 결과 공유
- `index.html` — 루트 리다이렉트 (GitHub Pages용, `html/main.html`로 이동)

## 배포 구조

- **GitHub Pages**: 정적 페이지만 서빙. `index.html` → `html/main.html` 리다이렉트.
- **백엔드 API**: `server.js`는 GitHub Pages에서 동작하지 않음. 별도 서버 필요.
- 저장소: https://github.com/2seorin-lab/yettisaju
- Pages URL: https://2seorin-lab.github.io/yettisaju/

## GitHub Pages 404 해결 이력

루트에 `index.html`이 없어서 404가 발생했음. 루트에 `html/main.html`로 리다이렉트하는 `index.html`을 추가해서 해결.
GitHub Pages 활성화는 저장소 Settings → Pages에서 수동으로 설정해야 함.

## 주의사항

- `.env`에 Google AI API 키 필요 (로컬 실행 시)
- `data/` 폴더는 서버 실행 시 자동 생성됨 (`.gitignore` 처리 권장)

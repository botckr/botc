# 🩸 Blood on the Clocktower - Digital Grimoire (시계탑에 흐른 피)

오프라인 마피아 보드게임 **"시계탑에 흐른 피 (Blood on the Clocktower)"**의 **Trouble Brewing (초보자용)** 시나리오를 스마트폰과 웹을 통해 즐길 수 있도록 제작된 **비동기식 디지털 마도서 및 플레이어 클라이언트**입니다.

스토리텔러(ST)의 수고를 덜어주는 강력한 자동화 기능과, 100% 모바일 친화적인 다크 고딕 UI를 제공합니다.

---

## ✨ 주요 기능 (Features)

* **전체 직업(22종) 로직 완벽 구현**: 시장, 처녀, 슬레이어, 레이븐키퍼, 핏빛 후계자(Scarlet Woman) 등 복잡한 조건부 능력들이 오프라인 룰북과 동일하게 시스템 상에서 정밀하게 작동합니다.
* **제로 타임(Zero-Time) 밤 단계**: 모든 플레이어가 스마트폰으로 동시에 밤 행동을 입력하므로, 오프라인처럼 눈을 감고 한 명씩 기다릴 필요가 없습니다.
* **스토리텔러(ST) 스마트 대시보드**: 시스템이 취객(Drunk)과 독술사(Poisoner)의 상태를 계산하여 ST에게 "오정보(거짓 정보)"를 자동으로 제안합니다. ST는 이를 원클릭으로 승인하거나 수정하여 전송할 수 있습니다.
* **실시간 투표 및 처형 시스템**: 원형 마을 광장(Town Square) UI에서 실시간으로 지목과 찬반 투표가 진행되며, 유령 표(Ghost Vote) 역시 자동으로 관리됩니다.
* **과거 기록 열람 (History Viewer)**: 게임이 종료되면 밤과 낮의 모든 행동, 전달받은 비밀 정보, 투표 내역이 시간의 흐름(Night Order)에 따라 영구적으로 박제되며 클립보드로 복사하여 공유할 수 있습니다.

---

## 🚀 직접 구축 및 배포하기 (How to Deploy)

이 앱은 서버리스(Serverless) 프론트엔드 앱이며, 데이터베이스로 **Firebase Realtime Database**를 사용합니다. 본인만의 서버를 띄우려면 아래의 과정을 따라주세요.

### 1. Firebase 설정
1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트를 생성합니다.
2. **Realtime Database**를 생성하고 데이터베이스 위치를 설정합니다.
3. 프로젝트 설정에서 **웹 앱(Web App)**을 추가하고 Firebase SDK 구성(Config) 값을 복사합니다.

### 2. 프로젝트 로컬 환경 설정
1. 저장소를 클론(Clone) 받습니다.
2. 프로젝트 최상단 루트 경로에 `.env` 파일을 생성하고, 복사해둔 Firebase Config 값을 아래 양식에 맞게 붙여넣습니다.
```env
VITE_FIREBASE_API_KEY="본인의_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="본인의_AUTH_DOMAIN"
VITE_FIREBASE_DATABASE_URL="본인의_DATABASE_URL"
VITE_FIREBASE_PROJECT_ID="본인의_PROJECT_ID"
VITE_FIREBASE_STORAGE_BUCKET="본인의_STORAGE_BUCKET"
VITE_FIREBASE_MESSAGING_SENDER_ID="본인의_MESSAGING_SENDER_ID"
VITE_FIREBASE_APP_ID="본인의_APP_ID"
VITE_FIREBASE_MEASUREMENT_ID="본인의_MEASUREMENT_ID"
```

### 3. 파이어베이스 보안 규칙 (Security Rules) 적용
게임 데이터가 유출되는 것을 막기 위해 권한이 설정되어야 합니다. Firebase 콘솔의 Realtime Database -> **Rules(규칙)** 탭에 들어가서 저장소에 포함된 `database.rules.json` 파일의 내용을 복사하여 덮어쓰고 **게시(Publish)** 합니다.

### 4. 관리자(ST) 비밀번호 세팅
Firebase 콘솔의 Realtime Database 데이터 탭에서 직접 루트 아래에 `admin_auth` 노드를 만들고, 원하는 비밀번호를 키값으로, `true`를 밸류값으로 넣어줍니다. (예: 비밀번호를 1234로 하고 싶다면)
```json
{
  "admin_auth": {
    "1234": true
  }
}
```

### 5. 빌드 및 호스팅 (GitHub Pages 등)
* 로컬 테스트: `npm install` 후 `npm run dev`
* 배포: Vercel, Netlify, 혹은 GitHub Pages를 통해 배포할 수 있습니다. (현재 레포지토리에는 GitHub Pages 자동 배포용 `.github/workflows/deploy.yml`이 세팅되어 있습니다.)

---

## ⚖️ 저작권 및 라이선스 고지 (Disclaimer)

* **"Blood on the Clocktower"** is a trademark of Steven Medway and The Pandemonium Institute.
* 이 애플리케이션은 영리적 목적이 없는 **비공식 팬메이드(Unofficial Fan-made) 프로젝트**이며, The Pandemonium Institute와 공식적인 제휴나 연관이 없습니다.
* 게임의 룰, 캐릭터 디자인, 명칭 등에 대한 모든 원저작권은 [The Pandemonium Institute](https://bloodontheclocktower.com/)에 있습니다. 보드게임의 진정한 재미를 느끼기 위해 반드시 공식 오프라인 실물 패키지를 구매하여 즐기시기를 강력히 권장합니다.
* **Built with AI**: 이 애플리케이션의 기획, 로직 설계 및 코딩의 100%는 구글의 생성형 AI **[Google Gemini (Gemini 2.5 Pro / Flash) & Gemini CLI]**와의 대화형 협업을 통해 작성되었습니다.

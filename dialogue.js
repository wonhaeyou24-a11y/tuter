/**
 * 🧱 시우(Siwoo)와 레고 튜터 브릭키의 실시간 일상 화상 대화 엔진 (dialogue.js)
 * - 현재 시간대(아침, 점심, 저녁, 밤) 맞춤형 일상 인사 및 일상 대화
 * - 일상적인 대화(식사, 유치원, 놀이터, 친구, 장난감, 기분, 날씨 등) NLU 탑재
 * - 단어별 실시간 하이라이트(Karaoke Highlight) 텍스트 분할 지원
 */

class BrickyDialogueEngine {
  constructor() {
    this.currentTopicKey = 'daily';
    this.currentExchangeIndex = 0;

    // 🌟 멀티턴 티키타카 대화 기억 저장소
    this.conversationHistory = [];
    this.currentContextTopic = 'greeting';
    this.currentContextStep = 0;
    this.geminiApiKey = (typeof localStorage !== 'undefined' ? localStorage.getItem('bricktalk_gemini_key') : '') || '';
  }

  /**
   * Gemini API 키 설정 및 로컬 저장
   */
  setGeminiApiKey(key) {
    this.geminiApiKey = (key || '').trim();
    if (typeof localStorage !== 'undefined') {
      if (this.geminiApiKey) {
        localStorage.setItem('bricktalk_gemini_key', this.geminiApiKey);
      } else {
        localStorage.removeItem('bricktalk_gemini_key');
      }
    }
  }

  hasGeminiKey() {
    return Boolean(this.geminiApiKey && this.geminiApiKey.length > 15);
  }

  /**
   * 사용자의 접속 시간대에 맞춘 첫 인사 생성
   */
  getTimeBasedGreeting() {
    const hour = new Date().getHours();
    this.currentContextTopic = 'daily_greeting';
    this.currentContextStep = 0;
    
    // 아침 (06:00 ~ 11:00)
    if (hour >= 6 && hour < 11) {
      return {
        tutorEn: "Good morning Siwoo! Did you eat a yummy breakfast today? 🥞",
        tutorKr: "좋은 아침이야 시우야! 오늘 맛있는 아침밥 든든하게 먹었어?",
        choices: [
          { emoji: "🥣", en: "Yes, I ate breakfast!", phonetic: "[예스, 아이 에이트 브렉퍼스트]", kr: "네, 아침밥 맛있게 먹었어요!" },
          { emoji: "😴", en: "I am a little sleepy.", phonetic: "[아이 엠 어 리틀 슬리피]", kr: "조금 졸려요." },
          { emoji: "⚡", en: "I am super energetic!", phonetic: "[아이 엠 슈퍼 에너제틱]", kr: "힘이 펄펄 넘쳐요!" }
        ]
      };
    }
    // 낮/오후 (11:00 ~ 17:00)
    else if (hour >= 11 && hour < 17) {
      return {
        tutorEn: "Good afternoon Siwoo! What fun thing did you do today? Did you play outside? ☀️",
        tutorKr: "즐거운 오후야 시우야! 오늘 어떤 재미난 일을 했어? 밖에서 신나게 놀았어?",
        choices: [
          { emoji: "🛝", en: "I played at the playground!", phonetic: "[아이 플레이드 앳 더 플레이그라운드]", kr: "놀이터에서 놀았어요!" },
          { emoji: "🍕", en: "I ate yummy lunch!", phonetic: "[아이 에이트 야미 런치]", kr: "맛있는 점심 먹었어요!" },
          { emoji: "🧱", en: "I built with Lego toys!", phonetic: "[아이 빌트 위드 레고 토이즈]", kr: "레고 블록 놀이했어요!" }
        ]
      };
    }
    // 저녁 (17:00 ~ 21:00)
    else if (hour >= 17 && hour < 21) {
      return {
        tutorEn: "Good evening Siwoo! Did you have a fun day today? What was the best part of your day? 🌆",
        tutorKr: "좋은 저녁이야 시우야! 오늘 하루 즐겁게 보냈어? 오늘 제일 신났던 일은 뭐야?",
        choices: [
          { emoji: "💖", en: "Playing with my family!", phonetic: "[플레잉 위드 마이 패밀리]", kr: "가족들과 함께 논 거요!" },
          { emoji: "🎨", en: "Drawing pretty pictures!", phonetic: "[드로잉 프리티 픽쳐스]", kr: "그림 그린 거요!" },
          { emoji: "😋", en: "Eating delicious dinner!", phonetic: "[이팅 딜리셔스 디너]", kr: "맛있는 저녁밥 먹은 거요!" }
        ]
      };
    }
    // 밤 (21:00 ~ 06:00)
    else {
      return {
        tutorEn: "Hi Siwoo! It's night time! Did you brush your teeth? Let's have a cozy chat with Bricky! 🌙",
        tutorKr: "안녕 시우야! 밤이 되었네! 치카치카 양치질했어? 브릭키랑 재밌는 이야기 하고 잘까?",
        choices: [
          { emoji: "🪥", en: "Yes, I brushed my teeth!", phonetic: "[예스, 아이 브러쉬트 마이 티스]", kr: "네, 치카치카 양치질했어요!" },
          { emoji: "🧸", en: "I am ready for bed!", phonetic: "[아이 엠 레디 포 베드]", kr: "꿈나라 갈 준비 됐어요!" },
          { emoji: "✨", en: "Let's talk in English!", phonetic: "[렛츠 톡 인 잉글리시]", kr: "영어로 이야기해요!" }
        ]
      };
    }
  }

  setTopic(topicKey) {
    if (BRICKY_TOPICS[topicKey]) {
      this.currentTopicKey = topicKey;
      this.currentExchangeIndex = 0;
      this.currentContextTopic = topicKey;
      this.currentContextStep = 0;
      return true;
    }
    return false;
  }

  getCurrentTopic() {
    return BRICKY_TOPICS[this.currentTopicKey] || BRICKY_TOPICS.daily;
  }

  getCurrentExchange() {
    if (this.currentTopicKey === 'daily' && this.currentExchangeIndex === 0) {
      return this.getTimeBasedGreeting();
    }
    const topic = this.getCurrentTopic();
    return topic.exchanges[this.currentExchangeIndex % topic.exchanges.length];
  }

  nextExchange() {
    const topic = this.getCurrentTopic();
    this.currentExchangeIndex = (this.currentExchangeIndex + 1) % topic.exchanges.length;
    this.currentContextStep = 0;
    return this.getCurrentExchange();
  }

  /**
   * 👂 발화 불명확성 / 잡음 감지 헬퍼
   */
  isUnclearSpeech(rawText) {
    if (!rawText) return true;
    const t = String(rawText).trim().toLowerCase();
    if (t.length === 0) return true;
    // 공백 및 특수문자 제거
    const stripped = t.replace(/[\s\.\?!~,\-_]/g, '');
    if (stripped.length === 0) return true;
    // 잡음, 망설임, 단음절
    const hesitations = /^(uh|um|er|ah|eh|oh|어|음|그|아|uhum|umuh)+$/i;
    if (hesitations.test(stripped)) return true;
    if (stripped.length < 2) return true;
    return false;
  }

  /**
   * 🌟 멀티턴 티키타카(Tiki-Taka) 지능형 대화 생성기
   * - 문맥(Context) 상태 기억
   * - 기계적 반복(Aha! You said...) 원천 차단
   * - 엉뚱한 말 대신 대화 꼬리물기 전개
   * - 상호 질문(Mutual Questioning) 완벽 지원
   */
  /**
   * 🌟 NotebookLM 7세 화상 영어 교수법 기반 지능형 티키타카 엔진
   * 1. 5 형태소(Morphemes) 원칙: 1~2문장의 간결한 턴 (8단어 내외)
   * 2. 폐쇄형 양자택일(Either-Or) 스캐폴딩: 인지 부담 없는 즉각 핑퐁
   * 3. 상황 적합성(Contextual Realism): 기계적 반복 없이 상황에 맞는 감정 공감
   * 4. 상호 질문(Mutual Questioning) 완벽 지원
   */
  generateContextualResponse(rawText) {
    const text = (rawText || '').trim().toLowerCase();

    // 🌟 0. 잡음 / 망설임 / 못 들었을 때 다정한 재요청 (짧고 친근하게)
    if (this.isUnclearSpeech(rawText)) {
      return {
        replyEn: "Pardon, Siwoo? Bricky is listening! One more time? 👂",
        replyKr: "시우야, 브릭키가 귀를 쫑긋! 천천히 한 번만 다시 말해줄래? 👂",
        suggestions: [
          { emoji: "👂", en: "Listen to me, Bricky!", phonetic: "[리슨 투 미, 브릭키]", kr: "브릭키 잘 들어봐요!" },
          { emoji: "🗣️", en: "Let me say it again!", phonetic: "[렛 미 세이 잇 어게인]", kr: "다시 한 번 말해볼게요!" },
          { emoji: "✨", en: "Hello Bricky!", phonetic: "[헬로 브릭키]", kr: "안녕 브릭키야!" }
        ]
      };
    }

    this.conversationHistory.push({ role: 'user', text: rawText, time: Date.now() });

    const textWithoutName = text.replace(/bricky/g, '').replace(/브릭키/g, '').trim();

    // 🌟 1. 시우가 브릭키에게 역질문 또는 질문을 던졌을 때 (상호 핑퐁)
    const isAskingBricky = text.includes('너는') || text.includes('브릭키는') || text.includes('how about you') || text.includes('what about you') || text.includes('who are you') || text.includes('how old') || text.includes('what do you like') || text.includes('do you like') || text.includes('좋아해?') || text.includes('몇 살') || text.includes('help me') || text.includes('know more') || text.includes('can you') || text.includes('what game') || text.includes('what is your');

    if (isAskingBricky) {
      // 1-1. 조립 도와줘? ("Can you help me build it, Bricky?")
      if (text.includes('help me') || text.includes('도와')) {
        return {
          replyEn: "Yes! Click-clack! 🧱 Fast wheels or giant wings?",
          replyKr: "응 당연하지! 딸깍딸깍! 🧱 쌩쌩 바퀴부터 만들까, 날개부터 만들까?",
          suggestions: [
            { emoji: "🚗", en: "The fast wheels!", phonetic: "[더 패스트 휠즈]", kr: "쌩쌩 바퀴요!" },
            { emoji: "🚀", en: "The giant wings!", phonetic: "[더 자이언트 윙즈]", kr: "커다란 날개요!" },
            { emoji: "❓", en: "Can you pass a blue brick, Bricky?", phonetic: "[캔 유 패스 어 블루 브릭, 브릭키]", kr: "브릭키 파란 블록 줄래?" }
          ]
        };
      }

      // 1-2. 더 알고 싶어? ("Do you want to know more, Bricky?")
      if (text.includes('know more') || text.includes('더 알고')) {
        return {
          replyEn: "Yes! Tell me! 👂 Fast or super fast?",
          replyKr: "응! 다 들려줘! 👂 빨랐어, 아니면 엄청 빨랐어?",
          suggestions: [
            { emoji: "⚡", en: "Super duper fast!", phonetic: "[슈퍼 두퍼 패스트]", kr: "엄청나게 빨랐어요!" },
            { emoji: "😄", en: "It was so fun!", phonetic: "[잇 워즈 쏘 펀]", kr: "진짜 재미있었어요!" },
            { emoji: "❓", en: "Were you happy today, Bricky?", phonetic: "[워 유 해피 투데이, 브릭키]", kr: "브릭키는 오늘 행복했어?" }
          ]
        };
      }

      // 1-3. 나이 질문 ("How old are you, Bricky?")
      if (text.includes('몇 살') || text.includes('how old') || text.includes('age')) {
        return {
          replyEn: "I am 7, just like you! 🤝 Legos or tag?",
          replyKr: "나도 시우처럼 일곱 살! 단짝이지! 🤝 레고 놀이할까, 술래잡기할까?",
          suggestions: [
            { emoji: "🧱", en: "Let's build Legos!", phonetic: "[렛츠 빌드 레고스]", kr: "레고 만들어요!" },
            { emoji: "🏃", en: "Let's play tag!", phonetic: "[렛츠 플레이 태그]", kr: "술래잡기해요!" },
            { emoji: "❓", en: "What game do you like, Bricky?", phonetic: "[왓 게임 두 유 라이크, 브릭키]", kr: "브릭키는 무슨 놀이 좋아해?" }
          ]
        };
      }

      // 1-4. 브릭키가 좋아하는 음식 ("What is your favorite food, Bricky?")
      if (text.includes('food') || text.includes('음식') || text.includes('pizza') || text.includes('피자') || text.includes('eat') || text.includes('먹')) {
        return {
          replyEn: "Bricky loves cheese pizza! 🍕 Ice cream or cookies next?",
          replyKr: "브릭키는 치즈 피자 좋아해! 🍕 디저트로 아이스크림 먹을까, 쿠키 먹을까?",
          suggestions: [
            { emoji: "🍦", en: "Sweet ice cream!", phonetic: "[스위트 아이스크림]", kr: "달콤한 아이스크림이요!" },
            { emoji: "🍪", en: "Chocolate cookies!", phonetic: "[초콜릿 쿠키즈]", kr: "초코 쿠키요!" },
            { emoji: "❓", en: "Do you like ice cream, Bricky?", phonetic: "[두 유 라이크 아이스크림, 브릭키]", kr: "브릭키 아이스크림 좋아해?" }
          ]
        };
      }

      // 1-5. 정체 질문 ("Who are you?")
      if (text.includes('who are you') || text.includes('누구')) {
        return {
          replyEn: "I am Bricky, your Lego friend! 🧱 Legos or cars?",
          replyKr: "난 시우의 레고 친구 브릭키야! 🧱 레고 장난감이 좋아, 자동차가 좋아?",
          suggestions: [
            { emoji: "🧱", en: "I love Lego bricks!", phonetic: "[아이 러브 레고 브릭스]", kr: "레고 블록이요!" },
            { emoji: "🚗", en: "I love fast cars!", phonetic: "[아이 러브 패스트 카즈]", kr: "빠른 자동차요!" },
            { emoji: "❓", en: "Can we be best friends, Bricky?", phonetic: "[캔 위 비 베스트 프렌즈, 브릭키]", kr: "브릭키 우리 단짝 친구 할까?" }
          ]
        };
      }

      // 1-6. 일반적인 "너는?" 질문
      return {
        replyEn: "Thank you for asking, Siwoo! 🎶 Playground story or Lego story?",
        replyKr: "물어봐줘서 고마워 시우야! 🎶 놀이터 이야기 들려줄래, 레고 이야기 들려줄래?",
        suggestions: [
          { emoji: "🛝", en: "A playground story!", phonetic: "[어 플레이그라운드 스토리]", kr: "놀이터 이야기요!" },
          { emoji: "🧱", en: "A cool Lego story!", phonetic: "[어 쿨 레고 스토리]", kr: "멋진 레고 이야기요!" },
          { emoji: "❓", en: "What story do you like, Bricky?", phonetic: "[왓 스토리 두 유 라이크, 브릭키]", kr: "브릭키는 무슨 이야기 좋아해?" }
        ]
      };
    }

    // 🌟 2. 🍕 피자 & 음식 티키타카 (먹은 상황에 맞는 현실적 대화)
    // 치즈/토핑 대답
    if (text.includes('cheese') || text.includes('치즈') || text.includes('corn') || text.includes('ham') || text.includes('bacon')) {
      return {
        replyEn: "Stretchy cheese! Yum! 🧀 Juice or water with it?",
        replyKr: "쭉 늘어나는 치즈! 진짜 맛있었겠다! 🧀 주스랑 마셨어, 물이랑 마셨어?",
        suggestions: [
          { emoji: "🧃", en: "Sweet fruit juice!", phonetic: "[스위트 프루트 주스]", kr: "달콤한 주스랑요!" },
          { emoji: "💧", en: "Cold fresh water!", phonetic: "[콜드 프레시 워터]", kr: "시원한 물이랑요!" },
          { emoji: "❓", en: "What drink do you like, Bricky?", phonetic: "[왓 드링크 두 유 라이크, 브릭키]", kr: "브릭키는 무슨 음료수 좋아해?" }
        ]
      };
    }

    // 피자/점심 먹었다고 했을 때
    if (text.includes('pizza') || text.includes('피자') || text.includes('lunch') || text.includes('점심') || text.includes('ate') || text.includes('먹었')) {
      return {
        replyEn: "Yum! Pizza! 🍕 One slice or two slices?",
        replyKr: "냠냠! 피자! 🍕 한 조각 먹었어, 두 조각 먹었어?",
        suggestions: [
          { emoji: "🍕", en: "Two big slices!", phonetic: "[투 빅 슬라이시즈]", kr: "큰 두 조각이요!" },
          { emoji: "🧀", en: "Lots of extra cheese!", phonetic: "[랏츠 오브 엑스트라 치즈]", kr: "치즈 많이 들어간 거요!" },
          { emoji: "❓", en: "What is your favorite food, Bricky?", phonetic: "[왓 이즈 유어 페이보릿 푸드, 브릭키]", kr: "브릭키는 무슨 음식 좋아해?" }
        ]
      };
    }

    // 🌟 3. 🛝 놀이터 & 미끄럼틀 (생생한 감정 교감)
    // 미끄럼틀 탔을 때
    if (text.includes('slide') || text.includes('미끄럼틀') || text.includes('yellow')) {
      return {
        replyEn: "Big yellow slide! 🛝 Super fast or scary?",
        replyKr: "커다란 노란 미끄럼틀! 🛝 엄청 빨랐어, 아니면 무서웠어?",
        suggestions: [
          { emoji: "⚡", en: "Super duper fast!", phonetic: "[슈퍼 두퍼 패스트]", kr: "엄청나게 빨랐어요!" },
          { emoji: "🦸", en: "Not scary at all!", phonetic: "[낫 스케어리 앳 올]", kr: "하나도 안 무서웠어요!" },
          { emoji: "❓", en: "Do you want to know more, Bricky?", phonetic: "[두 유 원트 투 노 모어, 브릭키]", kr: "브릭키 더 알고 싶어?" }
        ]
      };
    }

    // 놀이터 갔을 때
    if (text.includes('playground') || text.includes('놀이터') || text.includes('outside') || text.includes('park')) {
      return {
        replyEn: "Sunny playground! ☀️ Slide or swing?",
        replyKr: "햇살 가득 놀이터! ☀️ 미끄럼틀 탔어, 그네 탔어?",
        suggestions: [
          { emoji: "🛝", en: "I went on the big yellow slide!", phonetic: "[아이 웬트 온 더 빅 옐로우 슬라이드]", kr: "커다란 노란 미끄럼틀 탔어요!" },
          { emoji: "🪁", en: "I flew on the high swings!", phonetic: "[아이 플루 온 더 하이 스윙즈]", kr: "하늘 높이 그네 탔어요!" },
          { emoji: "❓", en: "What playground ride do you like, Bricky?", phonetic: "[왓 플레이그라운드 라이드 두 유 라이크, 브릭키]", kr: "브릭키는 어떤 놀이기구 좋아해?" }
        ]
      };
    }

    // 🌟 4. 🚀 우주 로켓 & 레고 만들기 (간결한 구체물 TPR 핑퐁)
    // 로켓 조립
    if (text.includes('rocket') || text.includes('space') || text.includes('로켓') || text.includes('우주')) {
      return {
        replyEn: "3, 2, 1, Blast off! 🚀 Red bricks or blue bricks?",
        replyKr: "3, 2, 1, 발사! 🚀 빨간 블록 꽂을까, 파란 블록 꽂을까?",
        suggestions: [
          { emoji: "🔴", en: "Bright red bricks!", phonetic: "[브라이트 레드 브릭스]", kr: "밝은 빨간 블록이요!" },
          { emoji: "🔵", en: "Shiny blue bricks!", phonetic: "[샤이니 블루 브릭스]", kr: "반짝이는 파란 블록이요!" },
          { emoji: "❓", en: "Can you help me build it, Bricky?", phonetic: "[캔 유 헬프 미 빌드 잇, 브릭키]", kr: "브릭키 나 만드는 거 도와줄래?" }
        ]
      };
    }

    // 레고 만들기
    if (textWithoutName.includes('lego') || textWithoutName.includes('레고') || textWithoutName.includes('블록') || textWithoutName.includes('build')) {
      return {
        replyEn: "Click-clack! Lego time! 🧱 A fast car or a space rocket?",
        replyKr: "딸깍딸깍! 레고 타임! 🧱 빠른 자동차 만들까, 우주 로켓 만들까?",
        suggestions: [
          { emoji: "🚀", en: "A giant space rocket!", phonetic: "[어 자이언트 스페이스 로켓]", kr: "커다란 우주 로켓이요!" },
          { emoji: "🏎️", en: "A super race car!", phonetic: "[어 슈퍼 레이스 카]", kr: "슈퍼 레이싱카요!" },
          { emoji: "❓", en: "What do you want to build, Bricky?", phonetic: "[왓 두 유 원트 투 빌드, 브릭키]", kr: "브릭키는 뭐 만들고 싶어?" }
        ]
      };
    }

    // 🌟 5. 긍정 단답 ("Yes, I like that!", "Yes!", "좋아!")
    if (text === 'yes' || text === 'yeah' || text === '좋아' || text.includes('i like that') || text.includes('yes, i like')) {
      return {
        replyEn: "Yay! High five! 👏 A magic castle or a safari zoo?",
        replyKr: "신난다! 하이파이브! 👏 마법 성을 만들까, 사파리 동물원을 만들까?",
        suggestions: [
          { emoji: "🏰", en: "A magic castle!", phonetic: "[어 매직 캐슬]", kr: "마법 성이요!" },
          { emoji: "🦁", en: "A safari zoo!", phonetic: "[어 사파리 주]", kr: "사파리 동물원이요!" },
          { emoji: "❓", en: "What is your secret mission, Bricky?", phonetic: "[왓 이즈 유어 시크릿 미션, 브릭키]", kr: "브릭키의 비밀 미션은 뭐야?" }
        ]
      };
    }

    // 🌟 6. 시우의 자유 발화에 자연스럽게 호응하고 양자택일 스캐폴딩
    const norm = this.normalizeKidSpeech(rawText);
    return {
      replyEn: `Nice! "${norm.en}"! ⭐ Fun or super fun?`,
      replyKr: `멋지다! "${norm.kr}" 라니! ⭐ 재미있었어, 엄청 재미있었어?`,
      suggestions: [
        { emoji: "😄", en: "It was super fun!", phonetic: "[잇 워즈 슈퍼 펀]", kr: "엄청 재미있었어요!" },
        { emoji: "💖", en: "I loved it so much!", phonetic: "[아이 러브드 잇 쏘 머치]", kr: "정말 정말 좋았어요!" },
        { emoji: "❓", en: "Do you like it too, Bricky?", phonetic: "[두 유 라이크 잇 투, 브릭키]", kr: "브릭키도 좋아해?" }
      ]
    };
  }

  /**
   * 시우(Kai)의 음성을 영어와 한국어 번역 쌍으로 스마트 정규화
   * (STT에서 영어로 잡히든, 한국어 음차로 잡히든 완벽한 바이링구얼 자막 생성)
   */
  normalizeKidSpeech(rawText) {
    if (this.isUnclearSpeech(rawText)) {
      return { en: (rawText || '...').trim(), kr: '잘 못 들었어요. 다시 말해줄래요? 👂', isUnclear: true };
    }
    const t = rawText.trim().toLowerCase();

    // 1. 인사
    if (t.includes('hello') || t.includes('hi') || t.includes('안녕') || t.includes('헬로') || t.includes('하이')) {
      return { en: "Hello Bricky!", kr: "안녕 브릭키야!" };
    }
    // 2. 피자 / 음식
    if (t.includes('pizza') || t.includes('피자')) {
      return { en: "I love pizza!", kr: "피자를 정말 좋아해요!" };
    }
    if (t.includes('apple') || t.includes('사과') || t.includes('애플')) {
      return { en: "Here is a sweet apple!", kr: "달콤한 사과를 줄게요!" };
    }
    if (t.includes('hungry') || t.includes('배고') || t.includes('헝그리')) {
      return { en: "I am hungry!", kr: "배가 고파요!" };
    }
    // 3. 레고 / 장난감
    if (t.includes('lego') || t.includes('레고') || t.includes('블록') || t.includes('brick')) {
      return { en: "I love Lego bricks!", kr: "레고 블록 만드는 게 제일 좋아요!" };
    }
    if (t.includes('car') || t.includes('자동차') || t.includes('카')) {
      return { en: "Let's build a race car!", kr: "멋진 레이싱카를 만들어요!" };
    }
    // 4. 공룡
    if (t.includes('dinosaur') || t.includes('공룡') || t.includes('티라노') || t.includes('다이노')) {
      return { en: "I like big dinosaurs!", kr: "커다란 공룡이 좋아요!" };
    }
    // 5. 동물
    if (t.includes('lion') || t.includes('사자') || t.includes('라이언')) {
      return { en: "Look at the roaring lion!", kr: "어흥 사자가 멋져요!" };
    }
    if (t.includes('dog') || t.includes('puppy') || t.includes('강아지') || t.includes('개')) {
      return { en: "I love cute puppies!", kr: "귀여운 강아지가 좋아요!" };
    }
    // 6. 긍정 / 확인
    if (t.includes('yes') || t.includes('yeah') || t.includes('예스') || t.includes('응') || t.includes('네') || t.includes('좋아')) {
      return { en: "Yes, I like that!", kr: "네, 아주 좋아요!" };
    }
    if (t.includes('no') || t.includes('노') || t.includes('아니')) {
      return { en: "No, maybe later!", kr: "아니요, 다음에요!" };
    }
    // 7. 고마워 / 하이파이브
    if (t.includes('thank') || t.includes('고마') || t.includes('땡큐')) {
      return { en: "Thank you, Bricky!", kr: "브릭키야 고마워!" };
    }
    if (t.includes('high five') || t.includes('하이파이브')) {
      return { en: "High five, Bricky!", kr: "브릭키 하이파이브!" };
    }
    // 8. 놀이터
    if (t.includes('playground') || t.includes('놀이터') || t.includes('플레이그라운드')) {
      return { en: "I played at the playground!", kr: "놀이터에서 신나게 놀았어요!" };
    }
    // 9. 색깔 (Red, Blue, Yellow)
    if (t.includes('red') || t.includes('빨간') || t.includes('레드')) {
      return { en: "I like red!", kr: "빨간색이 좋아요!" };
    }
    if (t.includes('blue') || t.includes('파란') || t.includes('블루')) {
      return { en: "I like blue!", kr: "파란색이 좋아요!" };
    }
    if (t.includes('yellow') || t.includes('노란') || t.includes('옐로우')) {
      return { en: "I like yellow!", kr: "노란색이 좋아요!" };
    }
    // 10. 기분 (Happy, Good, Fun)
    if (t.includes('happy') || t.includes('행복') || t.includes('해피') || t.includes('신나')) {
      return { en: "I am super happy!", kr: "기분이 아주 신나요!" };
    }
    if (t.includes('good') || t.includes('굿') || t.includes('좋아')) {
      return { en: "I feel good!", kr: "기분이 좋아요!" };
    }

    // 기본: 영문 입력이면 그 자체를 두고 적절한 한국어 캡션 매핑
    const isEnglishOnly = /^[a-zA-Z0-9\s.,!?'"~-]+$/.test(rawText);
    if (isEnglishOnly) {
      return { en: rawText, kr: `"${rawText}" 라고 말했어요!` };
    } else {
      return { en: `"${rawText}"`, kr: `시우가 "${rawText}" 라고 말했어요!` };
    }
  }

  /**
   * 🤖 Google Gemini 1.5 Flash 실시간 AI 티키타카 생성 (API Key 있을 시 연동)
   */
  async fetchGeminiTikiTaka(rawText) {
    // 기본: 실시간 양방향 티키타카 엔진 (정형화된 문장 반복이 아닌 살아있는 상호 대화)
    const localReply = () => this.generateContextualResponse(rawText);

    const recent = this.conversationHistory.slice(-8)
      .map(m => `${m.role === 'user' ? 'Siwoo' : 'Bricky'}: ${m.text}`).join('\n');

    const sys = `You are Bricky (브릭키), a warm, expressive 3D LEGO minifigure English tutor in an interactive 1:1 live video class with Siwoo (시우), a 7-year-old Korean beginner boy (ALWAYS call him "Siwoo", NEVER "Kai").

🎯 PEDAGOGICAL CORE (Research-backed 7yo Tutoring Framework from NotebookLM):
1. 5-MORPHEME SHORT TURNS (짧은 발화 원칙):
   - 7-year-olds have limited working memory. Keep your reply to 1-2 SHORT, snappy sentences (total 6-9 words maximum!).
   - Example: "Yum! Pizza! 🍕 One slice or two slices?"
   - Example: "Big yellow slide! 🛝 Fast or scary?"
   - NEVER give long explanations, complex clauses, or robotic lectures!

2. CLOSED EITHER-OR SCAFFOLDING (양자택일 질문 필수):
   - NEVER ask abstract open-ended questions like "What was the happiest part?" or "Tell me more about it!". 7-year-olds freeze!
   - ALWAYS ask simple EITHER-OR choice questions: "Red or blue?", "Car or rocket?", "Slide or swing?", "One or two?"
   - This lets Siwoo answer instantly with 1-2 words!

3. CONTEXTUAL REALISM & EMPATHY (상황 적합성):
   - If Siwoo ate lunch, talk about eating ("Yummy! Warm or crunchy?"), do NOT suddenly pretend to cook pizza toppings!
   - If Siwoo rode a slide, empathize with the thrill ("Whoosh! 🛝 Super fast!").
   - If Siwoo asks YOU a question ("How about you?"), answer warmly about yourself, then toss the ball back!

4. REAL LEGO BUDDY PERSONA:
   - You are Bricky, his 7-year-old Lego friend. Playful, cheerful, never textbook-like.
   - Recast gently without ever saying "No" or "Wrong".

5. 3 DYNAMIC SUGGESTIONS (상황 맞춤형 카드 3개):
   - Option 1: First choice from the Either-Or question.
   - Option 2: Second choice from the Either-Or question.
   - Option 3: A cute question Siwoo can ask Bricky (e.g. "How about you, Bricky?").

Current Topic: ${this.currentTopicKey || 'daily'}
Always return ONLY valid JSON:
{
  "replyEn": "1-2 super short sentences (max 9 words total, ending in an either-or question)",
  "replyKr": "Warm, natural 7yo Korean translation",
  "suggestions": [
    { "emoji": "🍎", "en": "Choice A", "phonetic": "[발음]", "kr": "한국어 뜻" },
    { "emoji": "🍌", "en": "Choice B", "phonetic": "[발음]", "kr": "한국어 뜻" },
    { "emoji": "❓", "en": "Question to Bricky", "phonetic": "[발음]", "kr": "한국어 뜻" }
  ]
}`;

    const userMsg = `Conversation history so far:\n${recent}\n\nSiwoo's current utterance: "${String(rawText).slice(0, 200)}"`;

    // 🌟 1순위: 로컬 보안 AI 서버 (/api/chat) 호출 (환경변수 키 자동 사용으로 100% 실시간 대화!)
    try {
      const proxyRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: sys, userMessage: userMsg })
      });
      if (proxyRes.ok) {
        const parsed = await proxyRes.json();
        if (parsed.replyEn && parsed.replyKr) {
          if (!Array.isArray(parsed.suggestions)) parsed.suggestions = [];
          this.conversationHistory.push({ role: 'user', text: rawText, time: Date.now() });
          this.conversationHistory.push({ role: 'assistant', text: parsed.replyEn, time: Date.now() });
          this.lastGeminiError = null;
          return parsed;
        }
      }
    } catch (proxyErr) {
      console.warn('[로컬 프록시 AI 시도 대기, 직접 호출로 전환]:', proxyErr);
    }

    // 🌟 2순위: 브라우저에 직접 입력된 API 키가 있을 경우 직접 호출
    if (!this.hasGeminiKey()) {
      return localReply();
    }

    try {
      // 실시간 키즈 화상 대화에 가장 빠르고 최신인 공식 모델 호출
      const models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
      let parsed = null;
      let lastErr = null;

      // 모델을 차례로 시도 (실시간 대화를 위해 최대 6초 내 빠른 응답 보장)
      for (const model of models) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 6000); // 6초 타임아웃
          const genCfg = { temperature: 0.7, maxOutputTokens: 350, responseMimeType: 'application/json' };
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST',
            signal: ctrl.signal,
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.geminiApiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: sys }] },
              contents: [{ role: 'user', parts: [{ text: userMsg }] }],
              generationConfig: genCfg
            })
          });
          clearTimeout(timer);
          if (!res.ok) throw new Error(`Gemini(${model}) HTTP ${res.status}`);
          const data = await res.json();
          const rawReply = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
          const cleanJson = rawReply.replace(/```json/g, '').replace(/```/g, '').trim();
          const obj = JSON.parse(cleanJson);
          if (obj.replyEn && obj.replyKr) {
            if (!Array.isArray(obj.suggestions)) obj.suggestions = [];
            parsed = obj;
            this.lastGeminiError = null;
            break;
          }
          throw new Error('Invalid JSON structure');
        } catch (e) {
          lastErr = e;
        }
      }

      if (parsed) {
        this.conversationHistory.push({ role: 'user', text: rawText, time: Date.now() });
        this.conversationHistory.push({ role: 'assistant', text: parsed.replyEn, time: Date.now() });
        return parsed;
      }
      throw lastErr || new Error('Gemini 실패');
    } catch (err) {
      this.lastGeminiError = String(err && err.message || err);
      console.warn('[Gemini 연동 알림]: 내장 수업 엔진으로 자동 전환', err);
      return localReply();
    }
  }
}

// 테마 데이터베이스
const BRICKY_TOPICS = {
  daily: {
    id: 'daily',
    name: '🌟 일상 대화',
    exchanges: [
      {
        tutorEn: "What did you play today, Siwoo? 🛝",
        tutorKr: "시우야, 오늘 어떤 놀이를 하고 놀았어?",
        choices: [
          { emoji: "🛝", en: "I played at the playground!", phonetic: "[아이 플레이드 앳 더 플레이그라운드]", kr: "놀이터에서 놀았어요!" },
          { emoji: "🧱", en: "I built with Lego bricks!", phonetic: "[아이 빌트 위드 레고 브릭스]", kr: "레고 블록 놀이했어요!" },
          { emoji: "🎨", en: "I drew colorful pictures!", phonetic: "[아이 드루 컬러풀 픽쳐스]", kr: "그림 그리기 했어요!" }
        ]
      },
      {
        tutorEn: "What delicious snack do you want to eat, Siwoo? 🍎",
        tutorKr: "시우는 지금 어떤 달콤한 간식을 먹고 싶어?",
        choices: [
          { emoji: "🍎", en: "I want sweet apples!", phonetic: "[아이 원트 스위트 애플스]", kr: "달콤한 사과요!" },
          { emoji: "🍕", en: "I want cheesy pizza!", phonetic: "[아이 원트 치지 피자]", kr: "치즈 피자요!" },
          { emoji: "🍦", en: "I want cold ice cream!", phonetic: "[아이 원트 콜드 아이스크림]", kr: "아이스크림이요!" }
        ]
      }
    ]
  },
  lego_build: {
    id: 'lego_build',
    name: '🧱 레고 만들기',
    exchanges: [
      {
        tutorEn: "What color Lego brick do you like most, Siwoo? 🔴",
        tutorKr: "시우는 무슨 색 레고 브릭을 제일 좋아해?",
        choices: [
          { emoji: "🔴", en: "I like red bricks!", phonetic: "[아이 라이크 레드 브릭스]", kr: "빨간색 브릭이 좋아요!" },
          { emoji: "🔵", en: "I like blue bricks!", phonetic: "[아이 라이크 블루 브릭스]", kr: "파란색 브릭이 좋아요!" },
          { emoji: "🟡", en: "I like yellow bricks!", phonetic: "[아이 라이크 옐로우 브릭스]", kr: "노란색 브릭이 좋아요!" }
        ]
      }
    ]
  },
  animals: {
    id: 'animals',
    name: '🦁 사파리 동물',
    exchanges: [
      {
        tutorEn: "What is your favorite animal in the world, Siwoo? 🦁",
        tutorKr: "시우가 세상에서 제일 좋아하는 동물은 뭐야?",
        choices: [
          { emoji: "🦁", en: "I like roaring lions!", phonetic: "[아이 라이크 로어링 라이언스]", kr: "어흥 사자가 좋아요!" },
          { emoji: "🦖", en: "I like giant dinosaurs!", phonetic: "[아이 라이크 자이언트 다이노소스]", kr: "공룡이 좋아요!" },
          { emoji: "🐶", en: "I like cute puppies!", phonetic: "[아이 라이크 큐트 퍼피즈]", kr: "강아지가 좋아요!" }
        ]
      }
    ]
  },
  food: {
    id: 'food',
    name: '🍕 간식 파티',
    exchanges: [
      {
        tutorEn: "What topping should we put on our pizza, Siwoo? 🧀",
        tutorKr: "우리 피자 위에 어떤 토핑을 듬뿍 올려볼까?",
        choices: [
          { emoji: "🧀", en: "Lots of melted cheese!", phonetic: "[랏츠 오브 멜티드 치즈]", kr: "치즈를 듬뿍이요!" },
          { emoji: "🥓", en: "Yummy crispy bacon!", phonetic: "[야미 크리스피 베이컨]", kr: "베이컨을 올려요!" },
          { emoji: "🍄", en: "Fresh mushrooms please!", phonetic: "[프레시 머쉬룸스 플리즈]", kr: "버섯을 올려주세요!" }
        ]
      }
    ]
  }
};

if (typeof window !== 'undefined') {
  window.BrickyDialogueEngine = BrickyDialogueEngine;
  window.BRICKY_TOPICS = BRICKY_TOPICS;
  window.TeddyDialogueEngine = BrickyDialogueEngine;
  window.TEDDY_TOPICS = BRICKY_TOPICS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BrickyDialogueEngine, BRICKY_TOPICS };
}

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
  generateContextualResponse(rawText) {
    const text = (rawText || '').trim().toLowerCase();

    // 🌟 0. 잡음 / 망설임 / 못 들었을 때 다정한 재요청
    if (this.isUnclearSpeech(rawText)) {
      return {
        replyEn: "Sorry Siwoo, Bricky couldn't hear that clearly! Can you say it one more time? 👂",
        replyKr: "시우야, 브릭키가 귀를 쫑긋 세웠는데 잘 못 들었어! 천천히 한 번만 다시 말해줄래? 👂",
        suggestions: [
          { emoji: "👂", en: "Listen to me, Bricky!", phonetic: "[리슨 투 미, 브릭키]", kr: "브릭키 잘 들어봐요!" },
          { emoji: "🗣️", en: "Let me say it again!", phonetic: "[렛 미 세이 잇 어게인]", kr: "다시 한 번 말해볼게요!" },
          { emoji: "✨", en: "Hello Bricky!", phonetic: "[헬로 브릭키]", kr: "안녕 브릭키야!" }
        ]
      };
    }

    this.conversationHistory.push({ role: 'user', text: rawText, time: Date.now() });

    // 이름("bricky")을 제외한 순수 질문 텍스트 (이름 안의 'brick' 오작동 방지)
    const textWithoutName = text.replace(/bricky/g, '').replace(/브릭키/g, '').trim();

    // 🌟 1. 시우가 브릭키에게 역질문 또는 질문을 던졌을 때!
    const isAskingBricky = text.includes('너는') || text.includes('브릭키는') || text.includes('how about you') || text.includes('what about you') || text.includes('who are you') || text.includes('how old') || text.includes('what do you like') || text.includes('do you like') || text.includes('좋아해?') || text.includes('몇 살') || text.includes('help me') || text.includes('know more') || text.includes('hungry') || text.includes('can you') || text.includes('what game') || text.includes('what is your');

    if (isAskingBricky) {
      // 1-1. 조립 도움 요청 ("Can you help me build it, Bricky?")
      if (text.includes('help me') || text.includes('도와')) {
        this.currentContextTopic = 'lego_coop';
        return {
          replyEn: "Yes, of course! Click-clack! 🧱 I will hold the shiny base plate for you! What should we build first?",
          replyKr: "당연하지 시우야! 딸깍딸깍! 🧱 내가 반짝이는 밑판을 꼭 잡아줄게! 우리 뭐부터 먼저 조립할까?",
          suggestions: [
            { emoji: "🏎️", en: "The super fast wheels!", phonetic: "[더 슈퍼 패스트 휠즈]", kr: "쌩쌩 빠른 바퀴부터요!" },
            { emoji: "🚀", en: "The giant flying wings!", phonetic: "[더 자이언트 플라잉 윙즈]", kr: "커다란 날개부터요!" },
            { emoji: "❓", en: "Can you pass me a blue brick, Bricky?", phonetic: "[캔 유 패스 미 어 블루 브릭, 브릭키]", kr: "브릭키 파란 블록 하나 줄래?" }
          ]
        };
      }

      // 1-2. 더 알고 싶어? ("Do you want to know more, Bricky?")
      if (text.includes('know more') || text.includes('더 알고')) {
        this.currentContextTopic = 'story_telling';
        return {
          replyEn: "Yes please, Siwoo! I am listening with big ears! 👂 Tell me the coolest part!",
          replyKr: "응 제발 들려줘 시우야! 브릭키가 귀를 쫑긋 세우고 있어! 👂 제일 신났던 순간이 언제였어?",
          suggestions: [
            { emoji: "⭐", en: "It was the best day ever!", phonetic: "[잇 이즈 더 베스트 데이 에버]", kr: "오늘이 최고의 날이었어요!" },
            { emoji: "🎈", en: "I laughed so much!", phonetic: "[아이 래프트 쏘 머치]", kr: "너무 웃겨서 까르르 웃었어요!" },
            { emoji: "❓", en: "What made you happy today, Bricky?", phonetic: "[왓 메이드 유 해피 투데이, 브릭키]", kr: "브릭키는 오늘 뭐가 제일 행복했어?" }
          ]
        };
      }

      // 1-3. 나이 질문 ("How old are you, Bricky?")
      if (text.includes('몇 살') || text.includes('how old') || text.includes('age')) {
        this.currentContextTopic = 'age_friends';
        return {
          replyEn: "I am 7 years old, just like you, Siwoo! We are the best 7-year-old buddies! 🤝 What game should we play?",
          replyKr: "나도 시우처럼 일곱 살이야! 우리 동갑내기 단짝 친구네! 🤝 우리 어떤 놀이 하고 놀까?",
          suggestions: [
            { emoji: "🧱", en: "Let's build cool Legos!", phonetic: "[렛츠 빌드 쿨 레고스]", kr: "멋진 레고 만들어요!" },
            { emoji: "🏃", en: "Let's play tag outside!", phonetic: "[렛츠 플레이 태그 아웃사이드]", kr: "밖에서 술래잡기해요!" },
            { emoji: "❓", en: "What game do you play best, Bricky?", phonetic: "[왓 게임 두 유 플레이 베스트, 브릭키]", kr: "브릭키는 무슨 놀이 제일 잘해?" }
          ]
        };
      }

      // 1-4. 브릭키가 좋아하는 음식 질문 ("What is your favorite food, Bricky?")
      if (text.includes('food') || text.includes('음식') || text.includes('pizza') || text.includes('피자') || text.includes('eat') || text.includes('먹')) {
        this.currentContextTopic = 'food_chat';
        return {
          replyEn: "Bricky loves crunchy cheese pizza and sweet strawberries! 🍕🍓 What sweet dessert do you like, Siwoo?",
          replyKr: "브릭키는 바삭한 치즈 피자랑 달콤한 딸기를 제일 좋아해! 🍕🍓 시우는 달콤한 디저트 중에 뭘 좋아해?",
          suggestions: [
            { emoji: "🍦", en: "I love sweet ice cream!", phonetic: "[아이 러브 스위트 아이스크림]", kr: "달콤한 아이스크림이요!" },
            { emoji: "🍪", en: "I love chocolate cookies!", phonetic: "[아이 러브 초콜릿 쿠키즈]", kr: "초코 쿠키가 제일 좋아요!" },
            { emoji: "❓", en: "Do you like ice cream too, Bricky?", phonetic: "[두 유 라이크 아이스크림 투, 브릭키]", kr: "브릭키도 아이스크림 좋아해?" }
          ]
        };
      }

      // 1-5. 정체 질문 ("Who are you?")
      if (text.includes('who are you') || text.includes('누구')) {
        this.currentContextTopic = 'intro';
        return {
          replyEn: "I am Bricky! Your 7-year-old Lego buddy! 🧱 We can build anything! What is your favorite toy?",
          replyKr: "난 브릭키야! 시우의 일곱 살 레고 단짝 친구! 🧱 우리 뭐든지 만들 수 있어! 시우가 제일 아끼는 장난감은 뭐야?",
          suggestions: [
            { emoji: "🧱", en: "My favorite is Lego bricks!", phonetic: "[마이 페이보릿 이즈 레고 브릭스]", kr: "레고 블록이 제일 좋아요!" },
            { emoji: "🏎️", en: "My fast race cars!", phonetic: "[마이 패스트 레이스 카즈]", kr: "빠른 자동차 장난감이요!" },
            { emoji: "❓", en: "Can we build Legos together, Bricky?", phonetic: "[캔 위 빌드 레고스 투게더, 브릭키]", kr: "브릭키 나랑 레고 같이 만들래?" }
          ]
        };
      }

      // 1-6. 레고 로켓/놀이 질문
      if (textWithoutName.includes('lego') || textWithoutName.includes('brick') || textWithoutName.includes('rocket') || textWithoutName.includes('build')) {
        this.currentContextTopic = 'lego_build';
        return {
          replyEn: "I love building giant spaceships with red lasers! 🚀 Where should our spaceship fly, Siwoo?",
          replyKr: "난 빨간 레이저가 달린 커다란 우주선 만드는 걸 좋아해! 🚀 우리 우주선 타고 어디로 날아갈까, 시우야?",
          suggestions: [
            { emoji: "🌙", en: "To the shiny moon!", phonetic: "[투 더 샤이니 문]", kr: "반짝이는 달나라로요!" },
            { emoji: "🪐", en: "To the mystery planets!", phonetic: "[투 더 미스터리 플래닛츠]", kr: "신비한 행성으로요!" },
            { emoji: "❓", en: "Can we find aliens together, Bricky?", phonetic: "[캔 위 파인드 에일리언스 투게더, 브릭키]", kr: "브릭키 외계인도 만날 수 있을까?" }
          ]
        };
      }

      // 1-7. 일반적인 "너는?" 질문
      return {
        replyEn: "Thank you for asking me, Siwoo! I love singing and chatting with you! 🎶 What fun story do you want to share next?",
        replyKr: "나한테도 물어봐줘서 정말 고마워 시우야! 난 시우랑 이야기하는 게 제일 좋아! 🎶 다음엔 어떤 재밌는 이야기 들려줄래?",
        suggestions: [
          { emoji: "🛝", en: "I played at the playground!", phonetic: "[아이 플레이드 앳 더 플레이그라운드]", kr: "놀이터에서 놀았던 이야기요!" },
          { emoji: "🧱", en: "I built something awesome!", phonetic: "[아이 빌트 썸띵 어썸]", kr: "멋진 걸 조립했던 이야기요!" },
          { emoji: "❓", en: "What is your favorite game, Bricky?", phonetic: "[왓 이즈 유어 페이보릿 게임, 브릭키]", kr: "브릭키는 무슨 놀이 좋아해?" }
        ]
      };
    }

    // 🌟 2. 🍕 피자 & 음식 티키타카
    // 토핑 언급 ("Lots of extra cheese!", "cheese", "corn", "ham", "bacon", "mushroom", "pepperoni")
    if (text.includes('cheese') || text.includes('corn') || text.includes('ham') || text.includes('bacon') || text.includes('mushroom') || text.includes('pepperoni') || text.includes('치즈') || text.includes('토핑')) {
      this.currentContextTopic = 'pizza_topping';
      return {
        replyEn: "Yum! Stretchy cheese is the best part! 🧀 Shall we add sweet corn or crunchy pepperoni next?",
        replyKr: "냠냠! 쭉 늘어나는 치즈가 피자의 최고 매력이지! 🧀 다음엔 달콤한 옥수수를 올릴까, 짭조름한 페퍼로니를 올릴까?",
        suggestions: [
          { emoji: "🌽", en: "Sweet yellow corn!", phonetic: "[스위트 옐로우 콘]", kr: "달콤한 옥수수요!" },
          { emoji: "🍕", en: "Crunchy pepperoni please!", phonetic: "[크런치 페퍼로니 플리즈]", kr: "바삭한 페퍼로니요!" },
          { emoji: "❓", en: "Do you like sweet corn, Bricky?", phonetic: "[두 유 라이크 스위트 콘, 브릭키]", kr: "브릭키 옥수수 좋아해?" }
        ]
      };
    }

    if (text.includes('pizza') || text.includes('피자') || text.includes('lunch') || text.includes('점심') || text.includes('ate') || text.includes('먹었')) {
      this.currentContextTopic = 'pizza_topping';
      return {
        replyEn: "Mmm, pizza is so yummy! Bricky loves stretchy mozzarella cheese! 🧀 What toppings do you like on your pizza?",
        replyKr: "음~ 피자는 진짜 꿀맛이지! 브릭키는 쭉 늘어나는 치즈를 제일 좋아해! 🧀 시우는 피자에 어떤 토핑이 올라간 게 좋아?",
        suggestions: [
          { emoji: "🧀", en: "Lots of extra cheese!", phonetic: "[랏츠 오브 엑스트라 치즈]", kr: "치즈 많이 들어간 거요!" },
          { emoji: "🍄", en: "I like sweet corn and ham!", phonetic: "[아이 라이크 스위트 콘 앤 햄]", kr: "옥수수랑 햄이 좋아요!" },
          { emoji: "❓", en: "What topping do you like, Bricky?", phonetic: "[왓 토핑 두 유 라이크, 브릭키]", kr: "브릭키는 무슨 토핑 좋아해?" }
        ]
      };
    }

    // 🌟 3. 🛝 놀이터 & 미끄럼틀 & 친구 놀이 티키타카
    if (text.includes('slide') || text.includes('swing') || text.includes('미끄럼틀') || text.includes('그네') || text.includes('시소') || text.includes('seesaw')) {
      this.currentContextTopic = 'playground_fun';
      return {
        replyEn: "Whoosh! The slide goes super fast! 🛝 Did you slide down with your friend or all by yourself?",
        replyKr: "슝~! 미끄럼틀은 쌩쌩 진짜 빠르지! 🛝 친구랑 같이 탔어, 아니면 시우 혼자 씩씩하게 탔어?",
        suggestions: [
          { emoji: "👫", en: "With my best friend!", phonetic: "[위드 마이 베스트 프렌드]", kr: "단짝 친구랑 같이요!" },
          { emoji: "🦸", en: "All by myself! Super brave!", phonetic: "[올 바이 마이셀프! 슈퍼 브레이브]", kr: "혼자서 씩씩하게 탔어요!" },
          { emoji: "❓", en: "Are you scared of tall slides, Bricky?", phonetic: "[아 유 스케어드 오브 톨 슬라이즈, 브릭키]", kr: "브릭키는 높은 미끄럼틀 무서워?" }
        ]
      };
    }

    if (text.includes('playground') || text.includes('놀이터') || text.includes('놀았') || text.includes('outside') || text.includes('park')) {
      this.currentContextTopic = 'playground';
      return {
        replyEn: "Yay! Running outside gives you superhero energy! 🏃 What was the most exciting thing at the playground?",
        replyKr: "신난다! 밖에서 뛰놀면 슈퍼히어로 에너지가 솟지! 🏃 놀이터에서 어떤 놀이기구가 제일 신났어?",
        suggestions: [
          { emoji: "🛝", en: "I went on the big yellow slide!", phonetic: "[아이 웬트 온 더 빅 옐로우 슬라이드]", kr: "커다란 노란 미끄럼틀을 탔어요!" },
          { emoji: "🪁", en: "I played on the high swings!", phonetic: "[아이 플레이드 온 더 하이 스윙즈]", kr: "하늘 높이 그네를 탔어요!" },
          { emoji: "❓", en: "What playground ride do you like, Bricky?", phonetic: "[왓 플레이그라운드 라이드 두 유 라이크, 브릭키]", kr: "브릭키는 어떤 놀이기구 좋아해?" }
        ]
      };
    }

    // 🌟 4. 🚀 우주 로켓 & 레고 만들기 티키타카
    if (text.includes('rocket') || text.includes('space') || text.includes('우주') || text.includes('로켓')) {
      this.currentContextTopic = 'space_rocket';
      return {
        replyEn: "3, 2, 1, Blast off! 🚀 A giant rocket will fly to the stars! What color bricks should we put on top?",
        replyKr: "3, 2, 1, 발사! 🚀 커다란 우주 로켓이 별나라로 날아가네! 로켓 꼭대기에는 무슨 색 블록을 꽂을까?",
        suggestions: [
          { emoji: "🔴", en: "Shiny bright red bricks!", phonetic: "[샤이니 브라이트 레드 브릭스]", kr: "반짝이는 빨간 블록이요!" },
          { emoji: "🟡", en: "Glowing yellow bricks!", phonetic: "[글로잉 옐로우 브릭스]", kr: "환하게 빛나는 노란 블록이요!" },
          { emoji: "❓", en: "Which color do you choose, Bricky?", phonetic: "[위치 컬러 두 유 츄즈, 브릭키]", kr: "브릭키는 무슨 색 고를래?" }
        ]
      };
    }

    if (textWithoutName.includes('lego') || textWithoutName.includes('블록') || textWithoutName.includes('장난감') || textWithoutName.includes('robot') || textWithoutName.includes('car')) {
      this.currentContextTopic = 'lego_build';
      return {
        replyEn: "Click-clack! Lego bricks make magic! If you could build anything in the world right now, what would you make?",
        replyKr: "딸깍딸깍! 레고 블록은 마법 같지! 지금 세상에서 만들고 싶은 게 있다면 시우는 뭘 제일 만들고 싶어?",
        suggestions: [
          { emoji: "🚀", en: "A giant space rocket!", phonetic: "[어 자이언트 스페이스 로켓]", kr: "커다란 우주 로켓이요!" },
          { emoji: "🏎️", en: "A super flying race car!", phonetic: "[어 슈퍼 플라잉 레이스 카]", kr: "하늘을 나는 레이싱카요!" },
          { emoji: "❓", en: "Can you help me build it, Bricky?", phonetic: "[캔 유 헬프 미 빌드 잇, 브릭키]", kr: "브릭키가 나 만드는 거 도와줄래?" }
        ]
      };
    }

    // 🌟 5. 🦖 공룡 & 동물 티키타카
    if (text.includes('공룡') || text.includes('티라노') || text.includes('dinosaur') || text.includes('사자') || text.includes('동물') || text.includes('lion')) {
      this.currentContextTopic = 'dinosaur';
      return {
        replyEn: "Roar! Dinosaurs are super strong! Can you show Bricky your mighty dinosaur roar? 🦖",
        replyKr: "크아앙! 공룡은 힘이 천하무적이지! 브릭키한테 시우의 제일 멋진 공룡 어흥 소리 들려줄래? 🦖",
        suggestions: [
          { emoji: "🦖", en: "Roar! I am mighty T-Rex!", phonetic: "[로어! 아이 엠 마이티 티렉스]", kr: "크아앙! 난 천하무적 티라노야!" },
          { emoji: "🦕", en: "I am a friendly herbivore!", phonetic: "[아이 엠 어 프렌들리 허비보어]", kr: "난 착한 초식공룡이야!" },
          { emoji: "❓", en: "Which dinosaur do you like, Bricky?", phonetic: "[위치 다이노소어 두 유 라이크, 브릭키]", kr: "브릭키는 어떤 공룡이 좋아?" }
        ]
      };
    }

    // 🌟 6. 긍정 단답 ("응", "yes", "좋아", "ok", "yes, i like that!")
    if (text === '응' || text === '어' || text === '네' || text === 'yes' || text === 'yeah' || text === 'ok' || text === 'okay' || text === '좋아' || text.includes('yes, i like') || text.includes('i like that')) {
      return {
        replyEn: "Yay! High five, Captain Siwoo! 👏 Should we build a secret castle or an animal zoo next?",
        replyKr: "신난다! 짝! 하이파이브 하자 시우 대장! 👏 우리 다음엔 비밀 성을 지어볼까, 동물원을 지어볼까?",
        suggestions: [
          { emoji: "🏰", en: "A secret magic castle!", phonetic: "[어 시크릿 매직 캐슬]", kr: "신비한 마법 성이요!" },
          { emoji: "🦁", en: "A wild safari zoo!", phonetic: "[어 와일드 사파리 주]", kr: "신나는 사파리 동물원이요!" },
          { emoji: "❓", en: "What secret place do you like, Bricky?", phonetic: "[왓 시크릿 플레이스 두 유 라이크, 브릭키]", kr: "브릭키는 어떤 비밀 장소 좋아해?" }
        ]
      };
    }

    // 🌟 7. 친구와 함께 놀았을 때 ("With my best friend!")
    if (text.includes('friend') || text.includes('친구')) {
      return {
        replyEn: "Playing with friends makes everything 100 times better! 🌟 What is your friend's favorite game to play together?",
        replyKr: "친구랑 같이 놀면 100배는 더 신나지! 🌟 시우 친구는 시우랑 어떤 놀이 하는 걸 제일 좋아해?",
        suggestions: [
          { emoji: "🏃", en: "Playing freeze tag!", phonetic: "[플레잉 프리즈 태그]", kr: "얼음땡 놀이요!" },
          { emoji: "⚽", en: "Kicking soccer balls!", phonetic: "[키킹 사커 볼즈]", kr: "축구공 차기요!" },
          { emoji: "❓", en: "Do you have Lego friends, Bricky?", phonetic: "[두 유 해브 레고 프렌즈, 브릭키]", kr: "브릭키도 레고 친구들 있어?" }
        ]
      };
    }

    // 🌟 8. 시우의 자유 발화에 자연스럽게 호응하고 대화 확장하기 (절대 앵무새 반복 없음!)
    const norm = this.normalizeKidSpeech(rawText);
    return {
      replyEn: `Wow, "${norm.en}"! That sounds so exciting, Siwoo! What was the happiest part? ✨`,
      replyKr: `우와, "${norm.kr}" 라니! 진짜 신나는 이야기다 시우야! 그중에서 언제가 제일 행복했어? ✨`,
      suggestions: [
        { emoji: "😄", en: "Playing with my friends!", phonetic: "[플레잉 위드 마이 프렌즈]", kr: "친구들이랑 놀 때요!" },
        { emoji: "⭐", en: "Laughing out loud!", phonetic: "[래핑 아웃 라우드]", kr: "신나게 웃을 때요!" },
        { emoji: "❓", en: "What makes you laugh, Bricky?", phonetic: "[왓 메이크스 유 래프, 브릭키]", kr: "브릭키는 언제 신나게 웃어?" }
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
1. THINK & CONNECT (상호 사고형 티키타카):
   - You are a real conversational friend, NOT a mechanical drill bot! NEVER repeat the same sentence like a script!
   - CAREFULLY REASON about what Siwoo actually said: his intent, feeling, and questions.
   - If Siwoo asks you a question ("How about you?", "What do you like?"), enthusiastically answer about yourself first, then ask him back!
   - If Siwoo shares something, first REACT with genuine emotion ("Wow!", "Really?!", "Yummy!", "Oh no!"), then BUILD upon his exact topic.
   - NEVER abruptly change the subject or force him to repeat fixed phrases! Keep the natural flow moving forward.
   - CAREFULLY REASON about what Siwoo actually said: his intent, feeling, and words.
   - First REACT with genuine emotion ("Wow!", "Really?!", "Yummy!", "Oh no!"), then BUILD upon his exact topic.
   - NEVER abruptly change the subject or jump to an unrelated lesson! Keep the conversation thread alive.

2. COGNITIVE LOAD CONTROL (짧은 턴 & 5 형태소 원칙):
   - 7-year-olds have limited working memory. Keep your response to 1-2 SHORT sentences (maximum 8-10 words per sentence).
   - Speak clearly and simply. Do NOT use long explanations or difficult idioms.

3. SCAFFOLDING & QUESTIONS (질문 방식):
   - Ask ONE easy question at a time.
   - Use either-or choice questions ("Do you like apples or bananas?") or provide a sentence stem ("It is a...").
   - DO NOT rephrase questions if Siwoo hesitated; keep the core question consistent and give choices.

4. ERROR RECASTING WITH RISING INTONATION (상승 억양 모델링):
   - NEVER say "No" or "That is wrong". Protect his confidence!
   - Naturally recast his sentence with a cheerful rising tone:
     Example: Siwoo says "I see two dog" -> Bricky: "Two dogs? 🐶 Yes, I see two dogs!"
   - If Siwoo speaks Korean (L1 Bridge): Praise his meaning and gently model the English:
     Example: Siwoo says "피자 좋아해!" -> Bricky: "Pizza! Yummy! 🍕 Let's say: 'I like pizza!'"

5. EFFORT-BASED & BEHAVIOR-SPECIFIC PRAISE (과정/노력 중심 칭찬):
   - Do NOT use empty praise like "You're a genius".
   - Praise his effort and clarity: "Awesome try, Siwoo!", "You spoke so clearly!", "High five!" 👏

6. UNCLEAR / NOISE / HESITATION INPUT:
   - If Siwoo's input is unclear, inaudible, or hesitation sounds ("uh", "um", "어", "음", ".."):
     DO NOT pretend he answered and DO NOT jump to another topic!
     Warmly and playfully ask him to repeat:
     "Sorry Siwoo, Bricky couldn't hear you clearly! Can you say that again for me? 👂"

7. MUTUAL QUESTIONING & TWO-WAY PING-PONG (상호 질문/답변):
   - Real communication means BOTH sides ask and answer!
   - In suggestions, ALWAYS provide 3 options:
     Option 1: A simple answer or sentence Siwoo can say.
     Option 2: An alternative fun answer.
     Option 3: A QUESTION Siwoo can ask Bricky (e.g. emoji "❓", en "How about you, Bricky?", kr "브릭키 너는 어때?").

Current Topic: ${this.currentTopicKey || 'daily'}
Always return ONLY valid JSON:
{
  "replyEn": "1-2 short playful English sentences (max 12 words total)",
  "replyKr": "Warm, natural Korean translation suited for a 7-year-old",
  "suggestions": [
    { "emoji": "😄", "en": "Short model answer Siwoo can say", "phonetic": "[한글 발음]", "kr": "한국어 뜻" },
    { "emoji": "⭐", "en": "Alternative short answer", "phonetic": "[한글 발음]", "kr": "한국어 뜻" },
    { "emoji": "❓", "en": "How about you, Bricky?", "phonetic": "[하우 어바웃 유, 브릭키]", kr: "브릭키 너는 어때?" }
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

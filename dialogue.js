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
    const hesitations = /^(uh|um|er|ah|eh|oh|어|음|그|아|\.+|ㅋ+|ㅎ+|\?+)$/i;
    if (hesitations.test(t)) return true;
    if (t.replace(/[\s\.\?!~,\-_]/g, '').length < 2) return true;
    return false;
  }

  /**
   * 🌟 멀티턴 티키타카(Tiki-Taka) 지능형 대화 생성기
   */
  generateContextualResponse(rawText) {
    const text = (rawText || '').trim().toLowerCase();

    // 🌟 말을 잘 못 들었거나 단순 잡음/망설임인 경우
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

    // 🌟 1. 시우가 브릭키에게 질문을 던졌을 때! (역질문 및 상호 인터랙션)
    const isAskingBricky = text.includes('너는') || text.includes('브릭키는') || text.includes('how about you') || text.includes('what about you') || text.includes('who are you') || text.includes('how old') || text.includes('what do you like') || text.includes('do you like') || text.includes('좋아해?') || text.includes('몇 살');
    
    if (isAskingBricky) {
      if (text.includes('몇 살') || text.includes('how old') || text.includes('age')) {
        return {
          replyEn: "I am 7 years old, just like you, Siwoo! We are the best Lego friends! ⭐ What is your favorite game?",
          replyKr: "나도 시우처럼 일곱 살이야! 우리 동갑내기 최고의 레고 친구네! ⭐ 시우는 요즘 무슨 놀이가 제일 재밌어?",
          suggestions: [
            { emoji: "🧱", en: "I love building Legos!", phonetic: "[아이 러브 빌딩 레고스]", kr: "레고 만드는 게 제일 좋아요!" },
            { emoji: "🎮", en: "I love playing video games!", phonetic: "[아이 러브 플레잉 비디오 게임즈]", kr: "게임하는 게 제일 재밌어요!" },
            { emoji: "❓", en: "What game do you play, Bricky?", phonetic: "[왓 게임 두 유 플레이, 브릭키]", kr: "브릭키는 무슨 놀이 해?" }
          ]
        };
      }
      if (text.includes('음식') || text.includes('먹') || text.includes('food') || text.includes('pizza') || text.includes('eat')) {
        return {
          replyEn: "Bricky loves crunchy cheese pizza and sweet strawberries! 🍕🍓 What is your absolute favorite food, Siwoo?",
          replyKr: "브릭키는 치즈 듬뿍 피자랑 달콤한 딸기를 제일 좋아해! 🍕🍓 시우가 세상에서 제일 좋아하는 음식은 뭐야?",
          suggestions: [
            { emoji: "🍕", en: "I love pizza too!", phonetic: "[아이 러브 피자 투]", kr: "나도 피자 정말 좋아해!" },
            { emoji: "🍗", en: "I love crispy chicken!", phonetic: "[아이 러브 크리스피 치킨]", kr: "바삭한 치킨이 제일 좋아요!" },
            { emoji: "❓", en: "Can we eat pizza together, Bricky?", phonetic: "[캔 위 잇 피자 투게더, 브릭키]", kr: "브릭키 나랑 피자 같이 먹을까?" }
          ]
        };
      }
      if (text.includes('레고') || text.includes('lego') || text.includes('brick') || text.includes('장난감')) {
        return {
          replyEn: "I love building giant yellow rockets with shiny wings! 🚀 What do you want to build with me, Siwoo?",
          replyKr: "난 날개 달린 커다란 노란 우주선 만드는 걸 제일 좋아해! 🚀 시우는 브릭키랑 같이 뭘 조립하고 싶어?",
          suggestions: [
            { emoji: "🏎️", en: "Let's build a race car!", phonetic: "[렛츠 빌드 어 레이스 카]", kr: "멋진 레이싱카 만들어요!" },
            { emoji: "🏰", en: "Let's build a giant castle!", phonetic: "[렛츠 빌드 어 자이언트 캐슬]", kr: "커다란 성을 만들어요!" },
            { emoji: "❓", en: "How fast can your rocket fly?", phonetic: "[하우 패스트 캔 유어 로켓 플라이]", kr: "브릭키 우주선은 얼마나 빨라?" }
          ]
        };
      }
      // 일반적인 "너는?" 질문
      return {
        replyEn: "Thank you for asking me, Siwoo! I love singing and chatting with you! 🎶 What fun thing should we talk about next?",
        replyKr: "나한테도 물어봐줘서 정말 고마워 시우야! 난 시우랑 노래하고 이야기하는 게 제일 좋아! 🎶 다음엔 무슨 신나는 얘기 할까?",
        suggestions: [
          { emoji: "🧱", en: "Let's talk about Legos!", phonetic: "[렛츠 톡 어바웃 레고스]", kr: "레고 이야기 더 해요!" },
          { emoji: "🦖", en: "Let's talk about dinosaurs!", phonetic: "[렛츠 톡 어바웃 다이노소어스]", kr: "공룡 이야기 해요!" },
          { emoji: "❓", en: "What is your favorite color, Bricky?", phonetic: "[왓 이즈 유어 페이보릿 컬러, 브릭키]", kr: "브릭키는 무슨 색 좋아해?" }
        ]
      };
    }

    // 🌟 2. 🍕 음식 & 식사 티키타카 (살아있는 꼬리물기 대화)
    if (text.includes('밥') || text.includes('먹') || text.includes('피자') || text.includes('pizza') || text.includes('사과') || text.includes('apple') || text.includes('chicken') || text.includes('치킨') || text.includes('hungry')) {
      const isPizza = text.includes('피자') || text.includes('pizza');
      if (isPizza) {
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
      return {
        replyEn: "Yummy food gives you super hero strength, Siwoo! 💪 Did you eat until your tummy was full and happy?",
        replyKr: "맛있는 음식을 먹으면 슈퍼 히어로 힘이 불끈 솟지, 시우야! 💪 배가 뽈록해질 때까지 든든하게 맛있게 먹었어?",
        suggestions: [
          { emoji: "😋", en: "Yes, my tummy is full!", phonetic: "[예스, 마이 터미 이즈 풀]", kr: "네, 배가 아주 든든해요!" },
          { emoji: "🍎", en: "I ate sweet fresh fruit!", phonetic: "[아이 에이트 스위트 프레시 프루트]", kr: "달콤한 과일도 먹었어요!" },
          { emoji: "❓", en: "Are you hungry now, Bricky?", phonetic: "[아 유 헝그리 나우, 브릭키]", kr: "브릭키는 지금 배고파요?" }
        ]
      };
    }

    // 🌟 3. 🧱 레고 & 장난감 티키타카
    if (text.includes('레고') || text.includes('블록') || text.includes('장난감') || text.includes('lego') || text.includes('brick') || text.includes('robot') || text.includes('car')) {
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

    // 🌟 4. 🦖 공룡 & 동물 티키타카
    if (text.includes('공룡') || text.includes('티라노') || text.includes('dinosaur') || text.includes('사자') || text.includes('동물') || text.includes('lion')) {
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

    // 🌟 5. 긍정 단답 ("응", "yes", "좋아", "ok")에 대한 리액션 & 새로운 주제 제안
    if (text === '응' || text === '어' || text === '네' || text === 'yes' || text === 'yeah' || text === 'ok' || text === 'okay' || text === '좋아') {
      return {
        replyEn: "Yay! High five, Captain Siwoo! 👏 What secret mission should we do today? Legos, animals, or outer space?",
        replyKr: "신난다! 짝! 하이파이브 하자 시우 대장! 👏 오늘 우리 어떤 비밀 미션을 해볼까? 블록 놀이? 동물 탐험? 우주 여행?",
        suggestions: [
          { emoji: "🚀", en: "Let's explore outer space!", phonetic: "[렛츠 익스플로어 아우터 스페이스]", kr: "우주 탐험 떠나요!" },
          { emoji: "🧱", en: "Let's build cool Legos!", phonetic: "[렛츠 빌드 쿨 레고스]", kr: "멋진 레고 만들어요!" },
          { emoji: "❓", en: "What is your secret mission, Bricky?", phonetic: "[왓 이즈 유어 시크릿 미션, 브릭키]", kr: "브릭키의 비밀 미션은 뭐야?" }
        ]
      };
    }

    // 🌟 6. 시우의 자유 발화에 적극적으로 귀 기울이고 맞장구치며 대화 이어가기
    const norm = this.normalizeKidSpeech(rawText);
    return {
      replyEn: `Aha! You said: "${norm.en}"! That sounds so cool, Siwoo! Tell Bricky more about it! ✨`,
      replyKr: `아하! "${norm.kr}" 라고 말해줬구나! 진짜 멋진 이야기다 시우야! 브릭키한테 조금만 더 들려줄래? ✨`,
      suggestions: [
        { emoji: "😄", en: "It is super fun!", phonetic: "[잇 이즈 슈퍼 펀]", kr: "엄청 재미있어요!" },
        { emoji: "⭐", en: "I love it so much!", phonetic: "[아이 러브 잇 쏘 머치]", kr: "정말 정말 좋아해요!" },
        { emoji: "❓", en: "Do you want to know more, Bricky?", phonetic: "[두 유 원트 투 노 모어, 브릭키]", kr: "브릭키 더 알고 싶어?" }
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

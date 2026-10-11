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

    // 🌟 동적 학습자 이름 (기본값: 시우, 상황에 따라 다른 사람이 참여 시 실시간 자동 전환)
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('bricktalk_student_name') : null;
      this.studentName = saved ? JSON.parse(saved) : { en: 'Siwoo', kr: '시우' };
    } catch (e) {
      this.studentName = { en: 'Siwoo', kr: '시우' };
    }
  }

  /**
   * 🌟 학습자 이름 설정 및 로컬스토리지 저장
   */
  setStudentName(nameObj) {
    if (!nameObj || !nameObj.en) return;
    this.studentName = {
      en: nameObj.en.trim(),
      kr: (nameObj.kr || nameObj.en).trim()
    };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bricktalk_student_name', JSON.stringify(this.studentName));
      }
    } catch (e) {}
  }

  /**
   * 🌟 발화 내용 중 새로운 이름 소개 인텐트 감지 (영어 및 한국어 정밀 패턴)
   */
  detectNameIntent(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;
    const clean = rawText.replace(/["'“”‘’.,!?]/g, '').trim();

    // 1. 영어 명시적 패턴: "My name is Tom", "Call me Alex", "This is Sarah"
    const myNameMatch = clean.match(/\bmy name is\s+([A-Za-z가-힣]+)/i);
    if (myNameMatch) {
      const name = myNameMatch[1];
      const en = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      return { en, kr: name };
    }
    const callMeMatch = clean.match(/\bcall me\s+([A-Za-z가-힣]+)/i);
    if (callMeMatch) {
      const name = callMeMatch[1];
      const en = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      return { en, kr: name };
    }

    // 2. "I am [Name]" / "I'm [Name]" 패턴 (단, 감정/상태 형용사 제외)
    const iAmMatch = clean.match(/\b(?:i am|i'm|im)\s+([A-Za-z]+)\b/i);
    if (iAmMatch) {
      const candidate = iAmMatch[1].toLowerCase();
      const nonNames = [
        'happy', 'sleepy', 'hungry', 'tired', 'fine', 'good', 'sad', 'ready', 'here',
        'a', 'the', 'boy', 'girl', 'big', 'small', 'seven', 'six', 'eight', 'cool',
        'super', 'eating', 'doing', 'playing', 'outside', 'inside', 'sorry', 'okay', 'great'
      ];
      if (!nonNames.includes(candidate) && candidate.length >= 2) {
        const en = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        return { en, kr: en };
      }
    }

    // 3. 한국어 패턴: "내 이름은 민우야", "나는 서연이야", "지아라고 불러줘"
    const krNameMatch = clean.match(/(?:내\s*이름은|난|나는)\s+([가-힣]{2,4})(?:이야|야|이에요|입니다|다)?/);
    if (krNameMatch) {
      const kr = krNameMatch[1];
      const nonKr = ['행복해', '배고파', '졸려', '심심해', '피곤해', '레고', '친구', '멋진', '남자', '여자'];
      if (!nonKr.includes(kr)) {
        return { en: kr, kr };
      }
    }
    const krCallMatch = clean.match(/([가-힣]{2,4})(?:이라고|라고)\s*(?:불러줘|해)/);
    if (krCallMatch) {
      const kr = krCallMatch[1];
      return { en: kr, kr };
    }

    return null;
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
    const stripped = t.replace(/[\s\.\?!~,\-_]/g, '');
    if (stripped.length === 0) return true;
    const hesitations = /^(uh|um|er|ah|eh|oh|어|음|그|아|uhum|umuh)+$/i;
    if (hesitations.test(stripped)) return true;
    if (stripped.length < 2) return true;
    return false;
  }

  /**
   * 🌟 사람 친구 같은 자연스러운 상호 꼬리물기 대화 엔진 (Topic-Chaining Reciprocal Friendship Chat)
   * 1. Topic-Chaining (동일 화제 유지): 시우가 말한 바로 그 주제(음식, 놀이터, 레고 등)에서 절대 딴소리하지 않음
   * 2. Empathize & Share (공감 및 브릭키의 생각 공유): 브릭키의 취향과 감정을 먼저 다정하게 전함
   * 3. Reciprocal Ping (자연스러운 되묻기): 억지 2지선다 퀴즈가 아닌, 시우의 취향이나 경험을 따뜻하게 되물음
   * 4. Sentence Frames (자연스러운 선택 카드): 시우가 진짜 자기 생각을 말할 수 있는 생생한 일상 표현 제공
   */
  generateContextualResponse(rawText) {
    const text = (rawText || '').trim().toLowerCase();
    const studentEn = (this.studentName && this.studentName.en) ? this.studentName.en : 'Siwoo';
    const studentKr = (this.studentName && this.studentName.kr) ? this.studentName.kr : '시우';

    // 🌟 0-1. 새로운 이름 소개 인텐트 감지 시 즉각 환영 (동적 이름 변경)
    const detected = this.detectNameIntent(rawText);
    if (detected) {
      this.setStudentName(detected);
      return {
        replyEn: `Nice to meet you, ${detected.en}! Bricky is so happy! How are you today? ☀️`,
        replyKr: `만나서 정말 반가워, ${detected.kr}! 브릭키는 너무 기뻐! 오늘 기분이 어때?`,
        detectedName: detected,
        suggestions: [
          { emoji: "😄", en: "I am happy!", phonetic: "[아이 엠 해피]", kr: "기분이 아주 좋아요!" },
          { emoji: "🧱", en: "I love Lego, Bricky!", phonetic: "[아이 러브 레고, 브릭키]", kr: "나 레고 정말 좋아해!" },
          { emoji: "❓", en: "How are you, Bricky?", phonetic: "[하우 아 유, 브릭키]", kr: "브릭키는 기분이 어때?" }
        ]
      };
    }

    // 🌟 0-2. NotebookLM Recast 적용: "You baby"와 같은 단어형 발화 수용 및 확장
    if (text.includes('you baby') || text.includes('baby')) {
      return {
        replyEn: `Haha, are you asking if I'm a baby? I'm a cool Lego brick! Are you a big boy, ${studentEn}? 🧱`,
        replyKr: `하하, 내가 아기냐고 물어본 거야? 난 멋진 레고 블록이야! ${studentKr}는 멋진 형님이지?`,
        suggestions: [
          { emoji: "👦", en: "I am a big boy!", phonetic: "[아이 엠 어 빅 보이]", kr: "나 멋진 형님이야!" },
          { emoji: "🧱", en: "You are a cool Lego brick!", phonetic: "[유아 어 쿨 레고 브릭]", kr: "너 정말 멋진 레고 블록이야!" },
          { emoji: "🎂", en: "How old are you, Bricky?", phonetic: "[하우 올드 아 유, 브릭키]", kr: "브릭키 너는 몇 살이야?" }
        ]
      };
    }

    // 🌟 0-3. 잡음 / 망설임 / 못 들었을 때 다정한 재요청
    if (this.isUnclearSpeech(rawText)) {
      return {
        replyEn: `Pardon, ${studentEn}? Bricky is listening! Can you say that again? 👂`,
        replyKr: `${studentKr}야, 브릭키가 귀를 쫑긋 세웠어! 한 번만 다시 말해줄래? 👂`,
        suggestions: [
          { emoji: "👂", en: "Listen to me, Bricky!", phonetic: "[리슨 투 미, 브릭키]", kr: "브릭키 잘 들어봐요!" },
          { emoji: "🗣️", en: "Let me say it again!", phonetic: "[렛 미 세이 잇 어게인]", kr: "다시 한 번 말해볼게요!" },
          { emoji: "✨", en: "Hello Bricky, can you hear me?", phonetic: "[헬로 브릭키, 캔 유 히어 미]", kr: "안녕 브릭키야, 내 말 들려?" }
        ]
      };
    }

    this.conversationHistory.push({ role: 'user', text: rawText, time: Date.now() });

    const textWithoutName = text.replace(/bricky/g, '').replace(/브릭키/g, '').trim();

    // 🌟 1. 시우가 브릭키에게 역질문 또는 질문을 던졌을 때 (상호 핑퐁)
    const isAskingBricky = text.includes('너는') || text.includes('브릭키는') || text.includes('how about you') || text.includes('what about you') || text.includes('who are you') || text.includes('how old') || text.includes('what do you like') || text.includes('do you like') || text.includes('좋아해?') || text.includes('몇 살') || text.includes('help me') || text.includes('know more') || text.includes('can you') || text.includes('what game') || text.includes('what is your') || text.includes('did you eat');

    if (isAskingBricky) {
      // 1-1. 조립 도와줘? ("Can you help me build it, Bricky?")
      if (text.includes('help me') || text.includes('도와')) {
        return {
          replyEn: "Of course! We are the best building team! 🧱 Where should we start?",
          replyKr: "당연하지! 우린 최고의 레고 팀이잖아! 🧱 어디부터 시작해볼까?",
          suggestions: [
            { emoji: "🔝", en: "Let's build from the top!", phonetic: "[렛츠 빌드 프럼 더 탑]", kr: "위쪽부터 만들어요!" },
            { emoji: "🚗", en: "Let's put the wheels first!", phonetic: "[렛츠 풋 더 휠즈 퍼스트]", kr: "바퀴부터 달아봐요!" },
            { emoji: "✨", en: "Pass me a shiny brick, Bricky!", phonetic: "[패스 미 어 샤이니 브릭, 브릭키]", kr: "브릭키 반짝이는 블록 하나 줘!" }
          ]
        };
      }

      // 1-2. 더 알고 싶어? ("Do you want to know more, Bricky?")
      if (text.includes('know more') || text.includes('더 알고')) {
        return {
          replyEn: "Yes, tell me everything! I am all ears! 👂 What happened next?",
          replyKr: "응, 다 말해줘! 귀 쫑긋 세우고 들을게! 👂 그 다음에 무슨 일 있었어?",
          suggestions: [
            { emoji: "😄", en: "It was the best day ever!", phonetic: "[잇 워즈 더 베스트 데이 에버]", kr: "오늘이 최고의 날이었어요!" },
            { emoji: "🎈", en: "I saw a pretty balloon!", phonetic: "[아이 쏘 어 프리티 벌룬]", kr: "예쁜 풍선을 봤어요!" },
            { emoji: "❓", en: "What did you do today, Bricky?", phonetic: "[왓 디드 유 두 투데이, 브릭키]", kr: "브릭키는 오늘 뭐 하고 놀았어?" }
          ]
        };
      }

      // 1-3. 나이 질문 ("How old are you, Bricky?")
      if (text.includes('몇 살') || text.includes('how old') || text.includes('age')) {
        return {
          replyEn: "I am 7 years old, just like you! We are the same age! 🤝 When is your birthday?",
          replyKr: "나도 시우처럼 일곱 살이야! 우리 동갑내기 친구지! 🤝 시우 생일은 언제야?",
          suggestions: [
            { emoji: "🎂", en: "My birthday is coming soon!", phonetic: "[마이 버스데이 이즈 커밍 순]", kr: "곧 제 생일이에요!" },
            { emoji: "🎉", en: "I had a great birthday party!", phonetic: "[아이 해드 어 그레이트 버스데이 파티]", kr: "신나는 생일 파티를 했어요!" },
            { emoji: "❓", en: "When is your birthday, Bricky?", phonetic: "[웬 이즈 유어 버스데이, 브릭키]", kr: "브릭키 생일은 언제야?" }
          ]
        };
      }

      // 1-4. 브릭키가 좋아하는 음식 ("What is your favorite food, Bricky?")
      // 🌟 [핵심 개선]: 음식 물어봤으면 음식으로 대답하고, 시우도 좋아하는지 같은 주제로 꼬리물기!
      if (text.includes('food') || text.includes('음식') || text.includes('pizza') || text.includes('피자') || text.includes('eat') || text.includes('먹')) {
        return {
          replyEn: "I love cheese pizza with extra cheese! 🍕 It is so crunchy! Do you like pizza too, Siwoo?",
          replyKr: "난 치즈가 듬뿍 들어간 피자를 제일 좋아해! 🍕 엄청 바삭하거든! 시우 너도 피자 좋아해?",
          suggestions: [
            { emoji: "🍕", en: "Yes, I love pizza too!", phonetic: "[예스, 아이 러브 피자 투]", kr: "응, 나도 피자 엄청 좋아해!" },
            { emoji: "🍗", en: "I like crispy chicken more!", phonetic: "[아이 라이크 크리스피 치킨 모어]", kr: "난 바삭한 치킨이 더 좋아!" },
            { emoji: "❓", en: "What topping do you like, Bricky?", phonetic: "[왓 토핑 두 유 라이크, 브릭키]", kr: "브릭키는 무슨 토핑 좋아해?" }
          ]
        };
      }

      // 1-5. 정체 질문 ("Who are you?")
      if (text.includes('who are you') || text.includes('누구')) {
        return {
          replyEn: "I am Bricky! Your 7-year-old Lego buddy! 🧱 What do you want to play today, Siwoo?",
          replyKr: "난 시우의 일곱 살 레고 친구 브릭키야! 🧱 시우는 오늘 나랑 뭐 하고 놀고 싶어?",
          suggestions: [
            { emoji: "🤝", en: "Let's be best friends!", phonetic: "[렛츠 비 베스트 프렌즈]", kr: "우리 제일 친한 단짝 하자!" },
            { emoji: "🧱", en: "Let's build something fun!", phonetic: "[렛츠 빌드 썸띵 펀]", kr: "재미있는 거 만들고 놀자!" },
            { emoji: "❓", en: "What do you like to do, Bricky?", phonetic: "[왓 두 유 라이크 투 두, 브릭키]", kr: "브릭키는 뭐 하고 노는 게 좋아?" }
          ]
        };
      }

      // 1-6. 일반적인 "너는?" 질문
      return {
        replyEn: "I love playing with you, Siwoo! 🎶 Tell me more about your day!",
        replyKr: "난 시우랑 이야기하고 노는 게 제일 좋아! 🎶 시우 오늘 있었던 일 더 들려줘!",
        suggestions: [
          { emoji: "🛝", en: "I had so much fun outside!", phonetic: "[아이 해드 쏘 머치 펀 아웃사이드]", kr: "밖에서 진짜 신나게 놀았어요!" },
          { emoji: "🧱", en: "I made something cool!", phonetic: "[아이 메이드 썸띵 쿨]", kr: "멋진 걸 만들었어요!" },
          { emoji: "❓", en: "What is your secret power, Bricky?", phonetic: "[왓 이즈 유어 시크릿 파워, 브릭키]", kr: "브릭키의 비밀 초능력은 뭐야?" }
        ]
      };
    }

    // 🌟 2. 🍕 피자 & 음식 티키타카 (Acknowledge - Expand - Ping)
    // 피자 조각 / 치즈 / 양 대답 ("I ate two big slices!")
    if (text.includes('slice') || text.includes('조각') || text.includes('cheese') || text.includes('치즈') || text.includes('corn') || text.includes('ham') || text.includes('bacon')) {
      return {
        replyEn: "Two whole slices? Wow, you are a big eater! 🍕 Were you super full?",
        replyKr: "두 조각이나 다 먹었어? 우와 시우 대단하다! 🍕 배가 뽈록 불렀어?",
        suggestions: [
          { emoji: "😋", en: "Yes, I am super full!", phonetic: "[예스, 아이 엠 슈퍼 풀]", kr: "응, 배가 진짜 불러요!" },
          { emoji: "🧃", en: "And I drank sweet orange juice!", phonetic: "[앤드 아이 드랭크 스위트 오렌지 주스]", kr: "그리고 달콤한 주스도 마셨어요!" },
          { emoji: "❓", en: "What is your favorite food, Bricky?", phonetic: "[왓 이즈 유어 페이보릿 푸드, 브릭키]", kr: "브릭키가 제일 좋아하는 음식은 뭐야?" }
        ]
      };
    }

    // 피자/점심 먹었다고 했을 때 ("I ate yummy pizza for lunch!")
    if (text.includes('pizza') || text.includes('피자') || text.includes('lunch') || text.includes('점심') || text.includes('ate') || text.includes('먹었')) {
      return {
        replyEn: "Yum! Pizza is the best lunch! 🍕 Did you eat lots of stretchy cheese?",
        replyKr: "냠냠! 점심으로 피자가 최고지! 🍕 쭉 늘어나는 치즈 많이 먹었어?",
        suggestions: [
          { emoji: "🧀", en: "Yes, lots of warm cheese!", phonetic: "[예스, 랏츠 오브 웜 치즈]", kr: "응, 따뜻한 치즈가 가득했어!" },
          { emoji: "🍕", en: "I ate two big slices!", phonetic: "[아이 에이트 투 빅 슬라이시즈]", kr: "두 조각이나 크게 먹었어!" },
          { emoji: "❓", en: "What is your favorite food, Bricky?", phonetic: "[왓 이즈 유어 페이보릿 푸드, 브릭키]", kr: "브릭키가 제일 좋아하는 음식은 뭐야?" }
        ]
      };
    }

    // 🌟 3. 🛝 놀이터 & 미끄럼틀
    // 미끄럼틀 탔을 때 ("I rode the big slide!")
    if (text.includes('slide') || text.includes('미끄럼틀') || text.includes('yellow')) {
      return {
        replyEn: "Whoosh! The slide goes so fast! 🛝 Was it super exciting?",
        replyKr: "슝~! 미끄럼틀은 엄청 빠르지! 🛝 진짜 신났어?",
        suggestions: [
          { emoji: "⚡", en: "It was super fast!", phonetic: "[잇 워즈 슈퍼 패스트]", kr: "엄청나게 빨랐어요!" },
          { emoji: "🦸", en: "I was super brave!", phonetic: "[아이 워즈 슈퍼 브레이브]", kr: "하나도 안 무섭고 씩씩했어요!" },
          { emoji: "❓", en: "Do you want to know more, Bricky?", phonetic: "[두 유 원트 투 노 모어, 브릭키]", kr: "브릭키 더 알고 싶어?" }
        ]
      };
    }

    // 놀이터 갔을 때 ("I played at the playground!")
    if (text.includes('playground') || text.includes('놀이터') || text.includes('outside') || text.includes('park')) {
      return {
        replyEn: "Playing outside is so fun! ☀️ What was the most fun thing you did there?",
        replyKr: "밖에서 노는 건 정말 신나지! ☀️ 거기서 뭐가 제일 재미있었어?",
        suggestions: [
          { emoji: "🛝", en: "I rode the big slide!", phonetic: "[아이 로드 더 빅 슬라이드]", kr: "커다란 미끄럼틀 탔어요!" },
          { emoji: "🪁", en: "I flew on the high swing!", phonetic: "[아이 플루 온 더 하이 스윙]", kr: "그네를 높이높이 탔어요!" },
          { emoji: "❓", en: "Do you like playgrounds, Bricky?", phonetic: "[두 유 라이크 플레이그라운즈, 브릭키]", kr: "브릭키도 놀이터 좋아해?" }
        ]
      };
    }

    // 🌟 4. 🚀 우주 로켓 & 레고 만들기
    // 로켓 조립 ("Let's build a giant space rocket!")
    if (text.includes('rocket') || text.includes('space') || text.includes('로켓') || text.includes('우주')) {
      return {
        replyEn: "A giant space rocket to the stars? Awesome! 🚀 Can we fly together?",
        replyKr: "별나라로 가는 커다란 우주 로켓? 대박 멋지다! 🚀 우리 같이 타고 날아갈까?",
        suggestions: [
          { emoji: "🌌", en: "3, 2, 1, Blast off!", phonetic: "[쓰리, 투, 원, 블래스트 오프]", kr: "3, 2, 1, 발사하자!" },
          { emoji: "🔴", en: "Put the bright red bricks on top!", phonetic: "[풋 더 브라이트 레드 브릭스 온 탑]", kr: "빨간 블록을 꼭대기에 꽂아요!" },
          { emoji: "❓", en: "Can you help me build it, Bricky?", phonetic: "[캔 유 헬프 미 빌드 잇, 브릭키]", kr: "브릭키 나 만드는 거 도와줄래?" }
        ]
      };
    }

    // 레고 만들기 ("I want to build Legos!")
    if (textWithoutName.includes('lego') || textWithoutName.includes('레고') || textWithoutName.includes('블록') || textWithoutName.includes('build')) {
      return {
        replyEn: "Click-clack! Lego time is the best! 🧱 What do you want to build today?",
        replyKr: "딸깍딸깍! 레고 놀이가 세상에서 제일 좋아! 🧱 오늘은 우리 뭐 만들어볼까?",
        suggestions: [
          { emoji: "🚀", en: "Let's build a giant space rocket!", phonetic: "[렛츠 빌드 어 자이언트 스페이스 로켓]", kr: "커다란 우주 로켓을 만들어요!" },
          { emoji: "🏎️", en: "Let's build a super race car!", phonetic: "[렛츠 빌드 어 슈퍼 레이스 카]", kr: "슈퍼 레이싱카를 만들어요!" },
          { emoji: "❓", en: "What do you want to build, Bricky?", phonetic: "[왓 두 유 원트 투 빌드, 브릭키]", kr: "브릭키는 뭐 만들고 싶어?" }
        ]
      };
    }

    // 🌟 5. 긍정 단답 ("Yes, I like that!", "Yes!", "좋아!")
    if (text === 'yes' || text === 'yeah' || text === '좋아' || text.includes('i like that') || text.includes('yes, i like')) {
      return {
        replyEn: "Yay! High five, Siwoo! We think just alike! 👏 What should we do next?",
        replyKr: "신난다! 하이파이브 시우야! 우리 통했네! 👏 이제 우리 다음에 뭐 할까?",
        suggestions: [
          { emoji: "🚀", en: "Let's fly to outer space!", phonetic: "[렛츠 플라이 투 아우터 스페이스]", kr: "우주로 날아가자!" },
          { emoji: "🏰", en: "Let's build a magic castle!", phonetic: "[렛츠 빌드 어 매직 캐슬]", kr: "마법 성을 만들어요!" },
          { emoji: "❓", en: "Who are you, Bricky?", phonetic: "[후 아 유, 브릭키]", kr: "브릭키 너는 누구야?" }
        ]
      };
    }

    // 🌟 6. 시우의 자유 발화에 자연스럽게 호응하고 문장 모델링
    const norm = this.normalizeKidSpeech(rawText);
    return {
      replyEn: `That sounds so cool! "${norm.en}"! ⭐ Tell me more, Siwoo!`,
      replyKr: `진짜 멋지다! "${norm.kr}" 라니! ⭐ 시우야, 조금만 더 들려줘!`,
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
  /**
   * 시우의 음성을 영어와 한국어 번역 쌍으로 스마트 정규화
   * 🌟 [핵심 개선]: 사용자가 온전한 문장이나 질문을 말했을 때는 사용자의 원문을 100% 그대로 보존!
   * (절대로 'hi' 한 단어 포함되었다고 'Hello Bricky!'로 덮어쓰지 않음)
   */
  normalizeKidSpeech(rawText) {
    if (this.isUnclearSpeech(rawText)) {
      return { en: (rawText || '...').trim(), kr: '잘 못 들었어요. 다시 말해줄래요? 👂', isUnclear: true };
    }
    const cleanRaw = (rawText || '').trim();
    const t = cleanRaw.toLowerCase();
    const words = t.split(/\s+/).filter(Boolean);

    // 🌟 1. 이미 2단어 이상의 영문 문장이거나 질문인 경우: 사용자의 실제 발화 100% 원형 보존!
    const isMultiWordOrQuestion = words.length >= 2 || t.includes('?') || t.startsWith('what') || t.startsWith('how') || t.startsWith('who') || t.startsWith('why') || t.startsWith('where') || t.startsWith('can') || t.startsWith('do');
    const isEnglishSpoken = /^[a-zA-Z0-9\s.,!?'"~-]+$/.test(cleanRaw);

    if (isMultiWordOrQuestion && isEnglishSpoken) {
      return { en: cleanRaw, kr: this.quickTranslateToKr(cleanRaw) };
    }

    // 🌟 2. 단독 1단어 파편 발화일 때만 7세 아동을 위한 완전 문장 모델링 지원
    // 인사 단독 발화
    if (t === 'hello' || t === 'hi' || t === '안녕' || t === '헬로' || t === '하이' || t === '안녕 브릭키') {
      return { en: "Hello Bricky!", kr: "안녕 브릭키야!" };
    }
    // 피자 / 음식 단독 발화
    if (t === 'pizza' || t === '피자') {
      return { en: "I love pizza!", kr: "피자를 정말 좋아해요!" };
    }
    if (t === 'apple' || t === '사과') {
      return { en: "Here is a sweet apple!", kr: "달콤한 사과를 줄게요!" };
    }
    if (t === 'hungry' || t === '배고파') {
      return { en: "I am hungry!", kr: "배가 고파요!" };
    }
    // 레고 / 장난감 단독 발화
    if (t === 'lego' || t === '레고' || t === '블록' || t === 'brick') {
      return { en: "I love Lego bricks!", kr: "레고 블록 만드는 게 제일 좋아요!" };
    }
    if (t === 'car' || t === '자동차') {
      return { en: "Let's build a race car!", kr: "멋진 레이싱카를 만들어요!" };
    }
    // 공룡 / 동물 단독 발화
    if (t === 'dinosaur' || t === '공룡') {
      return { en: "I like big dinosaurs!", kr: "커다란 공룡이 좋아요!" };
    }
    if (t === 'lion' || t === '사자') {
      return { en: "Look at the roaring lion!", kr: "어흥 사자가 멋져요!" };
    }
    if (t === 'dog' || t === 'puppy' || t === '강아지') {
      return { en: "I love cute puppies!", kr: "귀여운 강아지가 좋아요!" };
    }
    // 긍정 / 확인 단독 발화
    if (t === 'yes' || t === 'yeah' || t === '응' || t === '네' || t === '좋아') {
      return { en: "Yes, I like that!", kr: "네, 아주 좋아요!" };
    }
    if (t === 'no' || t === '아니' || t === '싫어') {
      return { en: "No, maybe later!", kr: "아니요, 다음에요!" };
    }
    // 고마워 / 하이파이브
    if (t === 'thank you' || t === 'thanks' || t === '고마워') {
      return { en: "Thank you, Bricky!", kr: "브릭키야 고마워!" };
    }
    if (t === 'high five' || t === '하이파이브') {
      return { en: "High five, Bricky!", kr: "브릭키 하이파이브!" };
    }
    // 놀이터
    if (t === 'playground' || t === '놀이터') {
      return { en: "I played at the playground!", kr: "놀이터에서 신나게 놀았어요!" };
    }
    if (t === 'slide' || t === '미끄럼틀') {
      return { en: "I rode the big slide!", kr: "커다란 미끄럼틀을 탔어요!" };
    }
    // 색깔
    if (t === 'red' || t === '빨간색') return { en: "I like red bricks!", kr: "빨간색 블록이 좋아요!" };
    if (t === 'blue' || t === '파란색') return { en: "I like blue bricks!", kr: "파란색 블록이 좋아요!" };
    if (t === 'yellow' || t === '노란색') return { en: "I like yellow bricks!", kr: "노란색 블록이 좋아요!" };

    // 기본: 입력된 영문 원문 그대로 보존
    return {
      en: cleanRaw,
      kr: isEnglishSpoken ? this.quickTranslateToKr(cleanRaw) : `시우가 "${cleanRaw}" 라고 말했어요!`
    };
  }

  /**
   * 🌟 시우의 일상 영어 발화를 자연스러운 7세 한국어로 스마트 번역 매핑
   */
  quickTranslateToKr(enText) {
    const cleanEn = (enText || '').replace(/["'“”‘’]/g, '').trim();
    const t = cleanEn.toLowerCase();
    if (!t) return "";

    // 🌟 7세 아동 빈출 회화 스마트 번역
    if (t.includes('you baby') || t.includes('you are a baby') || t.includes("you're a baby")) return "너 아기야? 👶";
    if (t.includes('big boy') || t.includes('i am a big boy')) return "나 멋진 형님(빅 보이)이야! 👦";
    if (t.includes('cool lego') || t.includes('cool brick')) return "브릭키 너 정말 멋진 레고야! 🧱";
    if (t.includes('favorite food') || t.includes('favorite snack')) return "브릭키가 제일 좋아하는 음식은 뭐야? 🍕";
    if (t.includes('how old')) return "브릭키는 몇 살이야? 🎂";
    if (t.includes('who are you')) return "브릭키 너는 누구야? 🤔";
    if (t.includes('help me')) return "브릭키 나 만드는 거 도와줄래? 🛠️";
    if (t.includes('what are you doing')) return "브릭키 지금 뭐 하고 있어?";
    if (t.includes('how about you') || t.includes('what about you')) return "브릭키 너는 어때?";
    if (t.includes('do you like')) return "브릭키도 이거 좋아해?";
    if (t.includes('sweet mochi') || t.includes('like mochi')) return "나 달콤한 찹쌀떡(모찌) 좋아해! 🍡";
    if (t.includes('strawberry')) return "나 딸기 맛 제일 좋아해! 🍓";
    if (t.includes('i ate') || t.includes('breakfast') || t.includes('lunch')) return "나 맛있게 밥 먹었어! 🍽️";
    if (t.includes('happy') || t.includes('good')) return "나 오늘 기분 최고야! 😊";
    if (t.includes('pizza')) return "나 피자 좋아해! 🍕";
    if (t.includes('slide') || t.includes('swing')) return "나 놀이터에서 신나게 탔어! 🛝";
    if (t.includes('playground')) return "나 놀이터에서 놀았어! 🏃";
    if (t.includes('rocket') || t.includes('space')) return "우리 멋진 우주 로켓 만들자! 🚀";
    if (t.includes('lego') || t.includes('build')) return "우리 재미있는 레고 만들자! 🧱";
    if (t === 'yes' || t.startsWith('yes ')) return "응, 맞아! 👍";
    if (t === 'no' || t.startsWith('no ')) return "아니야! 🙅";

    return `"${cleanEn}" 라고 말했어요! ✨`;
  }

  /**
   * 🤖 Google Gemini 1.5 Flash 실시간 AI 티키타카 생성 (API Key 있을 시 연동)
   */
  async fetchGeminiTikiTaka(rawText) {
    // 🌟 로컬 우선: 이름 소개 인텐트 감지 시 즉각 이름 업데이트
    const localDetectedName = this.detectNameIntent(rawText);
    if (localDetectedName) {
      this.setStudentName(localDetectedName);
    }

    const studentEn = (this.studentName && this.studentName.en) ? this.studentName.en : 'Siwoo';
    const studentKr = (this.studentName && this.studentName.kr) ? this.studentName.kr : '시우';

    // 기본 로컬 폴백
    const localReply = () => this.generateContextualResponse(rawText);

    const recent = this.conversationHistory.slice(-8)
      .map(m => `${m.role === 'user' ? studentEn : 'Bricky'}: ${m.text}`).join('\n');

    const sys = `You are Bricky (브릭키), a warm, expressive 3D LEGO minifigure best friend & tutor in an interactive 1:1 live video English room with ${studentEn} (${studentKr}), a 7-year-old Korean beginner child (ALWAYS address the learner as "${studentEn}").

🎯 NOTEBOOKLM VERIFIED 1:1 CHILD TUTORING CORE (검증된 7세 화상 영어 교수법):
1. SHORT TURN CONSTRAINT (5개 형태소 / 1-2문장 원칙):
   - Keep your turn to 1-2 short, warm, lively sentences (maximum 8-12 words total).
   - Young learners have limited working memory. Never produce long paragraphs!

2. ACKNOWLEDGE-EXPAND-PING (수용 - 리캐스팅 확장 - 핑퐁 질문):
   - If the learner speaks incomplete fragments (e.g. "You baby", "Swing", "I mochi"), NEVER say "Wrong!" or point out grammar directly.
   - First warmly accept the child's thought with lively emotion (Acknowledge: "Haha! / Yum! / Wow!").
   - Model the natural, correct sentence structure gently (Salient Recast: "You are asking if I am a baby? I am a cool 7-year-old Lego brick!").
   - Immediately toss a simple reciprocal ping back (Ping: "Are you a big boy?").

3. STRICT TOPIC CONTINUITY (화제 일치 원칙 - 딴소리 절대 금지):
   - ALWAYS stay on the EXACT SAME topic the child is speaking about.
   - If the child talks about breakfast, stay on breakfast! If the child asks a question, answer it first then ping!

4. EFFORT-BASED PRAISE (노력 및 과정 중심 칭찬):
   - Value the child's courage and attempt ("Great try speaking, ${studentEn}!").

5. DYNAMIC NAME DETECTION (새로운 참여자 이름 감지):
   - If the child introduces a name (e.g., "My name is Tom", "I am Alex", "내 이름은 지아야"), detect it and output "detectedName": { "en": "NameEn", "kr": "이름Kr" }. Warmly welcome them by their new name!

Always return ONLY valid JSON:
{
  "replyEn": "1-2 natural lively sentences using Recasting and ending with 1 clear ping (max 12 words)",
  "replyKr": "다정하고 생생한 7세 맞춤형 한국어 번역",
  "detectedName": null,
  "suggestions": [
    { "emoji": "👍", "en": "Natural response 1", "phonetic": "[발음]", "kr": "한국어 뜻" },
    { "emoji": "✨", "en": "Alternative detail 2", "phonetic": "[발음]", "kr": "한국어 뜻" },
    { "emoji": "❓", "en": "Question back to Bricky", "phonetic": "[발음]", "kr": "한국어 뜻" }
  ]
}`;

    const userMsg = `Conversation history so far:\n${recent}\n\n${studentEn}'s current utterance: "${String(rawText).slice(0, 200)}"`;

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
          if (parsed.detectedName && parsed.detectedName.en) {
            this.setStudentName(parsed.detectedName);
          }
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
        if (parsed.detectedName && parsed.detectedName.en) {
          this.setStudentName(parsed.detectedName);
        }
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

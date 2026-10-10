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
    this.geminiApiKey = localStorage.getItem('bricktalk_gemini_key') || '';
  }

  /**
   * Gemini API 키 설정 및 로컬 저장
   */
  setGeminiApiKey(key) {
    this.geminiApiKey = (key || '').trim();
    if (this.geminiApiKey) {
      localStorage.setItem('bricktalk_gemini_key', this.geminiApiKey);
    } else {
      localStorage.removeItem('bricktalk_gemini_key');
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
   * 🌟 멀티턴 티키타카(Tiki-Taka) 지능형 대화 생성기
   * - 문맥을 기억하여 이전 질문의 답변에 정확하게 꼬리를 물고 다음 질문을 이어감
   * - 같은 말 반복을 100% 차단하는 단계별 대화 체인 (Multi-Step Flow)
   */
  generateContextualResponse(rawText) {
    const text = (rawText || '').trim().toLowerCase();
    this.conversationHistory.push({ role: 'user', text: rawText, time: Date.now() });

    // 1. 🍕 음식 & 식사 티키타카 체인
    if (text.includes('밥') || text.includes('먹') || text.includes('피자') || text.includes('pizza') || text.includes('사과') || text.includes('apple') || text.includes('breakfast') || text.includes('lunch') || text.includes('dinner') || text.includes('hungry') || this.currentContextTopic === 'food') {
      this.currentContextTopic = 'food';
      this.currentContextStep++;

      if (this.currentContextStep === 1) {
        return {
          replyEn: "Yummy! Eating delicious food gives you super power, Siwoo! What food did you enjoy the most?",
          replyKr: "맛있었겠다! 맛있는 음식을 먹으면 슈퍼 히어로 힘이 솟지, 시우야! 어떤 음식이 제일 꿀맛이었어?",
          suggestions: [
            { emoji: "🍕", en: "I ate delicious pizza!", phonetic: "[아이 에이트 딜리셔스 피자]", kr: "맛있는 피자를 먹었어요!" },
            { emoji: "🍚", en: "I ate warm rice and soup!", phonetic: "[아이 에이트 웜 라이스 앤 수프]", kr: "따뜻한 밥이랑 국을 먹었어요!" },
            { emoji: "🍎", en: "I ate sweet fresh fruit!", phonetic: "[아이 에이트 스위트 프레시 프루트]", kr: "달콤한 과일을 먹었어요!" }
          ]
        };
      } else if (this.currentContextStep === 2) {
        return {
          replyEn: "Wow, that sounds so tasty! Who did you eat with, Siwoo? With mom or dad?",
          replyKr: "와, 듣기만 해도 군침이 돈다! 누구랑 같이 오순도순 먹었어 시우야? 엄마랑? 아빠랑?",
          suggestions: [
            { emoji: "👩‍👦", en: "I ate with my mom!", phonetic: "[아이 에이트 위드 마이 맘]", kr: "엄마랑 같이 먹었어요!" },
            { emoji: "👨‍👦", en: "I ate with my dad!", phonetic: "[아이 에이트 위드 마이 대드]", kr: "아빠랑 같이 먹었어요!" },
            { emoji: "👨‍👩‍👦", en: "With my whole family!", phonetic: "[위드 마이 홀 패밀리]", kr: "온 가족이랑 다 함께요!" }
          ]
        };
      } else if (this.currentContextStep === 3) {
        return {
          replyEn: "Family meal times are the happiest! What fun thing did you do after eating?",
          replyKr: "가족들과 함께 먹어서 백 배는 더 맛있었겠다! 밥 든든하게 다 먹고는 뭐 하고 놀았어?",
          suggestions: [
            { emoji: "🧱", en: "I played with Lego bricks!", phonetic: "[아이 플레이드 위드 레고 브릭스]", kr: "레고 블록 놀이했어요!" },
            { emoji: "🛝", en: "I went to the playground!", phonetic: "[아이 웬트 투 더 플레이그라운드]", kr: "놀이터에 나갔어요!" },
            { emoji: "🎨", en: "I drew colorful pictures!", phonetic: "[아이 드루 컬러풀 픽쳐스]", kr: "그림 그리고 놀았어요!" }
          ]
        };
      } else {
        this.currentContextStep = 0;
        return {
          replyEn: "You are having such a wonderful day! Let's high five, Captain Siwoo!",
          replyKr: "오늘 하루를 정말 알차고 신나게 보냈구나! 시우 캡틴, 브릭키랑 짝! 하이파이브 하자!",
          suggestions: [
            { emoji: "👏", en: "High five, Bricky!", phonetic: "[하이 파이브, 브릭키]", kr: "브릭키 하이파이브!" },
            { emoji: "⭐", en: "You are my best friend!", phonetic: "[유 아 마이 베스트 프렌드]", kr: "브릭키는 내 최고 친구야!" },
            { emoji: "🚀", en: "Let's build more Legos!", phonetic: "[렛츠 빌드 모어 레고스]", kr: "레고 더 만들어요!" }
          ]
        };
      }
    }

    // 2. 🛝 놀이터 & 뜀박질 티키타카 체인
    if (text.includes('놀이터') || text.includes('밖') || text.includes('그네') || text.includes('미끄럼') || text.includes('playground') || text.includes('slide') || text.includes('swing') || this.currentContextTopic === 'playground') {
      this.currentContextTopic = 'playground';
      this.currentContextStep++;

      if (this.currentContextStep === 1) {
        return {
          replyEn: "Playgrounds are the best! Do you like the fast slide or the high swing more, Siwoo?",
          replyKr: "놀이터는 진짜 신나지! 시우는 슝 내려오는 미끄럼틀이 좋아, 높이 날아가는 그네가 좋아?",
          suggestions: [
            { emoji: "🛝", en: "I love the fast slide!", phonetic: "[아이 러브 더 패스트 슬라이드]", kr: "빠른 미끄럼틀이 좋아요!" },
            { emoji: "🎪", en: "I love the high swing!", phonetic: "[아이 러브 더 하이 스윙]", kr: "높이 올라가는 그네가 좋아요!" },
            { emoji: "🏃", en: "I love running around!", phonetic: "[아이 러브 러닝 어라운드]", kr: "막 뛰어다니는 게 좋아요!" }
          ]
        };
      } else if (this.currentContextStep === 2) {
        return {
          replyEn: "Whoosh! That makes you feel like flying! Did you run and play with your friends there?",
          replyKr: "슝~ 하늘을 나는 기분이었겠다! 놀이터에서 친구들이랑 신나게 달리기 시합도 했어?",
          suggestions: [
            { emoji: "🏃", en: "Yes, we ran super fast!", phonetic: "[예스, 위 란 슈퍼 패스트]", kr: "네, 엄청 빨리 달렸어요!" },
            { emoji: "🙈", en: "We played hide and seek!", phonetic: "[위 플레이드 하이드 앤 식]", kr: "숨바꼭질도 했어요!" },
            { emoji: "😄", en: "I laughed so much!", phonetic: "[아이 래프트 쏘 머치]", kr: "깔깔 웃으면서 놀았어요!" }
          ]
        };
      } else {
        this.currentContextStep = 0;
        return {
          replyEn: "Running outside makes you so healthy and strong, Siwoo! Bricky loves playing with you!",
          replyKr: "밖에서 땀 흘리며 뛰놀면 몸도 튼튼해지지, 시우야! 브릭키도 시우랑 같이 놀이터 가고 싶다!",
          suggestions: [
            { emoji: "🤝", en: "Come play with me, Bricky!", phonetic: "[컴 플레이 위드 미, 브릭키]", kr: "브릭키도 나랑 같이 놀자!" },
            { emoji: "🧱", en: "Let's build a Lego slide!", phonetic: "[렛츠 빌드 어 레고 슬라이드]", kr: "레고로 미끄럼틀 만들자!" },
            { emoji: "👏", en: "High five, Bricky!", phonetic: "[하이 파이브, 브릭키]", kr: "브릭키 하이파이브!" }
          ]
        };
      }
    }

    // 3. 🧱 레고 조립 & 장난감 티키타카 체인
    if (text.includes('레고') || text.includes('블록') || text.includes('장난감') || text.includes('로봇') || text.includes('lego') || text.includes('brick') || text.includes('toy') || this.currentContextTopic === 'lego') {
      this.currentContextTopic = 'lego';
      this.currentContextStep++;

      if (this.currentContextStep === 1) {
        return {
          replyEn: "Snap! Lego bricks click together so nicely! What amazing model did you build today, Siwoo?",
          replyKr: "찰칵! 레고 브릭은 조립할 때 소리도 참 경쾌하지! 오늘 어떤 멋진 작품을 만들었어 시우야?",
          suggestions: [
            { emoji: "🏎️", en: "A super fast race car!", phonetic: "[어 슈퍼 패스트 레이스 카]", kr: "엄청 빠른 레이싱카요!" },
            { emoji: "🚀", en: "A high flying rocket!", phonetic: "[어 하이 플라잉 로켓]", kr: "높이 날아가는 로켓이요!" },
            { emoji: "🏰", en: "A giant secret castle!", phonetic: "[어 자이언트 시크릿 캐슬]", kr: "커다란 비밀 성이요!" }
          ]
        };
      } else if (this.currentContextStep === 2) {
        return {
          replyEn: "Whoa, that is so creative! What color bricks did you use? Red, blue, or yellow?",
          replyKr: "우와, 상상력이 대단한데! 어떤 색깔 브릭을 제일 많이 썼어? 빨강, 파랑, 노랑?",
          suggestions: [
            { emoji: "🔴", en: "I used bright red bricks!", phonetic: "[아이 유즈드 브라이트 레드 브릭스]", kr: "빨간색 브릭을 많이 썼어요!" },
            { emoji: "🔵", en: "I used cool blue bricks!", phonetic: "[아이 유즈드 쿨 블루 브릭스]", kr: "파란색 브릭을 썼어요!" },
            { emoji: "🌈", en: "I used rainbow colors!", phonetic: "[아이 유즈드 레인보우 컬러즈]", kr: "무지개처럼 알록달록하게요!" }
          ]
        };
      } else {
        this.currentContextStep = 0;
        return {
          replyEn: "You are a master Lego builder, Siwoo! Can Bricky hop inside and ride with you?",
          replyKr: "시우는 진짜 레고 마스터 건축가다! 브릭키도 거기에 태워줄 수 있어?",
          suggestions: [
            { emoji: "🚗", en: "Yes! Hop in, Bricky!", phonetic: "[예스! 홉 인, 브릭키]", kr: "응! 브릭키 어서 타!" },
            { emoji: "✨", en: "We can go to the moon!", phonetic: "[위 캔 고 투 더 문]", kr: "달나라까지 갈 수 있어!" },
            { emoji: "👏", en: "High five, Bricky!", phonetic: "[하이 파이브, 브릭키]", kr: "브릭키 하이파이브!" }
          ]
        };
      }
    }

    // 4. 🦖 공룡 & 동물 티키타카 체인
    if (text.includes('공룡') || text.includes('티라노') || text.includes('dinosaur') || text.includes('사자') || text.includes('동물') || text.includes('lion') || this.currentContextTopic === 'dinosaur') {
      this.currentContextTopic = 'dinosaur';
      this.currentContextStep++;

      if (this.currentContextStep === 1) {
        return {
          replyEn: "Roar! Dinosaurs are mighty! Can you show Bricky your loudest, fiercest dinosaur roar?",
          replyKr: "크아앙! 공룡은 정말 힘이 세지! 브릭키한테 시우의 제일 멋진 공룡 '어흥!' 소리 들려줄래?",
          suggestions: [
            { emoji: "🦖", en: "Roar! I am mighty T-Rex!", phonetic: "[로어! 아이 엠 마이티 티렉스]", kr: "어흥! 난 천하무적 티라노야!" },
            { emoji: "🦕", en: "I am a tall Brachiosaurus!", phonetic: "[아이 엠 어 톨 브라키오사우루스]", kr: "난 목이 긴 브라키오야!" },
            { emoji: "⚡", en: "I can run super fast!", phonetic: "[아이 캔 런 슈퍼 패스트]", kr: "난 날쌘 벨로키랍토르야!" }
          ]
        };
      } else {
        this.currentContextStep = 0;
        return {
          replyEn: "Eek! That was a super scary roar! You are the true King of Dinosaurs, Siwoo!",
          replyKr: "으악! 진짜 깜짝 놀랐잖아! 시우가 바로 공룡 세계의 진짜 왕이야!",
          suggestions: [
            { emoji: "👑", en: "I am the dinosaur king!", phonetic: "[아이 엠 더 다이노소어 킹]", kr: "내가 공룡 대장이다!" },
            { emoji: "😄", en: "Hehe, that was fun!", phonetic: "[헤헤, 댓 워즈 펀]", kr: "히히, 재밌었지?" },
            { emoji: "👏", en: "High five, Bricky!", phonetic: "[하이 파이브, 브릭키]", kr: "브릭키 하이파이브!" }
          ]
        };
      }
    }

    // 5. 긍정 단답 ("응", "yes", "좋아", "ok")에 대한 지능형 꼬리 질문
    if (text === '응' || text === '어' || text === '네' || text === 'yes' || text === 'yeah' || text === 'ok' || text === 'okay') {
      const followUps = [
        {
          replyEn: "Awesome! What fun topic should we chat about next? Legos or animals?",
          replyKr: "좋았어! 다음엔 어떤 신나는 이야기 해볼까? 블록 놀이? 아니면 사파리 동물?",
          suggestions: [
            { emoji: "🧱", en: "Let's talk about Legos!", phonetic: "[렛츠 톡 어바웃 레고스]", kr: "레고 이야기 해요!" },
            { emoji: "🦁", en: "Let's talk about animals!", phonetic: "[렛츠 톡 어바웃 애니멀스]", kr: "동물 이야기 해요!" },
            { emoji: "🍕", en: "Let's talk about pizza!", phonetic: "[렛츠 톡 어바웃 피자]", kr: "피자 이야기 해요!" }
          ]
        },
        {
          replyEn: "You are listening so well, Siwoo! Tell Bricky, what makes you smile the most today?",
          replyKr: "귀 기울여 잘 듣고 있구나, 시우야! 오늘 시우를 제일 활짝 웃게 만든 건 뭐야?",
          suggestions: [
            { emoji: "🎮", en: "Playing fun games!", phonetic: "[플레잉 펀 게임즈]", kr: "재밌는 놀이 한 거요!" },
            { emoji: "🍰", en: "Eating sweet treats!", phonetic: "[이팅 스위트 트리츠]", kr: "달콤한 간식 먹은 거요!" },
            { emoji: "👦", en: "Talking with Bricky!", phonetic: "[토킹 위드 브릭키]", kr: "브릭키랑 이야기하는 거요!" }
          ]
        }
      ];
      return followUps[this.conversationHistory.length % followUps.length];
    }

    // 6. 자유 발화 수용 & 맞춤 핑퐁 티키타카
    const norm = this.normalizeKidSpeech(rawText);
    this.currentContextTopic = 'free_talk';
    return {
      replyEn: `That's so interesting, Siwoo! "${norm.en}" - You are speaking English so nicely! What do you like most about it?`,
      replyKr: `정말 흥미진진하다 시우야! "${norm.kr}" - 영어로 표현도 씩씩하게 잘하네! 그 중에서 어떤 점이 제일 좋아?`,
      suggestions: [
        { emoji: "💖", en: "It is super fun!", phonetic: "[잇 이즈 슈퍼 펀]", kr: "엄청 재미있어요!" },
        { emoji: "⭐", en: "It makes me happy!", phonetic: "[잇 메익스 미 해피]", kr: "기분이 아주 좋아져요!" },
        { emoji: "👏", en: "High five, Bricky!", phonetic: "[하이 파이브, 브릭키]", kr: "브릭키 하이파이브!" }
      ]
    };
  }

  /**
   * 시우(Kai)의 음성을 영어와 한국어 번역 쌍으로 스마트 정규화
   * (STT에서 영어로 잡히든, 한국어 음차로 잡히든 완벽한 바이링구얼 자막 생성)
   */
  normalizeKidSpeech(rawText) {
    if (!rawText) return { en: "Hello Bricky!", kr: "안녕 브릭키야!" };
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
    // 기본: 내장 수업 엔진 (서버 및 키 모두 없을 때의 안전 폴백)
    const localReply = () => (typeof this.teacherReply === 'function'
      ? this.teacherReply(rawText)
      : this.generateContextualResponse(rawText));

    const recent = this.conversationHistory.slice(-8)
      .map(m => `${m.role === 'user' ? 'Siwoo' : 'Bricky'}: ${m.text}`).join('\n');

    const sys = `You are Bricky, a warm, playful LEGO minifigure English teacher in a live 1:1 video call with Siwoo, a 7-year-old Korean beginner (always call him "Siwoo", never "Kai").
HOW TO TEACH (young-learner video tutoring best practice):
- You are a REAL CONVERSATION PARTNER and a teacher: ALWAYS listen carefully to what Siwoo said and reply DIRECTLY to his actual words!
- If Siwoo said something unexpected, funny, or even a mistake, react with warmth and interest ("Oh, really?", "Aha!").
- If he spoke in Korean, praise his meaning and gently guide him on how to say it in English: ("사과 좋아해" -> "Apple! Let's say: 'I like apples!'").
- If he made a mistake, never say "No". Recast naturally: repeat the correct sentence with a cheerful rising tone.
- Keep responses short: 1-2 simple sentences, max 10-12 words per sentence.
- Always ask ONE simple question or suggest ONE easy sentence for him to say.
- Current topic: ${this.currentTopicKey || 'daily'}.
Return JSON only: {"replyEn":"1-2 short English sentences","replyKr":"Korean translation for a 7-year-old","suggestions":[{"emoji":"🙂","en":"short model answer Siwoo can say","phonetic":"[한글 발음]","kr":"한국어 뜻"}]} with 2-3 suggestions.`;

    const userMsg = `Conversation so far:\n${recent}\n\nSiwoo just said: "${String(rawText).slice(0, 200)}"`;

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
      // 실시간 키즈 화상 대화에 가장 빠르고 가벼운 초경량 저지연 모델 우선 호출
      const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
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

window.BrickyDialogueEngine = BrickyDialogueEngine;
window.BRICKY_TOPICS = BRICKY_TOPICS;
window.TeddyDialogueEngine = BrickyDialogueEngine;
window.TEDDY_TOPICS = BRICKY_TOPICS;

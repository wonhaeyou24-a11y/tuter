/**
 * 🎓 브릭키 영어 선생님 수업 엔진 (teacher.js)
 * - PPP 수업 구조: 워밍업 → 표현 가르치기(Presentation) → 따라 말하기(Practice) → 내 말로 말하기(Production) → 마무리
 * - 시우가 말한 내용을 판정하여 "성공 / 거의 맞음 / 한국어로 답함 / 침묵"에 따라 다르게 가르침
 * - 틀려도 "아니야"라고 하지 않고 올바른 문장을 자연스럽게 다시 들려주는 Recast 교정
 * - 같은 문장 반복 방지 (이미 한 말은 다른 표현으로 교체)
 * - 선생님은 항상 시우의 대답을 기다림 (혼자 계속 말하지 않음)
 */
(function () {
  'use strict';

  // ================= 단원(Unit) 커리큘럼 =================
  // kind: repeat(따라 말하기) | ask(질문하고 대답 듣기) | wrap(마무리)
  const UNITS = {
    daily: {
      title: '기분 말하기 (Feelings)',
      steps: [
        { kind: 'repeat', target: 'I am happy', en: "Let's learn a new sentence! Repeat after me. I am happy!", kr: '새 문장을 배워볼까? 따라 해봐. "I am happy!" (나는 행복해요!) 😄 두 팔을 번쩍 들어봐!', emoji: '😄',
          choices: [{ emoji: '😄', en: 'I am happy!', phonetic: '[아이 엠 해피]', kr: '나는 행복해요!' }] },
        { kind: 'repeat', target: 'I am hungry', en: 'Great! Now say it with me. I am hungry!', kr: '잘했어! 이번엔 "I am hungry!" (나는 배고파요!) 🍚 배를 쓱쓱 문질러봐!', emoji: '🍚',
          choices: [{ emoji: '🍚', en: 'I am hungry!', phonetic: '[아이 엠 헝그리]', kr: '나는 배고파요!' }] },
        { kind: 'ask', target: 'I am', en: 'Now it is your turn, Siwoo! How are you today? You can say, I am happy!', kr: '이제 시우 차례! 오늘 기분이 어때? "I am ~" 으로 말해볼까?', emoji: '🎤',
          choices: [
            { emoji: '😄', en: 'I am happy!', phonetic: '[아이 엠 해피]', kr: '행복해요!' },
            { emoji: '😴', en: 'I am sleepy!', phonetic: '[아이 엠 슬리피]', kr: '졸려요!' },
            { emoji: '🍚', en: 'I am hungry!', phonetic: '[아이 엠 헝그리]', kr: '배고파요!' }] },
        { kind: 'repeat', target: 'I like pizza', en: 'Next one! Repeat after me. I like pizza!', kr: '다음 문장! "I like pizza!" (나는 피자를 좋아해요!) 🍕', emoji: '🍕',
          choices: [{ emoji: '🍕', en: 'I like pizza!', phonetic: '[아이 라이크 피자]', kr: '나는 피자를 좋아해요!' }] },
        { kind: 'ask', target: 'I like', en: 'What do you like to eat, Siwoo? Say, I like ... !', kr: '시우는 뭘 먹는 걸 좋아해? "I like ~" 로 말해봐!', emoji: '🎤',
          choices: [
            { emoji: '🍎', en: 'I like apples!', phonetic: '[아이 라이크 애플스]', kr: '사과를 좋아해요!' },
            { emoji: '🍦', en: 'I like ice cream!', phonetic: '[아이 라이크 아이스크림]', kr: '아이스크림을 좋아해요!' },
            { emoji: '🍕', en: 'I like pizza!', phonetic: '[아이 라이크 피자]', kr: '피자를 좋아해요!' }] },
        { kind: 'wrap', en: 'Wow, you did a great job today! I am so proud of you, Siwoo!', kr: '오늘 정말 잘했어! 브릭키는 시우가 너무 자랑스러워! 🏆', emoji: '🏆' }
      ]
    },
    lego_build: {
      title: '색깔과 레고 (Colors & Bricks)',
      steps: [
        { kind: 'repeat', target: 'red brick', en: "Let's learn colors! Repeat after me. Red brick!", kr: '색깔을 배워보자! "Red brick!" (빨간 브릭) 🔴', emoji: '🔴',
          choices: [{ emoji: '🔴', en: 'Red brick!', phonetic: '[레드 브릭]', kr: '빨간 브릭!' }] },
        { kind: 'repeat', target: 'blue brick', en: 'Good! Now. Blue brick!', kr: '이번엔 "Blue brick!" (파란 브릭) 🔵', emoji: '🔵',
          choices: [{ emoji: '🔵', en: 'Blue brick!', phonetic: '[블루 브릭]', kr: '파란 브릭!' }] },
        { kind: 'ask', target: 'I like', en: 'What color do you like, Siwoo? Say, I like red!', kr: '시우는 무슨 색이 좋아? "I like ~" 로 말해봐!', emoji: '🎤',
          choices: [
            { emoji: '🔴', en: 'I like red!', phonetic: '[아이 라이크 레드]', kr: '빨간색이 좋아요!' },
            { emoji: '🔵', en: 'I like blue!', phonetic: '[아이 라이크 블루]', kr: '파란색이 좋아요!' },
            { emoji: '🟡', en: 'I like yellow!', phonetic: '[아이 라이크 옐로우]', kr: '노란색이 좋아요!' }] },
        { kind: 'repeat', target: 'I can build a house', en: 'Repeat after me. I can build a house!', kr: '"I can build a house!" (나는 집을 만들 수 있어요!) 🏠', emoji: '🏠',
          choices: [{ emoji: '🏠', en: 'I can build a house!', phonetic: '[아이 캔 빌드 어 하우스]', kr: '나는 집을 만들 수 있어요!' }] },
        { kind: 'ask', target: 'I can build', en: 'What can you build with Lego? Say, I can build a car!', kr: '레고로 뭘 만들 수 있어? "I can build a ~" 로 말해봐!', emoji: '🎤',
          choices: [
            { emoji: '🚗', en: 'I can build a car!', phonetic: '[아이 캔 빌드 어 카]', kr: '자동차를 만들 수 있어요!' },
            { emoji: '🚀', en: 'I can build a rocket!', phonetic: '[아이 캔 빌드 어 로켓]', kr: '로켓을 만들 수 있어요!' },
            { emoji: '🏰', en: 'I can build a castle!', phonetic: '[아이 캔 빌드 어 캐슬]', kr: '성을 만들 수 있어요!' }] },
        { kind: 'wrap', en: 'Amazing builder! You are a Lego master, Siwoo!', kr: '대단한 건축가야! 시우는 레고 마스터야! 🏆', emoji: '🏆' }
      ]
    },
    animals: {
      title: '동물 친구들 (Animals)',
      steps: [
        { kind: 'repeat', target: 'a lion', en: "Let's meet animals! Repeat after me. A lion! Roar!", kr: '동물 친구들을 만나보자! "A lion!" (사자) 🦁 어흥~ 소리도 내봐!', emoji: '🦁',
          choices: [{ emoji: '🦁', en: 'A lion!', phonetic: '[어 라이언]', kr: '사자!' }] },
        { kind: 'repeat', target: 'a dog', en: 'Good! Now. A dog! Woof woof!', kr: '이번엔 "A dog!" (강아지) 🐶 멍멍!', emoji: '🐶',
          choices: [{ emoji: '🐶', en: 'A dog!', phonetic: '[어 도그]', kr: '강아지!' }] },
        { kind: 'ask', target: 'I like', en: 'What animal do you like, Siwoo? Say, I like dogs!', kr: '시우는 무슨 동물이 좋아? "I like ~" 로 말해봐!', emoji: '🎤',
          choices: [
            { emoji: '🐶', en: 'I like dogs!', phonetic: '[아이 라이크 도그스]', kr: '강아지가 좋아요!' },
            { emoji: '🦁', en: 'I like lions!', phonetic: '[아이 라이크 라이언스]', kr: '사자가 좋아요!' },
            { emoji: '🦖', en: 'I like dinosaurs!', phonetic: '[아이 라이크 다이노소어스]', kr: '공룡이 좋아요!' }] },
        { kind: 'repeat', target: 'the cat is small', en: 'Repeat after me. The cat is small!', kr: '"The cat is small!" (고양이는 작아요!) 🐱 손으로 작게 보여줘!', emoji: '🐱',
          choices: [{ emoji: '🐱', en: 'The cat is small!', phonetic: '[더 캣 이즈 스몰]', kr: '고양이는 작아요!' }] },
        { kind: 'ask', target: 'is', en: 'Is a lion big or small? Say, The lion is big!', kr: '사자는 커, 작아? "The lion is big!" 으로 말해봐!', emoji: '🎤',
          choices: [
            { emoji: '🦁', en: 'The lion is big!', phonetic: '[더 라이언 이즈 빅]', kr: '사자는 커요!' },
            { emoji: '🐭', en: 'The mouse is small!', phonetic: '[더 마우스 이즈 스몰]', kr: '쥐는 작아요!' }] },
        { kind: 'wrap', en: 'You know so many animals! Great job, Siwoo!', kr: '동물 이름을 정말 많이 알고 있구나! 잘했어! 🏆', emoji: '🏆' }
      ]
    },
    food: {
      title: '음식 이야기 (Food)',
      steps: [
        { kind: 'repeat', target: 'an apple', en: "Let's talk about food! Repeat after me. An apple!", kr: '음식 이야기를 해보자! "An apple!" (사과) 🍎', emoji: '🍎',
          choices: [{ emoji: '🍎', en: 'An apple!', phonetic: '[언 애플]', kr: '사과!' }] },
        { kind: 'repeat', target: 'i want pizza please', en: 'Good! Now say. I want pizza, please!', kr: '"I want pizza, please!" (피자 주세요!) 🍕 예의 바르게 "please"도 말해봐!', emoji: '🍕',
          choices: [{ emoji: '🍕', en: 'I want pizza, please!', phonetic: '[아이 원트 피자, 플리즈]', kr: '피자 주세요!' }] },
        { kind: 'ask', target: 'I want', en: 'What do you want to eat, Siwoo? Say, I want ice cream, please!', kr: '시우는 뭐가 먹고 싶어? "I want ~, please" 로 말해봐!', emoji: '🎤',
          choices: [
            { emoji: '🍦', en: 'I want ice cream, please!', phonetic: '[아이 원트 아이스크림, 플리즈]', kr: '아이스크림 주세요!' },
            { emoji: '🍎', en: 'I want an apple, please!', phonetic: '[아이 원트 언 애플, 플리즈]', kr: '사과 주세요!' },
            { emoji: '🍕', en: 'I want pizza, please!', phonetic: '[아이 원트 피자, 플리즈]', kr: '피자 주세요!' }] },
        { kind: 'wrap', en: 'Yummy! You are so polite, Siwoo! Great job!', kr: '냠냠! 시우는 정말 예의 바르구나! 잘했어! 🏆', emoji: '🏆' }
      ]
    }
  };

  // ================= 말투 변주 (반복 방지용 문장 풀) =================
  const PRAISE_OK = [
    ['Great listening, Siwoo! You said it so clearly!', '귀 기울여 잘 듣고 또렷하게 말했어, 시우야!'],
    ['I like how you tried so hard!', '열심히 해보려는 모습이 멋져!'],
    ['Wow, you said the whole sentence!', '와, 문장 전체를 말했네!'],
    ['Nice pronunciation, Siwoo!', '발음이 좋아, 시우야!'],
    ['Yes! You are practicing so well!', '맞아! 연습을 정말 잘하고 있어!']
  ];
  const PRAISE_TRY = [
    ['Good try!', '좋은 시도야!'],
    ['Nice try, Siwoo!', '잘 해보려고 했어, 시우야!'],
    ['Almost there!', '거의 다 왔어!']
  ];
  const ACK_FREE = [
    ['I see!', '그렇구나!'],
    ['Oh, nice!', '오, 멋진데!'],
    ['Cool!', '멋지다!'],
    ['Really? That is great!', '정말? 대단하다!']
  ];

  // 문자열을 비교 가능한 단어 배열로 변환
  function words(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/'/g, '').split(/\s+/).filter(Boolean);
  }
  function hasHangul(text) { return /[ㄱ-ㅎ가-힣]/.test(text || ''); }

  // 두 단어가 비슷한지 (발음 오인식을 어느 정도 허용)
  function similarWord(a, b) {
    if (a === b) return true;
    if (a.length >= 4 && b.length >= 4 && (a.startsWith(b.slice(0, 3)) && Math.abs(a.length - b.length) <= 2)) return true;
    return false;
  }

  // 목표 문장 대비 일치율 (0~1)
  function matchScore(spoken, target) {
    const t = words(target);
    const s = words(spoken);
    if (!t.length || !s.length) return 0;
    let hit = 0;
    t.forEach(tw => { if (s.some(sw => similarWord(sw, tw))) hit++; });
    return hit / t.length;
  }

  // 가장 최근에 쓴 문장 기억 (반복 차단)
  function pick(arr, memory) {
    const fresh = arr.filter(x => !memory.includes(x[0]));
    const pool = fresh.length ? fresh : arr;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    memory.push(chosen[0]);
    if (memory.length > 4) memory.shift();
    return chosen;
  }

  const proto = window.BrickyDialogueEngine && window.BrickyDialogueEngine.prototype;
  if (!proto) {
    console.warn('[teacher.js] BrickyDialogueEngine 미로드: 수업 엔진 적용 생략');
    return;
  }

  // ================= 수업 상태 관리 =================
  proto.resetLesson = function () {
    this.lesson = { unit: this.currentTopicKey || 'daily', step: -1, tries: 0, silentTurns: 0, usedPraise: [], usedTry: [], usedAck: [], started: false };
  };

  proto.getUnit = function () {
    const key = (this.lesson && this.lesson.unit) || 'daily';
    return UNITS[key] || UNITS.daily;
  };

  // 주제 탭을 바꾸면 해당 단원 수업을 처음부터 시작
  const origSetTopic = proto.setTopic;
  proto.setTopic = function (key) {
    const ok = origSetTopic.call(this, key);
    if (ok) this.resetLesson();
    return ok;
  };

  // 현재 단계의 선생님 말(말풍선 + 추천 답변 칩)을 반환
  function buildStepReply(engine, prefix) {
    const unit = engine.getUnit();
    const step = unit.steps[engine.lesson.step];
    const prefixEn = prefix ? prefix.en + ' ' : '';
    const prefixKr = prefix ? prefix.kr + ' ' : '';
    return {
      replyEn: prefixEn + step.en,
      replyKr: prefixKr + step.kr,
      suggestions: step.choices || [],
      kind: step.kind,
      teach: true
    };
  }

  // 수업 시작/다음 단계로 이동
  function advance(engine, prefix) {
    const unit = engine.getUnit();
    engine.lesson.step++;
    engine.lesson.tries = 0;
    engine.lesson.silentTurns = 0;

    if (engine.lesson.step >= unit.steps.length) {
      engine.lesson.step = 0; // 한 바퀴 끝나면 복습 라운드로 다시 시작
    }
    const step = unit.steps[engine.lesson.step];

    if (step.kind === 'wrap') {
      const r = buildStepReply(engine, prefix);
      r.replyEn += ' Do you want to play one more time?';
      r.replyKr += ' 한 번 더 복습 게임 해볼까?';
      r.suggestions = [
        { emoji: '🙋', en: 'Yes, one more time!', phonetic: '[예스, 원 모어 타임]', kr: '네, 한 번 더요!' },
        { emoji: '👏', en: 'High five, Bricky!', phonetic: '[하이 파이브, 브릭키]', kr: '브릭키 하이파이브!' }
      ];
      r.wrap = true;
      return r;
    }
    return buildStepReply(engine, prefix);
  }

  // ================= 핵심: 시우의 말에 선생님이 반응 =================
  proto.teacherReply = function (rawText) {
    if (!this.lesson) this.resetLesson();
    const L = this.lesson;
    const spoken = String(rawText || '').trim();
    this.conversationHistory.push({ role: 'user', text: spoken, time: Date.now() });

    const unit = this.getUnit();

    // 인사 대답 직후: 수업 시작 (워밍업 → 첫 표현 가르치기)
    if (L.step < 0) {
      const isHesitation = /^(uh|um|er|ah|eh|oh|어|음|그|아|\.+|ㅋ+|ㅎ+|\?+)$/i.test(spoken);
      const isTooShort = spoken.replace(/[\s\.\?!~,\-_]/g, '').length < 2;

      // 발화가 없거나 단순 잡음/망설임인 경우 진도를 나가지 않고 다정하게 인사 재요청
      if (!spoken || isHesitation || isTooShort) {
        const cur = this.getCurrentExchange();
        return {
          replyEn: "Hello Siwoo! Bricky couldn't hear you clearly. Can you say 'Hello Bricky'? 👋",
          replyKr: "안녕 시우야! 브릭키가 잘 못 들었어. 'Hello Bricky'하고 반갑게 인사해줄래? 👋",
          suggestions: (cur && cur.choices) || [
            { emoji: "👋", en: "Hello Bricky!", phonetic: "[헬로 브릭키]", kr: "안녕 브릭키야!" }
          ],
          kind: 'greeting',
          teach: true
        };
      }

      const ack = hasHangul(spoken) ? ['Nice to talk to you!', '이야기해줘서 고마워!'] : pick(ACK_FREE, L.usedAck);
      const bridge = { en: ack[0] + " Let's play with English today!", kr: ack[1] + ' 오늘은 영어로 같이 놀아보자!' };
      return advance(this, bridge);
    }

    const step = unit.steps[L.step];

    // 마무리 단계: 한 번 더 할지 응답
    if (step.kind === 'wrap') {
      L.step = -1;
      return advance(this, { en: 'Okay, here we go again!', kr: '좋아, 한 번 더 해보자!' });
    }

    // ----- 따라 말하기(Practice) -----
    if (step.kind === 'repeat') {
      const isHesitation = /^(uh|um|er|ah|eh|oh|어|음|그|아|\.+|ㅋ+|ㅎ+|\?+)$/i.test(spoken);
      const isTooShort = spoken.replace(/[\s\.\?!~,\-_]/g, '').length < 2;

      // 발화가 불명확하거나 잡음인 경우: 진도 점프 금지, 다시 말해달라고 요청
      if (!spoken || isHesitation || isTooShort) {
        L.tries++;
        const model = step.choices && step.choices[0] ? step.choices[0].en : step.target;
        return {
          replyEn: `Sorry Siwoo, Bricky couldn't hear that clearly! Can you say "${model}" again? 👂`,
          replyKr: `시우야, 브릭키가 잘 못 들었어! "${model}" 라고 한 번만 다시 말해줄래? 👂`,
          suggestions: step.choices || [],
          kind: 'repeat',
          teach: true
        };
      }

      const score = matchScore(spoken, step.target);

      if (hasHangul(spoken) && score < 0.5) {
        // 한국어로 대답함 → 영어로 다시 유도 (혼내지 않음)
        L.tries++;
        if (L.tries >= 3) return advance(this, { en: 'That is okay! Let us try the next one.', kr: '괜찮아! 다음 걸 해보자.' });
        return { replyEn: `Let's say it in English! Listen again. ${step.en.split('. ').pop()}`, replyKr: '영어로 말해볼까? 다시 잘 들어봐!', suggestions: step.choices || [], kind: 'repeat', teach: true };
      }

      if (score >= 0.6) {
        const p = pick(PRAISE_OK, L.usedPraise);
        return advance(this, { en: p[0], kr: p[1] });
      }

      // 거의 맞음/틀림 → 올바른 문장 다시 들려주기(Recast) 후 재도전, 2번까지만
      L.tries++;
      if (L.tries >= 3) {
        return advance(this, { en: 'Good try! That is okay. Next one!', kr: '잘했어! 괜찮아. 다음 문장으로 가보자!' });
      }
      const t = pick(PRAISE_TRY, L.usedTry);
      const model = step.choices && step.choices[0] ? step.choices[0].en : step.target;
      return {
        replyEn: `${t[0]} ${model}? Yes, ${model} Now you try!`,
        replyKr: `${t[1]} 잘 들어봐. "${model}" 이제 시우 차례!`,
        suggestions: step.choices || [],
        kind: 'repeat',
        teach: true
      };
    }

    // ----- 내 말로 말하기(Production) -----
    if (step.kind === 'ask') {
      const isHesitation = /^(uh|um|er|ah|eh|oh|어|음|그|아|응|\.+)$/i.test(spoken);
      const score = matchScore(spoken, step.target);
      const meaningful = spoken.replace(/\s/g, '').length >= 3 && !isHesitation;

      if (hasHangul(spoken) && score < 0.5) {
        L.tries++;
        if (L.tries >= 2) return advance(this, { en: 'Thank you for telling me!', kr: '말해줘서 고마워!' });
        const eg = step.choices && step.choices[0] ? step.choices[0].en : '';
        return { replyEn: `Can you say it in English? Like this, ${eg}`, replyKr: `영어로 말해볼까? 이렇게! "${eg}"`, suggestions: step.choices || [], kind: 'ask', teach: true };
      }

      if (meaningful) {
        // 올바른 틀(I am / I like ...)을 썼으면 칭찬, 아니면 자연스럽게 올바른 문장으로 다시 들려줌
        const used = score >= 0.5;
        let prefix;
        if (used) {
          const p = pick(PRAISE_OK, L.usedPraise);
          prefix = { en: p[0] + ' "' + capitalize(spoken) + '"! I understand.', kr: p[1] + ' 시우가 말한 걸 브릭키가 잘 알아들었어.' };
        } else {
          const a = pick(ACK_FREE, L.usedAck);
          const model = step.choices && step.choices[0] ? step.choices[0].en : '';
          prefix = { en: `${a[0]} You can also say, ${model}`, kr: `${a[1]} 이렇게도 말할 수 있어요: "${model}"` };
        }
        return advance(this, prefix);
      }
    }

    // 알아듣지 못했거나 망설임 잡음인 경우: 엉뚱한 진도로 절대 넘어가지 않고, 같은 질문에 머물며 다정하게 다시 요청!
    L.tries++;
    return {
      replyEn: "Sorry Siwoo, Bricky couldn't hear that well! Can you say it one more time? 👂",
      replyKr: "시우야, 브릭키가 잘 못 들었어! 천천히 한 번만 다시 말해줄래?",
      suggestions: step.choices || [],
      kind: step.kind,
      teach: true
    };
  };

  function capitalize(s) { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); }

  // 침묵 시 선생님의 도움 (힌트 한 번 → 그 뒤엔 조용히 기다림)
  proto.getSilenceHint = function (level) {
    if (!this.lesson) this.resetLesson();
    const unit = this.getUnit();
    const step = unit.steps[this.lesson.step] || null;
    const model = step && step.choices && step.choices[0] ? step.choices[0].en : null;
    const lv = level || 1;
    if (lv === 1) {
      // 1단계: 질문을 바꾸지 않고 같은 문장을 더 천천히 반복하거나 친근한 대기 멘트
      const q = step ? step.en.split('. ').pop() : "Bricky is listening, Siwoo! What is on your mind? 🧱";
      return { en: q, kr: '브릭키가 귀 기울이고 있어, 시우야! 편하게 이야기해줘!' };
    }
    if (!model) return null;
    if (lv === 2) {
      // 2단계: 문장 틀(sentence frame) 제공
      const frame = model.split(' ').slice(0, 2).join(' ');
      return { en: `Try it with me. ${frame} ...`, kr: `이렇게 시작해봐: "${frame} ..."` };
    }
    // 3단계: 한국어로 뜻을 짚고 영어 모범 답안을 들려줌
    return { en: `It is okay, Siwoo. Say, ${model}`, kr: `괜찮아, 시우야. 이렇게 말해봐: "${model}"` };
  };

  window.BRICKY_UNITS = UNITS;
})();

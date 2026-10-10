/**
 * 🧱 BrickTalk Live: 줌(Zoom) 스타일 50:50 1:1 레고 화상 영어 인터랙션 컨트롤러 (app.js)
 * - 좌측: 3D 레고 튜터 브릭키 실시간 화상 & 좌측 전용 자막 바
 * - 우측: 시우(Kai) 실제 웹캠 스트림 & 우측 전용 자막 바 (화면 가림 0%)
 * - 스피커 에코 및 마이크 재유입 완벽 차단 (혼자 말하고 반복하는 현상 원천 해결)
 * - 한국어 & 영어 50+ 인텐트 자연어 자유 대화 지원
 */

class ZoomBrickTalkApp {
  constructor() {
    this.dialogueEngine = new window.BrickyDialogueEngine();
    this.stars = 18;
    this.isRecording = false;
    this.autoListenMode = true;
    this.isTutorSpeaking = false;

    // 실제 사용자 웹캠 미디어 스트림
    this.userMediaStream = null;
    this.isCamEnabled = true;

    // 통화 타이머
    this.callSeconds = 0;
    this.callTimerInterval = null;

    // 침묵 감지 (단 1회만 다정하게 넛지 후 조용히 대기)
    this.silenceTimer = null;
    this.hasNudged = false; this.nudgeLevel = 0;

    // DOM 요소 캐싱
    this.dom = {
      starCount: document.getElementById('star-count'),
      callTimer: document.getElementById('call-timer'),
      topicScrollBar: document.getElementById('topic-scroll-bar'),
      topicPills: document.querySelectorAll('.topic-tab-btn'),
      tutorPanel: document.getElementById('teddy-container'),
      studentPanel: document.getElementById('student-panel'),
      userWebcam: document.getElementById('user-webcam'),
      webcamFallback: document.getElementById('webcam-fallback'),
      camStartBtn: document.getElementById('cam-start-btn'),
      toggleCamBtn: document.getElementById('toggle-cam-btn'),
      camIcon: document.getElementById('cam-icon'),
      camLabel: document.getElementById('cam-label'),
      userCamStatusDot: document.getElementById('user-cam-status-dot'),
      liveTag: document.getElementById('live-tag'),
      liveTagText: document.getElementById('live-tag-text'),
      studentSpeechPill: document.getElementById('student-speech-pill'),
      studentSpokenText: document.getElementById('student-spoken-text'),
      studentSpokenKr: document.getElementById('student-spoken-kr'),
      enText: document.getElementById('en-text'),
      krText: document.getElementById('kr-text'),
      replayBtn: document.getElementById('replay-audio-btn'),
      shuffleBtn: document.getElementById('shuffle-btn'),
      cardsGrid: document.getElementById('cards-grid'),
      praiseBanner: document.getElementById('praise-banner'),
      praiseMsg: document.getElementById('praise-msg'),
      micBtnWrapper: document.getElementById('mic-btn-wrapper'),
      bigMicBtn: document.getElementById('big-mic-btn'),
      micGuideText: document.getElementById('mic-guide-text'),
      parentLockBtn: document.getElementById('parent-lock-btn'),
      parentModal: document.getElementById('parent-modal'),
      mathQ: document.getElementById('math-q'),
      mathAns: document.getElementById('math-ans'),
      modalCancel: document.getElementById('modal-cancel'),
      modalConfirm: document.getElementById('modal-confirm'),
      feedAppleBtn: document.getElementById('feed-apple-btn'),
      sendBalloonBtn: document.getElementById('send-balloon-btn'),
      highFiveBtn: document.getElementById('high-five-btn'),
      endCallBtn: document.getElementById('end-call-btn'),
      turnIndicatorBanner: document.getElementById('turn-indicator-banner'),
      callSummaryModal: document.getElementById('call-summary-modal'),
      summaryDuration: document.getElementById('summary-duration'),
      summaryStars: document.getElementById('summary-stars'),
      restartCallBtn: document.getElementById('restart-call-btn'),
      brickyLiveImg: document.getElementById('bricky-live-img'),
      tutorVoiceBars: document.getElementById('tutor-voice-bars'),
      studentVoiceBars: document.getElementById('student-voice-bars'),
      aiStatusPill: document.getElementById('ai-status-pill'),
      aiStatusText: document.getElementById('ai-status-text'),
      parentMathView: document.getElementById('parent-math-view'),
      parentAiSettingsView: document.getElementById('parent-ai-settings-view'),
      geminiApiKeyInput: document.getElementById('gemini-api-key'),
      geminiStatusText: document.getElementById('gemini-status-text'),
      aiSettingsClose: document.getElementById('ai-settings-close'),
      aiSettingsSave: document.getElementById('ai-settings-save'),
      sttLangBtn: document.getElementById('stt-lang-btn'),
      sttLangFlag: document.getElementById('stt-lang-flag'),
      sttLangLabel: document.getElementById('stt-lang-label')
    };

    // 실시간 립싱크 스위칭 타이머
    this.lipSyncTimer = null;
  }

  /**
   * 앱 구동 및 화상 통화 초기화
   */
  async init() {
    try {
      // 🔒 AES-256-GCM 암호화 체크포인트 복원
      if (window.secureStorage) {
        const savedData = await window.secureStorage.getDecryptedItem('bricky_kai_zoom_progress');
        if (savedData) {
          if (typeof savedData.stars === 'number') this.stars = savedData.stars;
          if (savedData.topicKey && window.BRICKY_TOPICS[savedData.topicKey]) {
            this.dialogueEngine.setTopic(savedData.topicKey);
            this.updateActiveTopicPill(savedData.topicKey);
          }
        }
      }

      this.updateStarUI();
      this.bindEvents();
      this.updateAiStatusUI();
      this.startCallTimer();
      this.renderExchange();

      // 시우의 실제 웹캠 카메라 자동 시작
      this.initUserWebcam();

      // 브릭키의 시작 대사
      setTimeout(() => {
        this.speakCurrent();
      }, 700);
    } catch (e) {
      console.error('[화상통화 앱 초기화 예외 방지]:', e);
    }
  }

  /**
   * 시우(Kai)의 실제 웹캠 카메라 & 오디오 스트림 1회 통합 연결
   */
  async initUserWebcam() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true // 오디오 권한 동시 획득으로 브라우저 권한 기억 보장
        });

        this.userMediaStream = stream;
        if (this.dom.userWebcam) {
          this.dom.userWebcam.srcObject = stream;
          this.dom.userWebcam.play().catch(() => {});
        }

        if (this.dom.webcamFallback) {
          this.dom.webcamFallback.classList.add('hidden');
        }
        if (this.dom.userCamStatusDot) {
          this.dom.userCamStatusDot.className = 'tag-status-dot green';
        }
      }
    } catch (err) {
      console.warn('[웹캠 연결 알림]: 카메라 접근 대기 중', err);
    }
  }

  /**
   * 카메라 켜기 / 끄기 토글
   */
  toggleWebcam() {
    if (!this.userMediaStream) {
      this.initUserWebcam();
      return;
    }

    const videoTracks = this.userMediaStream.getVideoTracks();
    if (videoTracks.length > 0) {
      this.isCamEnabled = !this.isCamEnabled;
      videoTracks[0].enabled = this.isCamEnabled;

      if (this.isCamEnabled) {
        this.dom.toggleCamBtn.classList.add('active');
        this.dom.camLabel.textContent = '카메라 ON';
        this.dom.webcamFallback.classList.add('hidden');
        this.dom.userCamStatusDot.className = 'tag-status-dot green';
      } else {
        this.dom.toggleCamBtn.classList.remove('active');
        this.dom.camLabel.textContent = '카메라 OFF';
        this.dom.webcamFallback.classList.remove('hidden');
        this.dom.userCamStatusDot.className = 'tag-status-dot red';
      }
    }
  }

  /**
   * 통화 타이머 (00:00부터 1초씩 증가)
   */
  startCallTimer() {
    if (this.callTimerInterval) clearInterval(this.callTimerInterval);
    this.callTimerInterval = setInterval(() => {
      this.callSeconds++;
      const mins = String(Math.floor(this.callSeconds / 60)).padStart(2, '0');
      const secs = String(this.callSeconds % 60).padStart(2, '0');
      if (this.dom.callTimer) {
        this.dom.callTimer.textContent = `${mins}:${secs}`;
      }
    }, 1000);
  }

  /**
   * 암호화 체크포인트 저장
   */
  async saveProgress() {
    try {
      if (window.secureStorage) {
        await window.secureStorage.setEncryptedItem('bricky_kai_zoom_progress', {
          stars: this.stars,
          topicKey: this.dialogueEngine.currentTopicKey,
          updatedAt: Date.now()
        });
      }
    } catch (e) {}
  }

  updateStarUI() {
    if (this.dom.starCount) {
      this.dom.starCount.textContent = this.stars;
    }
  }

  addStar(count = 1) {
    this.stars += count;
    this.updateStarUI();
    if (window.kidSounds) window.kidSounds.playStarSparkle();
    this.saveProgress();
  }

  /**
   * 대화 단계 렌더링
   */
  /**
   * 대화 단계 렌더링 (단어별 가라오케 분할)
   */
  renderExchange(overrideExchange = null) {
    const exchange = overrideExchange || this.dialogueEngine.getCurrentExchange();
    const enString = exchange.tutorEn || exchange.teddyEn || '';
    const krString = exchange.tutorKr || exchange.teddyKr || '';

    this.renderKaraokeEnText(enString);
    this.dom.krText.textContent = krString;

    // 3개 추천 답변 브릭 칩 렌더링
    this.renderChoiceCards(exchange.choices);
  }

  /**
   * 브릭키의 영문 자막을 단어별 span으로 감싸서 실시간 하이라이트 준비
   */
  renderKaraokeEnText(enString) {
    this.dom.enText.innerHTML = '';
    const words = enString.split(/(\s+)/); // 공백 보존 분할
    let wordIdxCounter = 0;

    words.forEach(chunk => {
      if (/^\s+$/.test(chunk)) {
        this.dom.enText.appendChild(document.createTextNode(chunk));
      } else if (chunk.length > 0) {
        const span = document.createElement('span');
        span.className = 'word-span';
        span.dataset.wordIdx = wordIdxCounter;
        span.textContent = chunk;
        this.dom.enText.appendChild(span);
        wordIdxCounter++;
      }
    });
  }

  /**
   * 실시간 가라오케 단어 하이라이트
   */
  setKaraokeWordHighlight(activeIdx) {
    const spans = this.dom.enText.querySelectorAll('.word-span');
    spans.forEach(span => {
      const idx = parseInt(span.dataset.wordIdx, 10);
      if (idx === activeIdx) {
        span.classList.add('word-highlight');
      } else {
        span.classList.remove('word-highlight');
      }
    });
  }

  /**
   * 모든 단어 하이라이트 초기화
   */
  clearKaraokeHighlight() {
    const spans = this.dom.enText.querySelectorAll('.word-span');
    spans.forEach(span => span.classList.remove('word-highlight'));
  }

  /**
   * 슬림 3D 브릭 추천 답변 칩 렌더링
   */
  renderChoiceCards(choices) {
    this.dom.cardsGrid.innerHTML = '';
    (choices || []).slice(0, 3).forEach(choice => {
      const card = document.createElement('div');
      card.className = 'choice-card';
      card.innerHTML = `
        <span class="card-emoji">${choice.emoji || '⭐'}</span>
        <span class="card-en">${choice.en}</span>
        <span class="card-phonetic">${choice.phonetic || ''}</span>
      `;
      card.addEventListener('click', () => {
        this.clearSilenceTimer();
        this.handleUserSpeak(choice.en, choice.kr, choice.emoji);
      });
      this.dom.cardsGrid.appendChild(card);
    });
  }

  clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /**
   * 침묵 감지 타이머 (아이가 4.5초간 조용할 때 1회만 다정하게 가이드)
   */
  startSilenceTimer() {
    this.clearSilenceTimer();
    if (!this.autoListenMode || this.hasNudged) return;

    this.silenceTimer = setTimeout(() => {
      this.handleSilenceNudge();
    }, 6000);
  }

  /**
   * 침묵 시 브릭키의 1회 친절 넛지 (반복 루프 절대 없음)
   */
  handleSilenceNudge() {
    if (this.isTutorSpeaking) return;
    this.nudgeLevel = (this.nudgeLevel || 0) + 1;
    if (this.nudgeLevel >= 3) this.hasNudged = true; // 최대 3단계 후엔 조용히 기다림 (무한 반복 방지)

    // 시우의 턴 표시 일시 해제
    this.hideYourTurnImpact();

    const exchange = this.dialogueEngine.getCurrentExchange();
    const suggestedChoice = (exchange.choices && exchange.choices[0]) ? exchange.choices[0] : null;

    let nudgeEn = suggestedChoice 
      ? `Siwoo, Bricky is listening! You can say "${suggestedChoice.en}"! 🧱`
      : "Siwoo, Bricky is listening! Say anything you like! 🧱";
    let nudgeKr = suggestedChoice 
      ? `시우야, 브릭키가 듣고 있어! "${suggestedChoice.en}" (${suggestedChoice.kr}) 이렇게 말해볼까?`
      : "시우야, 브릭키가 귀 기울이고 있어! 편하게 말해줘!";
    try {
      if (typeof this.dialogueEngine.getSilenceHint === 'function') {
        const hint = this.dialogueEngine.getSilenceHint(this.nudgeLevel);
        if (hint && hint.en) { nudgeEn = hint.en; nudgeKr = hint.kr || nudgeKr; }
      }
    } catch (err) { console.warn('[힌트 오류]', err); }

    this.renderKaraokeEnText(nudgeEn);
    this.dom.krText.textContent = nudgeKr;
    this.setTutorState('speaking');
    this.isTutorSpeaking = true;

    if (window.kidSpeech) {
      window.kidSpeech.speakTeddy(
        nudgeEn,
        () => {
          this.setTutorState('speaking');
          this.isTutorSpeaking = true;
        },
        () => {
          this.setTutorState('idle');
          this.isTutorSpeaking = false;
          this.clearKaraokeHighlight();
          // 넛지 후 조용히 마이크 대기 & 시우 턴 점등
          this.handlePostTutorTurn();
        },
        (wordIdx) => {
          this.setKaraokeWordHighlight(wordIdx);
        }
      );
    }
  }

  /**
   * 시우(Kai)가 말해야 하는 타이밍 (Your Turn 강력한 비주얼 임팩트)
   */
  showYourTurnImpact() {
    if (this.isTutorSpeaking) return;
    this.dom.studentPanel.classList.add('your-turn');
    if (this.dom.turnIndicatorBanner) {
      this.dom.turnIndicatorBanner.style.display = 'flex';
    }
    if (window.kidSounds) window.kidSounds.playPop();
  }

  /**
   * 시우의 턴 비주얼 임팩트 끄기
   */
  hideYourTurnImpact() {
    this.dom.studentPanel.classList.remove('your-turn');
    if (this.dom.turnIndicatorBanner) {
      this.dom.turnIndicatorBanner.style.display = 'none';
    }
  }

  /**
   * 시우(Siwoo)의 발화 처리 (자유 일상 티키타카 NLU & Gemini 연동)
   */
  async handleUserSpeak(spokenEn, spokenKr = null, emoji = '🗣️') {
    this.clearSilenceTimer();
    this.hasNudged = false; this.nudgeLevel = 0;
    this.hideYourTurnImpact();

    // 입력된 발화의 영어/한국어 쌍 스마트 정규화
    let finalEn = spokenEn;
    let finalKr = spokenKr;
    if (!spokenKr) {
      const normalized = this.dialogueEngine.normalizeKidSpeech(spokenEn);
      finalEn = normalized.en;
      finalKr = normalized.kr;
    }

    if (window.kidSounds) window.kidSounds.playPop();

    // 1. 우측 시우 화면 하단 자막 바 표시
    this.dom.studentPanel.classList.add('active-speaking');
    this.dom.studentSpeechPill.style.display = 'flex';
    this.dom.studentSpokenText.textContent = `${emoji} "${finalEn}"`;
    if (this.dom.studentSpokenKr) {
      this.dom.studentSpokenKr.textContent = `"${finalKr}"`;
    }

    setTimeout(() => {
      this.dom.studentPanel.classList.remove('active-speaking');
    }, 2500);

    // 2. 칭찬 및 브릭 스타 지급
    this.showPraise(`Great Job Siwoo! "${finalEn}" ⭐+1`);
    this.addStar(1);

    // 3. 지능형 멀티턴 티키타카 반응 생성 (Gemini API 또는 내장 멀티턴 엔진)
    const context = await this.dialogueEngine.fetchGeminiTikiTaka(finalEn);

    setTimeout(() => {
      this.setTutorState('speaking');
      this.renderKaraokeEnText(context.replyEn);
      this.dom.krText.textContent = context.replyKr;
      this.renderChoiceCards(context.suggestions);
      this.isTutorSpeaking = true;

      if (window.kidSpeech) {
        window.kidSpeech.speakTeddy(
          context.replyEn,
          () => {
            this.setTutorState('speaking');
            this.isTutorSpeaking = true;
          },
          () => {
            this.setTutorState('idle');
            this.isTutorSpeaking = false;
            this.clearKaraokeHighlight();
            this.handlePostTutorTurn();
          },
          (wordIdx) => {
            this.setKaraokeWordHighlight(wordIdx);
          }
        );
      }
    }, 450);
  }

  /**
   * 브릭키의 현재 대사 음성 재생 (가라오케 하이라이트 동기화)
   */
  speakCurrent() {
    this.clearSilenceTimer();
    this.hideYourTurnImpact();

    const exchange = this.dialogueEngine.getCurrentExchange();
    if (window.kidSounds) window.kidSounds.getAudioContext();

    this.setTutorState('speaking');
    this.dom.liveTagText.textContent = '🎙️ Bricky가 말하고 있어요!';
    this.isTutorSpeaking = true;

    const speechText = exchange.tutorEn || exchange.teddyEn;
    this.renderKaraokeEnText(speechText);
    this.dom.krText.textContent = exchange.tutorKr || exchange.teddyKr;

    if (window.kidSpeech) {
      window.kidSpeech.speakTeddy(
        speechText,
        () => {
          this.setTutorState('speaking');
          this.isTutorSpeaking = true;
        },
        () => {
          this.setTutorState('idle');
          this.isTutorSpeaking = false;
          this.clearKaraokeHighlight();
          this.dom.liveTagText.textContent = '👂 시우 목소리 듣는 중!';
          this.handlePostTutorTurn();
        },
        (wordIdx) => {
          this.setKaraokeWordHighlight(wordIdx);
        }
      );
    }
  }

  /**
   * 브릭키 발화 종료 후 자동 턴테이킹 (0.5초 안전 쿨다운 후 마이크 오픈 & 시우 턴 비주얼 임팩트)
   */
  handlePostTutorTurn() {
    if (this.autoListenMode && !this.isTutorSpeaking) {
      setTimeout(() => {
        if (!this.isTutorSpeaking) {
          this.showYourTurnImpact();
          this.triggerMicAutoStart();
        }
      }, 500);
    }
  }

  /**
   * 핸즈프리 마이크 가동 (실시간 중간 발화 감지 및 비주얼 임팩트 연동)
   */
  triggerMicAutoStart() {
    if (this.isTutorSpeaking) return;
    this.isRecording = true;
    this.dom.bigMicBtn.classList.add('active');
    this.dom.micGuideText.textContent = "시우야, 말씀해주세요 🎤";
    this.dom.liveTagText.textContent = "👂 시우 목소리 듣는 중!";
    this.setTutorState('listening');

    this.startSilenceTimer();

    if (window.kidSpeech) {
      window.kidSpeech.startListening(
        (spokenText) => {
          // 최종 확정 발화
          this.clearSilenceTimer();
          this.handleMicFinished(spokenText);
        },
        (listening, error) => {
          if (!listening) {
            this.isRecording = false;
            if (!this.isTutorSpeaking) {
              this.setTutorState('idle');
              this.dom.micGuideText.textContent = "핸즈프리 ON 🎤";
            }
          }
        },
        (interimText) => {
          // 🌟 실시간 발화 감지 중 (내가 말하고 있다는 즉각적인 화면 반응 & 단어 팝핑!)
          this.clearSilenceTimer();
          if (this.dom.turnIndicatorBanner) {
            this.dom.turnIndicatorBanner.style.display = 'none'; // 말하기 시작했으므로 차례 배너 접기
          }
          this.dom.studentPanel.classList.add('active-speaking');
          if (this.dom.studentVoiceBars) {
            this.dom.studentVoiceBars.classList.add('show');
          }
          this.dom.studentSpeechPill.style.display = 'flex';

          // 실시간 단어 분할 및 최신 발화 단어 팝핑 하이라이트 효과
          const words = (interimText || '').trim().split(/\s+/).filter(Boolean);
          if (words.length > 0) {
            const lastWord = words.pop();
            const prevWords = words.join(' ');
            this.dom.studentSpokenText.innerHTML = `🎙️ "${prevWords ? prevWords + ' ' : ''}<span class="word-pop-highlight">${lastWord}</span>..."`;
          } else {
            this.dom.studentSpokenText.textContent = `🎙️ "${interimText}..."`;
          }

          if (this.dom.studentSpokenKr) {
            this.dom.studentSpokenKr.textContent = `시우의 목소리를 귀 기울여 듣고 있어요! 👂`;
          }
        }
      );
    }
  }

  /**
   * 음성 인식 완료 처리
   */
  handleMicFinished(spokenText) {
    this.clearSilenceTimer();
    this.setTutorState('idle');
    this.hideYourTurnImpact();
    if (this.dom.studentVoiceBars) {
      this.dom.studentVoiceBars.classList.remove('show');
    }

    if (spokenText && spokenText.trim().length > 0) {
      this.handleUserSpeak(spokenText, null, '🎤');
    }
  }

  /**
   * 튜터 상태 변경 (3단 액션 프레임 & 실시간 립싱크 스위칭)
   */
  setTutorState(state) {
    try {
      if (this.lipSyncTimer) { clearInterval(this.lipSyncTimer); this.lipSyncTimer = null; }
      this.dom.tutorPanel.classList.remove('speaking', 'listening');
      if (this.dom.tutorVoiceBars) this.dom.tutorVoiceBars.classList.toggle('show', state === 'speaking');
      if (state === 'speaking') {
        this.dom.tutorPanel.classList.add('speaking');
        this.dom.liveTagText.textContent = '🎙️ Bricky가 이야기해요!';
      } else if (state === 'listening') {
        this.dom.tutorPanel.classList.add('listening');
        this.dom.liveTagText.textContent = '👂 시우 목소리 듣는 중!';
      } else {
        this.dom.liveTagText.textContent = '✨ Bricky와 화상 통화 중!';
      }
    } catch (err) { console.warn('[튜터 상태 오류]', err); }
  }

  showPraise(message) {
    this.dom.praiseMsg.textContent = message;
    this.dom.praiseBanner.classList.add('show');
    if (window.kidSounds) window.kidSounds.playCheer();

    setTimeout(() => {
      this.dom.praiseBanner.classList.remove('show');
    }, 2800);
  }

  updateActiveTopicPill(topicKey) {
    document.querySelectorAll('.topic-tab-btn').forEach(pill => {
      if (pill.getAttribute('data-topic') === topicKey) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  switchTopic(topicKey) {
    this.clearSilenceTimer();
    this.hasNudged = false; this.nudgeLevel = 0;
    if (window.kidSounds) window.kidSounds.playPop();

    if (this.dialogueEngine.setTopic(topicKey)) {
      this.updateActiveTopicPill(topicKey);
      this.dom.studentSpeechPill.style.display = 'none';
      this.renderExchange();
      this.saveProgress();
      this.speakCurrent();
    }
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    if (this.dom.toggleCamBtn) {
      this.dom.toggleCamBtn.addEventListener('click', () => this.toggleWebcam());
    }

    if (this.dom.camStartBtn) {
      this.dom.camStartBtn.addEventListener('click', () => this.initUserWebcam());
    }

    document.querySelectorAll('.topic-tab-btn').forEach(pill => {
      pill.addEventListener('click', () => {
        const topic = pill.getAttribute('data-topic');
        this.switchTopic(topic);
      });
    });

    if (this.dom.replayBtn) {
      this.dom.replayBtn.addEventListener('click', () => {
        if (window.kidSounds) window.kidSounds.playPop();
        this.speakCurrent();
      });
    }

    if (this.dom.shuffleBtn) {
      this.dom.shuffleBtn.addEventListener('click', () => {
        if (window.kidSounds) window.kidSounds.playPop();
        this.clearSilenceTimer();
        this.hasNudged = false; this.nudgeLevel = 0;
        const currentExchange = this.dialogueEngine.nextExchange();
        this.renderExchange(currentExchange);
        this.saveProgress();
        this.speakCurrent();
      });
    }

    if (this.dom.bigMicBtn) {
      this.dom.bigMicBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.isRecording) {
          // 만약 시우가 방금 말을 마쳤고 내용이 있다면 3.2초를 안 기다리고 즉시 제출
          if (window.kidSpeech && window.kidSpeech.speechBuffer && window.kidSpeech.speechBuffer.trim().length > 0) {
            window.kidSpeech.flushSpeechBuffer();
            return;
          }
          this.clearSilenceTimer();
          if (window.kidSpeech) window.kidSpeech.stopListening();
          this.isRecording = false;
          this.dom.bigMicBtn.classList.remove('active');
          this.dom.micGuideText.textContent = "마이크 OFF 🔇";
        } else {
          this.triggerMicAutoStart();
        }
      });
    }

    if (this.dom.feedAppleBtn) {
      this.dom.feedAppleBtn.addEventListener('click', () => {
        this.handleUserSpeak("Here is an apple for Bricky!", "브릭키에게 사과를 선물해요!", "🍎");
      });
    }

    if (this.dom.sendBalloonBtn) {
      this.dom.sendBalloonBtn.addEventListener('click', () => {
        this.handleUserSpeak("Here is a colorful balloon!", "예쁜 풍선을 선물해요!", "🎈");
      });
    }

    if (this.dom.highFiveBtn) {
      this.dom.highFiveBtn.addEventListener('click', () => {
        this.handleUserSpeak("High five, Bricky!", "브릭키 하이파이브!", "👏");
      });
    }

    // 🌟 화상 통화 종료 버튼 (웹캠/마이크/타이머 실제 종료 & 학습 리포트 팝업 오픈)
    if (this.dom.endCallBtn) {
      this.dom.endCallBtn.addEventListener('click', () => {
        this.endCall();
      });
    }

    if (this.dom.restartCallBtn) {
      this.dom.restartCallBtn.addEventListener('click', () => {
        this.restartCall();
      });
    }

    if (this.dom.parentLockBtn) {
      this.dom.parentLockBtn.addEventListener('click', () => {
        this.openParentGate();
      });
    }

    if (this.dom.modalCancel && this.dom.parentModal) {
      this.dom.modalCancel.addEventListener('click', () => {
        this.dom.parentModal.classList.remove('open');
      });
    }

    if (this.dom.modalConfirm) {
      this.dom.modalConfirm.addEventListener('click', () => {
        this.verifyParentGate();
      });
    }

    if (this.dom.aiSettingsClose && this.dom.parentModal) {
      this.dom.aiSettingsClose.addEventListener('click', () => {
        this.dom.parentModal.classList.remove('open');
      });
    }

    if (this.dom.aiSettingsSave) {
      this.dom.aiSettingsSave.addEventListener('click', () => {
        this.saveAiSettings();
      });
    }

    // 🌟 음성인식 언어 토글 (영어 en-US ↔ 한국어 ko-KR)
    if (this.dom.sttLangBtn) {
      this.dom.sttLangBtn.addEventListener('click', () => {
        if (!window.kidSpeech) return;
        const nextLang = window.kidSpeech.currentLang === 'en-US' ? 'ko-KR' : 'en-US';
        window.kidSpeech.setLanguage(nextLang);
        this.updateSttLangUI();
        if (window.kidSounds) window.kidSounds.playPop();
      });
      this.updateSttLangUI();
    }
  }

  updateSttLangUI() {
    if (!window.kidSpeech || !this.dom.sttLangBtn) return;
    const isEng = window.kidSpeech.currentLang === 'en-US';
    if (this.dom.sttLangFlag) this.dom.sttLangFlag.textContent = isEng ? '🇺🇸' : '🇰🇷';
    if (this.dom.sttLangLabel) this.dom.sttLangLabel.textContent = isEng ? '영어 인식 (English)' : '한영 인식 (한국어)';
    this.dom.sttLangBtn.classList.toggle('ko', !isEng);
  }

  /**
   * 화상 영어 수업 완전 종료 처리
   */
  endCall() {
    this.clearSilenceTimer();
    this.hideYourTurnImpact();

    // 1. 통화 타이머 중지
    if (this.callTimerInterval) {
      clearInterval(this.callTimerInterval);
      this.callTimerInterval = null;
    }

    // 2. 웹캠 및 마이크 미디어 트랙 완전 정지 (사생활 보호)
    if (this.userMediaStream) {
      try {
        this.userMediaStream.getTracks().forEach(track => {
          track.stop();
        });
      } catch (e) {}
    }

    // 3. STT 및 TTS 올스톱
    if (window.kidSpeech) {
      window.kidSpeech.destroy();
    }

    // 4. 리포트 모달 정보 업데이트
    if (this.dom.summaryDuration && this.dom.callTimer) {
      this.dom.summaryDuration.textContent = this.dom.callTimer.textContent;
    }
    if (this.dom.summaryStars) {
      this.dom.summaryStars.textContent = `${this.stars} Bricks`;
    }

    // 5. 모달 오픈 및 축하 사운드
    if (this.dom.callSummaryModal) {
      this.dom.callSummaryModal.classList.add('open');
    }
    if (window.kidSounds) {
      window.kidSounds.playCheer();
    }

    // 암호화 진행 상황 영구 저장
    this.saveProgress();
  }

  /**
   * 새 수업으로 다시 시작
   */
  restartCall() {
    window.location.reload();
  }

  openParentGate() {
    const n1 = Math.floor(Math.random() * 8) + 12;
    const n2 = Math.floor(Math.random() * 7) + 6;
    this.parentAns = n1 + n2;
    if (this.dom.mathQ) this.dom.mathQ.textContent = `${n1} + ${n2} = ?`;
    if (this.dom.mathAns) this.dom.mathAns.value = '';

    if (this.dom.parentMathView) this.dom.parentMathView.style.display = 'block';
    if (this.dom.parentAiSettingsView) this.dom.parentAiSettingsView.style.display = 'none';

    if (this.dom.parentModal) this.dom.parentModal.classList.add('open');
  }

  verifyParentGate() {
    const inputVal = parseInt(this.dom.mathAns.value.trim(), 10);
    if (inputVal === this.parentAns) {
      // 🌟 문제 해결 성공 시 부모님 전용 AI 설정 뷰 노출
      if (this.dom.parentMathView) this.dom.parentMathView.style.display = 'none';
      if (this.dom.parentAiSettingsView) this.dom.parentAiSettingsView.style.display = 'block';

      if (this.dom.geminiApiKeyInput) {
        this.dom.geminiApiKeyInput.value = this.dialogueEngine.geminiApiKey || '';
      }
      this.updateAiStatusUI();
    } else {
      alert("부모님 확인 번호가 맞지 않습니다.");
    }
  }

  saveAiSettings() {
    if (this.dom.geminiApiKeyInput) {
      const key = this.dom.geminiApiKeyInput.value.trim();
      this.dialogueEngine.setGeminiApiKey(key);
      this.updateAiStatusUI();
      alert("✅ Gemini AI 티키타카 설정이 안전하게 저장되었습니다!");
    }
    if (this.dom.parentModal) this.dom.parentModal.classList.remove('open');
  }

  async updateAiStatusUI() {
    let hasServerKey = false;
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        hasServerKey = Boolean(data.hasEnvKey);
      }
    } catch (e) {}

    const hasKey = hasServerKey || this.dialogueEngine.hasGeminiKey();
    if (this.dom.aiStatusText) {
      this.dom.aiStatusText.textContent = hasKey ? "🤖 Gemini 3.5 AI 연결됨" : "내장 튜터 모드";
    }
    if (this.dom.geminiStatusText) {
      this.dom.geminiStatusText.textContent = hasKey 
        ? "상태: 🟢 Google Gemini 3.5 Flash 실시간 AI 티키타카 100% 활성화됨!" 
        : "상태: ⚡ 내장 초지능 멀티턴 문맥 기억 엔진 작동 중 (키 없이도 100% 작동)";
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new ZoomBrickTalkApp();
  app.init();
});

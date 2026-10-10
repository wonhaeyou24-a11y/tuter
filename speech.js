/**
 * 🎙️ 실시간 지능형 음성 대화 엔진 (speech.js)
 * - 아동 음성 인식(STT) 및 영어 원어민 음성 합성(TTS)
 * - 스피커 소리 재유입 방지 (Acoustic Echo Canceling / Mute Gate)
 * - 무음 노이즈 필터링 & 한국어/영어 동시 수용
 */

class KidSpeechEngine {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.synth = window.speechSynthesis;
    this.englishVoice = null;
    this.onResultCallback = null;
    this.onStatusChangeCallback = null;

    // 스피커 에코 방지용 상태 게이트
    this.isTutorSpeaking = false;
    this.speakerCooldownUntil = 0;
    this.lastTutorText = ''; // 브릭키가 마지막으로 말한 문장 (자기 소리 필터용)
    this.pausedForTTS = false; // TTS 중 마이크 완전 중단 여부

    // 🌟 시우의 생각 및 발화 호흡을 넉넉하게 기다려주는 버퍼 & 디바운스 타이머 (기본 3.2초)
    this.speechBuffer = '';
    this.speechEndTimer = null;
    this.speechEndDelayMs = parseInt(localStorage.getItem('bricktalk_wait_time') || '3200', 10); // 기본 3.2초 대기


    this.initVoices();
    this.initRecognition();
    this.unlockAudioOnFirstTouch();
  }

  /**
   * 🌟 iPadOS / iOS Safari 오디오 자동재생 언락 (첫 터치 시 Web Audio & TTS 활성화)
   */
  unlockAudioOnFirstTouch() {
    const unlock = () => {
      try {
        if (this.synth) {
          this.synth.resume();
          const u = new SpeechSynthesisUtterance(' ');
          u.volume = 0.01;
          this.synth.speak(u);
        }
        if (window.kidSounds) {
          window.kidSounds.getAudioContext();
        }
      } catch (e) {}
    };
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    window.addEventListener('click', unlock, { once: true, passive: true });
  }

  /**
   * 브라우저 고품질 영어 음성 탐색
   */
  initVoices() {
    try {
      const updateVoices = () => {
        if (!this.synth) return;
        const voices = this.synth.getVoices();
        this.englishVoice = voices.find(v => v.lang === 'en-US' && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny'))) ||
          voices.find(v => v.lang.startsWith('en')) ||
          null;
      };

      updateVoices();
      if (this.synth && this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = updateVoices;
      }
    } catch (e) {
      console.warn('[TTS 알림] 음성 로딩 대기:', e);
    }
  }

  /**
   * 음성 인식(STT) 초기화
   */
  initRecognition() {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.info('[STT 정보] 브라우저 내장 음성인식 미지원');
        return;
      }

      this.recognition = new SpeechRecognition();
      // 🌟 영어 화상 수업이므로 기본 영어 인식(en-US) 적용 (영어로 말하면 100% 영어 철자로 인식)
      this.currentLang = localStorage.getItem('bricktalk_stt_lang') || 'en-US';
      this.recognition.lang = this.currentLang;
      this.recognition.continuous = true;
      this.recognition.interimResults = true; // 실시간 발화 즉각 감지
      this.recognition.maxAlternatives = 3;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStatusChangeCallback) this.onStatusChangeCallback(true);
      };

      this.recognition.onend = () => {
        // 브릭키가 말하고 있지 않고 듣기 모드라면 자동 유지
        if (this.isListening && !this.isTutorSpeaking && !this.pausedForTTS) {
          try {
            this.recognition.start();
            return;
          } catch (e) {}
        }
        this.isListening = false;
        if (this.onStatusChangeCallback) this.onStatusChangeCallback(false);
      };

      this.recognition.onerror = (event) => {
        if (event.error === 'no-speech') return; // 단순 침묵은 정상 유지
        console.warn('[STT 알림]:', event.error);
        if (event.error === 'not-allowed') {
          this.isListening = false;
          if (this.onStatusChangeCallback) this.onStatusChangeCallback(false, 'not-allowed');
        }
      };

      this.recognition.onresult = (event) => {
        try {
          // 🛡️ 에코 캔슬 게이트 1: 브릭키가 말하고 있거나 쿨다운 중이면 스피커 소리이므로 무시!
          const now = Date.now();
          if (this.isTutorSpeaking || now < this.speakerCooldownUntil) {
            return;
          }

          let interimTranscript = '';
          let finalTranscript = '';
          const self = this;
          // 🛡️ 에코 게이트 2: 브릭키 문장과 단어가 50% 이상 겹치면 스피커 소리로 간주
          const isEcho = (t) => {
            const norm = (s) => (s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
            const a = norm(t);
            const b = new Set(norm(self.lastTutorText));
            if (a.length < 3 || b.size === 0) return false;
            return a.filter(w => b.has(w)).length / a.length >= 0.5;
          };

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (isEcho(interimTranscript + ' ' + finalTranscript)) return;

          // 실시간 중간 발화(Interim) 콜백 (시우가 말하고 있음을 화면에 즉시 반응)
          if (interimTranscript && this.onInterimCallback) {
            const cleanInterim = this.sanitizeInput(interimTranscript);
            if (cleanInterim.length > 0) {
              // 시우가 아직 말하는 중이므로 발화 완료 판정 보류 (타이머 리셋)
              if (this.speechEndTimer) {
                clearTimeout(this.speechEndTimer);
                this.speechEndTimer = null;
              }
              const preview = (this.speechBuffer ? this.speechBuffer + ' ' : '') + cleanInterim;
              this.onInterimCallback(preview);
            }
          }

          // 최종 확정 조각(Final) 처리 - 바로 끝내지 않고 누적 후 1.9초 대기
          if (finalTranscript) {
            const sanitized = this.sanitizeInput(finalTranscript);
            if (sanitized && sanitized.replace(/\s/g, '').length >= 1) {
              this.speechBuffer = (this.speechBuffer ? this.speechBuffer + ' ' : '') + sanitized;
              if (this.onInterimCallback) {
                this.onInterimCallback(this.speechBuffer);
              }
              // 🌟 핵심: 시우가 말을 완전히 끝마칠 때까지 1.9초간 숨 고르고 기다려줌!
              if (this.speechEndTimer) clearTimeout(this.speechEndTimer);
              this.speechEndTimer = setTimeout(() => {
                this.flushSpeechBuffer();
              }, this.speechEndDelayMs);
            }
          }
        } catch (err) {
          console.error('[STT 처리 오류]:', err);
        }
      };
    } catch (e) {
      console.warn('[STT 예외 차단]:', e);
    }
  }

  /**
   * 🌟 누적된 시우의 발화를 확정하고 튜터에게 전달
   */
  flushSpeechBuffer() {
    if (this.speechEndTimer) {
      clearTimeout(this.speechEndTimer);
      this.speechEndTimer = null;
    }
    const fullText = (this.speechBuffer || '').trim();
    this.speechBuffer = '';
    if (fullText.length >= 1 && this.onResultCallback) {
      this.onResultCallback(fullText);
    }
  }

  /**
   * 시우의 호흡에 맞춘 대기 시간 변경 (ms)
   */
  setSpeechWaitTime(ms) {
    this.speechEndDelayMs = Math.max(1500, Math.min(8000, ms));
    try { localStorage.setItem('bricktalk_wait_time', String(this.speechEndDelayMs)); } catch (e) {}
  }

  /**
   * 음성 인식 언어 변경 ('ko-KR' 또는 'en-US')
   */
  setLanguage(lang) {
    this.currentLang = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
    try { localStorage.setItem('bricktalk_stt_lang', lang); } catch (e) {}
  }

  /**
   * 입력 정제 (XSS 방지)
   */
  sanitizeInput(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/[<>'"&]/g, '').trim();
  }

  /**
   * 듣기 시작 (중간 실시간 발화 콜백 추가)
   */
  startListening(onResult, onStatus, onInterim = null) {
    this.onResultCallback = onResult;
    this.onStatusChangeCallback = onStatus;
    this.onInterimCallback = onInterim;

    if (!this.recognition) {
      if (onStatus) onStatus(false, 'unsupported');
      return false;
    }

    try {
      this.isListening = true;
      this.recognition.start();
      return true;
    } catch (e) {
      // 이미 시작 중이면 유지
      return true;
    }
  }

  /**
   * 듣기 중단
   */
  stopListening() {
    try {
      if (this.speechEndTimer) {
        clearTimeout(this.speechEndTimer);
        this.speechEndTimer = null;
      }
      this.speechBuffer = '';
      this.isListening = false;
      if (this.recognition) {
        this.recognition.stop();
      }
    } catch (e) {}
  }

  /**
   * 브릭키의 영어 음성 출력 (TTS) & 단어별 실시간 하이라이트
   * @param {string} text 출력할 영어 문장
   * @param {Function} onStart 발화 시작 콜백
   * @param {Function} onEnd 발화 종료 콜백
   * @param {Function} onWordBoundary 단어별 하이라이트 콜백 (단어 인덱스 전달)
   */
  speakTeddy(text, onStart, onEnd, onWordBoundary = null) {
    try {
      if (!this.synth) {
        if (onEnd) onEnd();
        return;
      }

      this.synth.cancel();

      // 스피커 에코 방지: 브릭키 발화 플래그 ON + 마이크 완전 중단
      this.isTutorSpeaking = true;
      if (this.speechEndTimer) {
        clearTimeout(this.speechEndTimer);
        this.speechEndTimer = null;
      }
      this.speechBuffer = '';
      const sanitizedText = this.sanitizeInput(text);
      this.lastTutorText = sanitizedText;
      this.pausedForTTS = true;
      try { if (this.recognition) this.recognition.abort(); } catch (e) {}
      const utterance = new SpeechSynthesisUtterance(sanitizedText);
      utterance.lang = 'en-US';
      utterance.rate = 0.88; // 7세 아동 맞춤 또박또박 속도
      utterance.pitch = 1.15; // 친절하고 밝은 톤

      if (this.englishVoice) {
        utterance.voice = this.englishVoice;
      }

      // 단어 분할 목록
      const words = sanitizedText.split(/\s+/).filter(w => w.length > 0);
      let boundaryFired = false;
      let timerFallbackInterval = null;

      utterance.onstart = () => {
        this.isTutorSpeaking = true;
        if (onStart) onStart();

        // 🌟 브라우저 onboundary 미지원 시 대비 폴백 타이머 (가라오케 하이라이트 보장)
        let currentWordIdx = 0;
        const estimatedIntervalMs = Math.max(280, Math.floor(2500 / Math.max(words.length, 1)));
        
        timerFallbackInterval = setInterval(() => {
          if (!boundaryFired && onWordBoundary && currentWordIdx < words.length) {
            onWordBoundary(currentWordIdx, words[currentWordIdx]);
            currentWordIdx++;
          }
        }, estimatedIntervalMs);
      };

      // 실시간 단어 경계 이벤트 지원
      utterance.onboundary = (event) => {
        boundaryFired = true;
        if (timerFallbackInterval) {
          clearInterval(timerFallbackInterval);
          timerFallbackInterval = null;
        }

        if (event.name === 'word' && onWordBoundary) {
          // charIndex 기반 단어 찾기
          const charIndex = event.charIndex || 0;
          const textUpToChar = sanitizedText.substring(0, charIndex);
          const currentWordIdx = (textUpToChar.match(/\s+/g) || []).length;
          onWordBoundary(currentWordIdx, words[currentWordIdx] || '');
        }
      };

      const finishSpeech = () => {
        if (timerFallbackInterval) {
          clearInterval(timerFallbackInterval);
          timerFallbackInterval = null;
        }
        this.isTutorSpeaking = false;
        this.pausedForTTS = false;
        // 발화 후 1.3초 동안 마이크 재유입 차단
        this.speakerCooldownUntil = Date.now() + 1300;
        if (onEnd) onEnd();
      };

      utterance.onend = finishSpeech;
      utterance.onerror = finishSpeech;

      this.synth.speak(utterance);
    } catch (e) {
      this.isTutorSpeaking = false;
      this.speakerCooldownUntil = Date.now() + 700;
      if (onEnd) onEnd();
    }
  }

  /**
   * 완전 종료 시 모든 오디오 및 리스너 해제
   */
  destroy() {
    this.stopListening();
    if (this.synth) {
      this.synth.cancel();
    }
    this.isListening = false;
    this.isTutorSpeaking = false;
  }
}

window.kidSpeech = new KidSpeechEngine();

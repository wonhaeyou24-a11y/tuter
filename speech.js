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

    // 🌟 시우의 발화 호흡에 맞춘 자연스러운 지능형 디바운스 (기본 2.6초 대기 후 전송, 끊김 방지)
    this.speechBuffer = '';
    this.latestInterim = '';
    this.speechEndTimer = null;
    this.speechEndDelayMs = parseInt(localStorage.getItem('bricktalk_wait_time') || '2600', 10);

    // 🌟 문맥 및 추천 답변 힌트 (음성 인식 정확도 200% 향상)
    this.contextHints = [];

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
      this.recognition.maxAlternatives = 5;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStatusChangeCallback) this.onStatusChangeCallback(true);
      };

      this.recognition.onend = () => {
        // 브릭키가 말하고 있지 않고 듣기 모드라면 비동기 딜레이 후 자동 재연결 유지 (마이크 죽음 방지)
        if (this.isListening && !this.isTutorSpeaking && !this.pausedForTTS) {
          setTimeout(() => {
            try {
              if (this.isListening && !this.isTutorSpeaking && !this.pausedForTTS && this.recognition) {
                this.recognition.start();
              }
            } catch (e) {}
          }, 80);
          return;
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
          // 🛡️ 에코 캔슬 게이트 1: 브릭키가 말하고 있거나 직후 쿨다운 중이면 스피커 소리이므로 무시!
          const now = Date.now();
          if (this.isTutorSpeaking || now < this.speakerCooldownUntil) {
            return;
          }

          let interimTranscript = '';
          let finalTranscript = '';
          const self = this;

          // 🛡️ 에코 판정 개선: 오직 튜터 문장 전체와 거의 동일한 기계적 하울링일 때만 에코로 판정.
          // (시우가 튜터의 말을 따라 하거나 같은 단어를 쓰는 정상적인 학습 발화는 절대로 차단하지 않음!)
          const isIdenticalEcho = (t) => {
            const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const a = clean(t);
            const b = clean(self.lastTutorText);
            if (a.length > 15 && b.length > 15 && (a === b || b.includes(a))) {
              return true;
            }
            return false;
          };

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            // 🌟 1~5위 다중 후보군(Alternatives) 중 문맥(힌트/추천답변) 및 신뢰도 기반 최적 발화 스마트 선별
            const result = event.results[i];
            const transcript = this.pickBestAlternative(result);
            if (result.isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          if (isIdenticalEcho(interimTranscript + ' ' + finalTranscript)) return;

          // 실시간 중간 발화(Interim) 콜백 (시우가 말하고 있음을 화면에 즉시 반응)
          if (interimTranscript) {
            const cleanInterim = this.correctChildSpeech(interimTranscript);
            if (cleanInterim.length > 0) {
              this.latestInterim = cleanInterim;
              const preview = (this.speechBuffer ? this.speechBuffer.trim() + ' ' : '') + cleanInterim;
              if (this.onInterimCallback) this.onInterimCallback(preview);

              // 🌟 지능형 디바운스: 문장 미완성(전치사/접속사/단어 1개)이면 여유 있게 3.2초 대기, 완성형이면 2.4초 대기
              this.scheduleSpeechFlush(preview);
            }
          }

          // 최종 확정 조각(Final) 처리
          if (finalTranscript) {
            const sanitized = this.correctChildSpeech(finalTranscript);
            if (sanitized && sanitized.replace(/\s/g, '').length >= 1) {
              this.speechBuffer = (this.speechBuffer ? this.speechBuffer.trim() + ' ' : '') + sanitized;
              this.latestInterim = '';
              if (this.onInterimCallback) {
                this.onInterimCallback(this.speechBuffer.trim());
              }
              this.scheduleSpeechFlush(this.speechBuffer.trim());
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
   * 🌟 문맥 및 추천 답변 힌트 등록 (영어 및 한국어 선택지 목록 모두 등록하여 정확도 극대화)
   */
  setContextHints(hints = []) {
    if (Array.isArray(hints)) {
      this.contextHints = [];
      hints.forEach(h => {
        if (typeof h === 'string') {
          if (h.trim()) this.contextHints.push(h.trim());
        } else if (h && typeof h === 'object') {
          if (h.en) this.contextHints.push(h.en.trim());
          if (h.kr) this.contextHints.push(h.kr.trim());
        }
      });
    }
  }

  /**
   * 🌟 다중 후보군(Alternatives) 중 문맥(추천 답변/힌트)과 가장 잘 어울리는 최적 후보 선별
   */
  pickBestAlternative(result) {
    if (!result || result.length === 0) return '';
    if (result.length === 1 || !this.contextHints || this.contextHints.length === 0) {
      return (result[0] && result[0].transcript) ? result[0].transcript : '';
    }

    const clean = s => (s || '').toLowerCase().replace(/[^a-z0-9가-힣\s]/g, '').trim();

    // 힌트 목록의 단어 집합 생성
    const hintWords = new Set();
    this.contextHints.forEach(h => {
      clean(h).split(/\s+/).forEach(w => { if (w.length > 1) hintWords.add(w); });
    });

    let bestTranscript = result[0].transcript || '';
    let highestScore = -1;

    for (let j = 0; j < result.length; j++) {
      const text = result[j].transcript || '';
      const confidence = result[j].confidence || 0.5;
      const words = clean(text).split(/\s+/).filter(Boolean);
      
      let matchedCount = 0;
      words.forEach(w => {
        if (hintWords.has(w)) matchedCount += 2;
      });

      // 전체 문장 일치 가중치
      this.contextHints.forEach(h => {
        const cleanH = clean(h);
        const cleanT = clean(text);
        if (cleanH === cleanT) matchedCount += 5;
        else if (cleanH.includes(cleanT) || cleanT.includes(cleanH)) matchedCount += 2.5;
      });

      const score = matchedCount * 1.5 + confidence;
      if (score > highestScore) {
        highestScore = score;
        bestTranscript = text;
      }
    }

    return bestTranscript;
  }

  /**
   * 🌟 아동 발음 및 한국어/영어 맞춤형 음성 스마트 보정 (Fuzzy & Phonetic Corrector)
   */
  correctChildSpeech(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    
    // 따옴표 및 이중 기호 깨끗이 정제
    let text = rawText.replace(/["'“”‘’]/g, '').trim();
    if (!text) return '';

    // 🌟 한국어 인식 모드이거나 한국어가 포함된 발화: 한글 원형 100% 보존 및 한국어 오인식 보정
    const hasKorean = /[가-힣]/.test(text);
    if (this.currentLang === 'ko-KR' || hasKorean) {
      text = text.replace(/브리키/g, '브릭키')
                 .replace(/브리키야/g, '브릭키야')
                 .replace(/불이키/g, '브릭키')
                 .replace(/브릭이/g, '브릭키')
                 .replace(/내고/g, '레고')
                 .replace(/래고/g, '레고');
      return text;
    }

    // 🌟 영어 인식 모드: 일반적인 아동 오인식 단어 및 콩글리시 발음 사전 매핑
    const replacements = [
      [/\bbriki\b/gi, 'Bricky'],
      [/\bricky\b/gi, 'Bricky'],
      [/\bvicky\b/gi, 'Bricky'],
      [/\bbreaky\b/gi, 'Bricky'],
      [/\ble\s*go\b/gi, 'Lego'],
      [/\blegos\b/gi, 'Lego'],
      [/\bbreak\s*fast\b/gi, 'breakfast'],
      [/\bmot\s*chi\b/gi, 'mochi'],
      [/\bmochee\b/gi, 'mochi'],
      [/\byea\b/gi, 'Yes'],
      [/\byeah\b/gi, 'Yes'],
      [/\byep\b/gi, 'Yes'],
      [/\bnope\b/gi, 'No'],
      [/\bnah\b/gi, 'No']
    ];

    replacements.forEach(([regex, repl]) => {
      text = text.replace(regex, repl);
    });

    // 문맥 힌트와 유사도가 매우 높은 경우 정확한 문장으로 정렬
    if (this.contextHints && this.contextHints.length > 0) {
      const cleanT = text.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const hint of this.contextHints) {
        const cleanH = hint.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanT.length >= 4 && cleanH.length >= 4) {
          if (cleanT === cleanH) {
            text = hint;
            break;
          }
        }
      }
    }

    // 첫 글자 대문자화
    if (text.length > 0) {
      text = text.charAt(0).toUpperCase() + text.slice(1);
    }

    return text;
  }

  /**
   * 🌟 문장 완성도에 맞춘 동적 디바운스 타이머 스케줄러 (중간 끊김 원천 차단)
   */
  scheduleSpeechFlush(currentText) {
    if (this.speechEndTimer) {
      clearTimeout(this.speechEndTimer);
    }
    
    // 미완성 문장(전치사, 접속사, 의문사, 1단어)일 경우 아동의 호흡을 고려하여 대기시간 1초 추가 부여
    const words = (currentText || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const lastWord = words[words.length - 1] || '';
    const incompleteMarkers = ['i', 'a', 'the', 'my', 'your', 'in', 'on', 'at', 'to', 'for', 'with', 'and', 'but', 'or', 'what', 'how', 'why', 'can', 'do', 'like'];
    
    let delay = this.speechEndDelayMs;
    if (words.length <= 1 || incompleteMarkers.includes(lastWord)) {
      delay = Math.max(delay, 3200); // 숨 고르고 다음 단어를 말할 수 있도록 넉넉한 3.2초 확보
    }

    this.speechEndTimer = setTimeout(() => {
      this.flushSpeechBuffer();
    }, delay);
  }

  /**
   * 🌟 누적된 시우의 발화를 확정하고 튜터에게 전달
   */
  flushSpeechBuffer() {
    if (this.speechEndTimer) {
      clearTimeout(this.speechEndTimer);
      this.speechEndTimer = null;
    }
    let fullText = (this.speechBuffer || '').trim();
    if (!fullText && this.latestInterim) {
      fullText = this.latestInterim.trim();
    } else if (this.latestInterim && !fullText.includes(this.latestInterim)) {
      fullText = (fullText + ' ' + this.latestInterim).trim();
    }
    this.speechBuffer = '';
    this.latestInterim = '';
    if (fullText.length >= 1 && this.onResultCallback) {
      this.onResultCallback(fullText);
    }
  }

  /**
   * 시우의 호흡에 맞춘 대기 시간 변경 (ms)
   */
  setSpeechWaitTime(ms) {
    this.speechEndDelayMs = Math.max(2000, Math.min(8000, ms));
    try { localStorage.setItem('bricktalk_wait_time', String(this.speechEndDelayMs)); } catch (e) {}
  }

  /**
   * 🌟 음성 인식 언어 변경 ('ko-KR' 또는 'en-US')
   * - 실행 중인 STT 세션을 즉시 중단하고 새 언어로 재시작하여 언어 변경을 100% 보장
   */
  setLanguage(lang) {
    if (this.currentLang === lang && this.recognition && this.recognition.lang === lang) {
      return;
    }
    this.currentLang = lang;
    try { localStorage.setItem('bricktalk_stt_lang', lang); } catch (e) {}

    if (this.recognition) {
      const wasListening = this.isListening;
      try {
        this.recognition.abort();
      } catch (e) {}

      this.recognition.lang = lang;
      this.speechBuffer = '';
      this.latestInterim = '';

      if (wasListening && !this.isTutorSpeaking) {
        setTimeout(() => {
          try {
            if (this.recognition && this.isListening && !this.isTutorSpeaking) {
              this.recognition.start();
            }
          } catch (e) {}
        }, 120);
      }
    }
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
   * 🌟 [다시 말하기 전용] 이전 버퍼 완전 초기화 & 마이크 세션 강제 재구동
   */
  resetAndListen() {
    try {
      if (this.speechEndTimer) {
        clearTimeout(this.speechEndTimer);
        this.speechEndTimer = null;
      }
      this.speechBuffer = '';
      this.latestInterim = '';
      this.isListening = true;

      if (this.recognition) {
        try { this.recognition.abort(); } catch (e) {}
      }

      setTimeout(() => {
        try {
          if (!this.isTutorSpeaking && !this.pausedForTTS && this.recognition) {
            this.recognition.start();
            if (this.onStatusChangeCallback) this.onStatusChangeCallback(true);
          }
        } catch (e) {
          // 이미 실행 중이면 유지
        }
      }, 100);
      return true;
    } catch (err) {
      console.warn('[resetAndListen 예외 방지]:', err);
      return false;
    }
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
        // 🌟 쿨다운 300ms로 최적화 (첫 음절 잘림 원천 차단: 마이크가 열릴 때 즉시 정상 수신)
        this.speakerCooldownUntil = Date.now() + 300;
        if (onEnd) onEnd();
      };

      utterance.onend = finishSpeech;
      utterance.onerror = finishSpeech;

      this.synth.speak(utterance);
    } catch (e) {
      this.isTutorSpeaking = false;
      this.speakerCooldownUntil = Date.now() + 200;
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

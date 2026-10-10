/**
 * 🎵 유아 친화적 Web Audio 사운드 신디사이저 엔진 (sound.js)
 * - 외부 오디오 파일 다운로드 의존성 없이 100% 내장 Web Audio API로 풍부한 효과음 합성
 * - 제로 크래시(Zero-Crash): 오디오 컨텍스트 자동 재개 및 오류 차단
 */

class KidSoundEffects {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  /**
   * 오디오 컨텍스트를 지연 초기화합니다.
   * 브라우저의 오토플레이 정책(User-Gesture Required)에 대응합니다.
   */
  getAudioContext() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch (e) {
      console.warn('[오디오 알림] AudioContext 초기화 대기:', e);
      return null;
    }
  }

  /**
   * 젤리 버튼을 눌렀을 때 통통 튀는 젤리 팝(Pop) 소리
   */
  playPop() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;
      // 피치가 빠르게 올라가며 퐁! 하는 느낌
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn('사운드 재생 에러:', e);
    }
  }

  /**
   * 별 스티커 획득 시 반짝반짝 퐁퐁 효과음
   */
  playStarSparkle() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // 도, 미, 솔, 높은 도

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        const noteTime = now + (idx * 0.07);

        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.25, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.25);
      });
    } catch (e) {
      console.warn('별 사운드 에러:', e);
    }
  }

  /**
   * 칭찬 팡파레 (Great Job!)
   */
  playCheer() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const chords = [
        { f: 587.33, t: 0.00 }, // 레
        { f: 739.99, t: 0.08 }, // 파#
        { f: 880.00, t: 0.16 }, // 라
        { f: 1174.66, t: 0.26 } // 높은 레
      ];

      chords.forEach(c => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        const start = now + c.t;

        osc.frequency.setValueAtTime(c.f, start);

        gain.gain.setValueAtTime(0.28, start);
        gain.gain.exponentialRampToValueAtTime(0.005, start + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.35);
      });
    } catch (e) {
      console.warn('팡파레 에러:', e);
    }
  }

  /**
   * 동물 울음 힌트 사운드 (사자 어흥 표현을 위한 저주파 그르렁 효과)
   */
  playRoar() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(75, now + 0.3);
      osc.frequency.linearRampToValueAtTime(50, now + 0.6);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch (e) {
      console.warn('사자 사운드 에러:', e);
    }
  }

  /**
   * 음소거 토글
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

window.kidSounds = new KidSoundEffects();

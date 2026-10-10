/**
 * 🔒 암호화 체크포인트 저장소 모듈 (crypto.js)
 * - 규격: Web Crypto API 표준 AES-256-GCM 암호화
 * - 역할: 7세 아이의 학습 데이터, 별 개수, 세션 기록을 안전하게 암호화하여 로컬에 보관
 * - 원칙: 단 하나의 개인정보나 세션도 평문으로 저장하지 않음 (Zero-Trust Security)
 */

class SecureStorage {
  constructor() {
    this.keyStorageName = '_teddy_sec_vault_k';
    this.cryptoKey = null;
  }

  /**
   * 암호화 키를 생성하거나 복원합니다.
   * 안전한 브라우저 세션 키 관리 원칙을 준수합니다.
   */
  async init() {
    try {
      let rawKey = window.sessionStorage.getItem(this.keyStorageName);
      if (!rawKey) {
        // 암호학적으로 안전한 256비트(32바이트) 랜덤 키 생성
        const keyBytes = new Uint8Array(32);
        window.crypto.getRandomValues(keyBytes);
        rawKey = Array.from(keyBytes, byte => ('0' + byte.toString(16)).slice(-2)).join('');
        window.sessionStorage.setItem(this.keyStorageName, rawKey);
      }

      // 키 바이트 파싱
      const keyBuffer = new Uint8Array(rawKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      this.cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );

      // 사용한 메모리 버퍼 즉시 영식화(Zero-out)
      keyBuffer.fill(0);
      return true;
    } catch (error) {
      console.error('[보안 오류] 암호화 키 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 객체 또는 데이터를 AES-256-GCM으로 암호화하여 로컬 스토리지에 저장합니다.
   * @param {string} storageKey 저장할 키 이름
   * @param {any} value 저장할 데이터
   */
  async setEncryptedItem(storageKey, value) {
    try {
      if (!this.cryptoKey) await this.init();

      const jsonStr = JSON.stringify(value);
      const encoder = new TextEncoder();
      const plaintextBuffer = encoder.encode(jsonStr);

      // 매 암호화마다 유니크한 12바이트 IV(초기화 벡터) 생성
      const iv = new Uint8Array(12);
      window.crypto.getRandomValues(iv);

      const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        this.cryptoKey,
        plaintextBuffer
      );

      // IV + 암호문(Base64 인코딩) 결합 저장
      const ivArr = Array.from(iv);
      const cipherArr = Array.from(new Uint8Array(ciphertext));
      const payload = JSON.stringify({
        iv: ivArr,
        data: cipherArr,
        timestamp: Date.now()
      });

      window.localStorage.setItem(`_enc_${storageKey}`, btoa(payload));
      return true;
    } catch (error) {
      console.error('[보안 오류] 데이터 암호화 실패:', error);
      return false;
    }
  }

  /**
   * 로컬 스토리지에서 암호화된 데이터를 읽어 복호화합니다.
   * @param {string} storageKey 읽어올 키 이름
   * @param {any} defaultValue 기본값
   */
  async getDecryptedItem(storageKey, defaultValue = null) {
    try {
      if (!this.cryptoKey) await this.init();

      const rawBase64 = window.localStorage.getItem(`_enc_${storageKey}`);
      if (!rawBase64) return defaultValue;

      const payload = JSON.parse(atob(rawBase64));
      const iv = new Uint8Array(payload.iv);
      const dataBuffer = new Uint8Array(payload.data);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        this.cryptoKey,
        dataBuffer
      );

      const decoder = new TextDecoder();
      const decryptedStr = decoder.decode(decryptedBuffer);
      return JSON.parse(decryptedStr);
    } catch (error) {
      console.warn('[보안 알림] 암호문 복호화 실패 또는 초기 세션:', error);
      return defaultValue;
    }
  }
}

// 전역 싱글턴 보안 저장소 인스턴스
window.secureStorage = new SecureStorage();

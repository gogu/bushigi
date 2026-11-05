import * as wanakana from 'wanakana';

export interface AnswerCheckResult {
  isCorrect: boolean;
  normalizedUserHira: string;
  matchedReading: string;
}

function normalizeString(str: string): string {
  return str
    .trim()
    .replace(/[\s　。、！？!?・「」『』【】（）()]/g, '')
    // Full-width digits to half-width
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/,/g, '');
}

/**
 * Evaluates whether user input (via keyboard or voice recognition) matches
 * the expected Japanese readings.
 */
export function evaluateJapaneseAnswer(
  rawInput: string,
  expectedReadings: string[],
  targetDisplayVariants: string[] = [],
  isVoiceInput: boolean = false
): AnswerCheckResult {
  const cleaned = normalizeString(rawInput);
  if (!cleaned) {
    return {
      isCorrect: false,
      normalizedUserHira: '',
      matchedReading: expectedReadings[0] || '',
    };
  }

  // Convert Romaji or Katakana to Hiragana
  const userHira = normalizeString(wanakana.toHiragana(cleaned));

  for (const reading of expectedReadings) {
    const targetHira = normalizeString(wanakana.toHiragana(reading));
    if (userHira === targetHira || cleaned.toLowerCase() === normalizeString(wanakana.toRomaji(targetHira)).toLowerCase()) {
      return {
        isCorrect: true,
        normalizedUserHira: userHira,
        matchedReading: reading,
      };
    }
    // In voice mode, user might say a polite suffix around the phrase like "3杯です"
    if (isVoiceInput && userHira.includes(targetHira) && targetHira.length >= 2) {
      return {
        isCorrect: true,
        normalizedUserHira: userHira,
        matchedReading: reading,
      };
    }
  }

  // Browser SpeechRecognition (ja-JP) often converts spoken numbers/counters into Kanji/Digits (e.g., "300円", "3杯", "4月20日")
  if (isVoiceInput) {
    for (const variant of targetDisplayVariants) {
      const normVariant = normalizeString(variant);
      if (normVariant && (cleaned === normVariant || cleaned.includes(normVariant))) {
        return {
          isCorrect: true,
          normalizedUserHira: expectedReadings[0] || userHira,
          matchedReading: expectedReadings[0] || '',
        };
      }
    }
  }

  return {
    isCorrect: false,
    normalizedUserHira: userHira,
    matchedReading: expectedReadings[0] || '',
  };
}

// Browser SpeechRecognition wrapper
export interface SpeechRecognizerCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMsg: string) => void;
  onEnd?: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export class JapaneseSpeechRecognizer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;
  private isListening = false;

  constructor(private callbacks: SpeechRecognizerCallbacks) {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.lang = 'ja-JP';
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 5;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.callbacks.onStart?.();
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.recognition.onresult = (event: any) => {
        let bestTranscript = '';
        let isFinal = false;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          bestTranscript += res[0].transcript;
          if (res.isFinal) isFinal = true;
        }
        this.callbacks.onResult?.(bestTranscript, isFinal);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        const code = event?.error || 'unknown';
        let msg = '音声認識エラーが発生しました';
        if (code === 'not-allowed') msg = 'マイクの権限が許可されていません（浏览器麦克风权限未开启）';
        else if (code === 'no-speech') msg = '音声が検出されませんでした（未检测到语音，请再试一次）';
        this.callbacks.onError?.(msg);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.callbacks.onEnd?.();
      };
    }
  }

  public start() {
    if (!this.recognition) {
      this.callbacks.onError?.('お使いのブラウザは音声認識に対応していません（建议使用 Chrome / Edge 浏览器）');
      return;
    }
    if (this.isListening) {
      this.stop();
      return;
    }
    try {
      this.recognition.start();
    } catch {
      // Already started
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
  }
}


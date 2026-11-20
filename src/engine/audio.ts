// Procedural Web Audio API Game Sound Engine + Japanese TTS (Web Speech API)

class GameAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    try {
      const saved = localStorage.getItem('bushigi_sound_enabled');
      if (saved !== null) {
        this.enabled = JSON.parse(saved);
      }
    } catch {
      this.enabled = true;
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    try {
      localStorage.setItem('bushigi_sound_enabled', JSON.stringify(val));
    } catch {
      // ignore storage error
    }
  }

  // Soft wooden cursor hover tick
  public playHover() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.035);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Tactile mechanical button press
  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.06);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Cash register "Chariin!" (チャリーン♪)
  public playCashRegister() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startTime = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.11, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  // Correct answer chime + combo pitch boost
  public playSuccess(combo: number = 1) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const boost = Math.min(combo - 1, 8) * 35;
    const freqs = [587.33 + boost, 880 + boost, 1174.66 + boost]; // D5, A5, D6
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + i * 0.07;
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.35);
    });
  }

  // Wrong answer gentle game buzzer (ブーッ)
  public playError() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.12].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(195, now + offset);
      osc.frequency.linearRampToValueAtTime(155, now + offset + 0.1);
      gain.gain.setValueAtTime(0.09, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });
  }

  // Scroll / Page flip sound
  public playPageFlip() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }
}

export const gameAudio = new GameAudioEngine();

// Japanese Text-To-Speech helper using Web Speech API with strict Japanese voice validation
// and automatic HTML5 Audio fallback (prevents silent kana or Mandarin Chinese voice fallback)

const RELIABLE_JP_VOICE_NAMES = [
  'Nanami',
  'Keita',
  'Haruka',
  'Ayumi',
  'Ichiro',
  'Sayaka',
  'Kyoko',
  'O-Ren',
  'Hattori',
  'Microsoft',
];

let cachedJpVoice: SpeechSynthesisVoice | null = null;
let voicesInitialized = false;
let preferOnlineTts = false;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeAudio: HTMLAudioElement | null = null;
let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
let onlineAudioTimer: ReturnType<typeof setTimeout> | null = null;
let speechRequestId = 0;

function pickBestJapaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  try {
    const voices = window.speechSynthesis.getVoices() || [];
    const jpVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('ja'));
    if (jpVoices.length === 0) return null;

    const hasReliableName = (v: SpeechSynthesisVoice) =>
      RELIABLE_JP_VOICE_NAMES.some((name) => v.name.includes(name));

    return (
      jpVoices.find((v) => v.localService && hasReliableName(v)) ||
      jpVoices.find((v) => v.localService) ||
      jpVoices.find((v) => hasReliableName(v)) ||
      jpVoices[0] ||
      null
    );
  } catch {
    return null;
  }
}

function initJapaneseVoices() {
  if (voicesInitialized || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  voicesInitialized = true;
  try {
    cachedJpVoice = pickBestJapaneseVoice();
    const synth = window.speechSynthesis;
    const handleVoicesChanged = () => {
      cachedJpVoice = pickBestJapaneseVoice();
    };
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', handleVoicesChanged);
    } else {
      synth.onvoiceschanged = handleVoicesChanged;
    }
  } catch {
    // ignore environments with partial speechSynthesis
  }
}

initJapaneseVoices();

export function stopJapaneseSpeech() {
  speechRequestId += 1;
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
  if (onlineAudioTimer) {
    clearTimeout(onlineAudioTimer);
    onlineAudioTimer = null;
  }
  activeUtterance = null;

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  if (activeAudio) {
    try {
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.onplaying = null;
      activeAudio.onloadedmetadata = null;
      activeAudio.pause();
      activeAudio.src = '';
    } catch {
      // ignore
    }
    activeAudio = null;
  }
}

export function buildOnlineTtsUrls(text: string, rate: number): string[] {
  const isSentence = text.length > 8 || /[。、！？!?]/.test(text);
  const noPunct = text.replace(/[。、！？!?・「」『』（）()]/g, ' ').replace(/\s+/g, ' ').trim();
  const baiduSpd = rate < 0.8 ? 3 : 5;
  const encodedFull = encodeURIComponent(text);
  const encodedClean = encodeURIComponent(noPunct || text);

  if (isSentence) {
    return [
      `https://fanyi.baidu.com/gettts?lan=jp&text=${encodedFull}&spd=${baiduSpd}&source=web`,
      `https://dict.youdao.com/dictvoice?audio=${encodedClean}&le=jap`,
      `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodedFull}`,
    ];
  }

  return [
    `https://dict.youdao.com/dictvoice?audio=${encodedFull}&le=jap`,
    `https://fanyi.baidu.com/gettts?lan=jp&text=${encodedFull}&spd=${baiduSpd}&source=web`,
    `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodedFull}`,
  ];
}

function playOnlineJapaneseAudio(
  text: string,
  rate: number,
  reqId: number,
  onEnd?: () => void
): boolean {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    onEnd?.();
    return false;
  }

  const urls = buildOnlineTtsUrls(text, rate);
  const clampedRate = Math.max(0.5, Math.min(1.5, rate));

  const tryPlayAt = (idx: number) => {
    if (reqId !== speechRequestId) return;
    if (onlineAudioTimer) {
      clearTimeout(onlineAudioTimer);
      onlineAudioTimer = null;
    }
    if (idx >= urls.length) {
      onEnd?.();
      return;
    }

    const audio = new Audio(urls[idx]);
    audio.setAttribute('referrerpolicy', 'no-referrer');
    audio.playbackRate = clampedRate;
    activeAudio = audio;

    let advanced = false;
    let playingStarted = false;

    const cleanupAudio = () => {
      if (onlineAudioTimer) {
        clearTimeout(onlineAudioTimer);
        onlineAudioTimer = null;
      }
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;
      audio.onloadedmetadata = null;
    };

    const fallbackNext = () => {
      if (advanced || reqId !== speechRequestId) return;
      advanced = true;
      cleanupAudio();
      try {
        audio.pause();
        audio.src = '';
      } catch {
        // ignore
      }
      tryPlayAt(idx + 1);
    };

    onlineAudioTimer = setTimeout(() => {
      if (!playingStarted && reqId === speechRequestId) {
        fallbackNext();
      }
    }, 2500);

    audio.onloadedmetadata = () => {
      if (reqId !== speechRequestId) return;
      audio.playbackRate = clampedRate;
      if (Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration < 0.25 && text.length >= 6) {
        fallbackNext();
      }
    };

    audio.onplaying = () => {
      if (reqId !== speechRequestId) return;
      playingStarted = true;
      if (onlineAudioTimer) {
        clearTimeout(onlineAudioTimer);
        onlineAudioTimer = null;
      }
      audio.playbackRate = clampedRate;
    };

    audio.onended = () => {
      if (reqId !== speechRequestId) return;
      cleanupAudio();
      if (!playingStarted || (Number.isFinite(audio.duration) && audio.duration < 0.25 && text.length >= 6)) {
        tryPlayAt(idx + 1);
        return;
      }
      activeAudio = null;
      onEnd?.();
    };
    audio.onerror = fallbackNext;

    try {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          fallbackNext();
        });
      }
    } catch {
      fallbackNext();
    }
  };

  tryPlayAt(0);
  return true;
}

export function speakJapanese(text: string, rate: number = 0.95, onEnd?: () => void): boolean {
  const cleanText = text.trim();
  if (!cleanText || typeof window === 'undefined') {
    onEnd?.();
    return false;
  }

  stopJapaneseSpeech();
  const reqId = speechRequestId;
  initJapaneseVoices();

  const jpVoice = cachedJpVoice || pickBestJapaneseVoice();
  if (jpVoice) {
    cachedJpVoice = jpVoice;
  }

  // If no genuine Japanese voice exists (or Web Speech failed earlier), skip directly to online Japanese TTS
  if (preferOnlineTts || !jpVoice || !('speechSynthesis' in window)) {
    return playOnlineJapaneseAudio(cleanText, rate, reqId, onEnd);
  }

  try {
    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = jpVoice.lang || 'ja-JP';
    utter.voice = jpVoice;
    utter.rate = rate;
    utter.pitch = 1.05;
    activeUtterance = utter;

    let started = false;
    let settled = false;

    const triggerFallback = () => {
      if (settled || reqId !== speechRequestId) return;
      settled = true;
      preferOnlineTts = true;
      activeUtterance = null;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      playOnlineJapaneseAudio(cleanText, rate, reqId, onEnd);
    };

    watchdogTimer = setTimeout(() => {
      if (!started && reqId === speechRequestId) {
        triggerFallback();
      }
    }, 1200);

    utter.onstart = () => {
      started = true;
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
    };

    utter.onend = () => {
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
      if (settled || reqId !== speechRequestId) return;
      settled = true;
      activeUtterance = null;
      onEnd?.();
    };

    utter.onerror = (event) => {
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
      if (settled || reqId !== speechRequestId) return;
      const errCode = event?.error;
      if (errCode === 'interrupted' || errCode === 'canceled') {
        settled = true;
        activeUtterance = null;
        return;
      }
      if (!started) {
        triggerFallback();
      } else {
        settled = true;
        activeUtterance = null;
        onEnd?.();
      }
    };

    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return playOnlineJapaneseAudio(cleanText, rate, reqId, onEnd);
  }
}


// ============================================================
// CANTEENBITE – SOUND UTILITIES
// ============================================================
// HOW TO USE YOUR OWN SOUND FILES:
//
// 1. Place your audio files in src/assets/sounds/
//    Supported formats: mp3, wav, ogg, aac
//
// 2. Update the imports below:
//    import orderReadySound from '../assets/sounds/order_ready.mp3';
//    import newOrderSound   from '../assets/sounds/new_order.mp3';
//
// 3. Set USE_CUSTOM_SOUNDS = true
//
// If USE_CUSTOM_SOUNDS = false, the app uses generated tones instead.
// ============================================================

// ── CONFIGURATION ─────────────────────────────────────────
const USE_CUSTOM_SOUNDS = false; // set to true after adding your files

// Uncomment these lines and update filenames once you add your files:
// import orderReadySoundFile from '../assets/sounds/order_ready.mp3';
// import newOrderSoundFile   from '../assets/sounds/new_order.mp3';

const orderReadySoundFile = null; // replace null with import above
const newOrderSoundFile   = null; // replace null with import above
// ──────────────────────────────────────────────────────────

// Play a sound file using HTML5 Audio
const playAudioFile = (src, volume = 1.0) => {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(src);
      audio.volume = volume;
      audio.onended = resolve;
      audio.onerror = resolve; // resolve even on error so app doesn't hang
      audio.play().catch(resolve);
    } catch (e) {
      resolve();
    }
  });
};

// ── Web Audio fallback ─────────────────────────────────────
let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
};

const addCompressor = (ctx) => {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.setValueAtTime(-6, ctx.currentTime);
  comp.knee.setValueAtTime(3, ctx.currentTime);
  comp.ratio.setValueAtTime(10, ctx.currentTime);
  comp.attack.setValueAtTime(0, ctx.currentTime);
  comp.release.setValueAtTime(0.1, ctx.currentTime);
  comp.connect(ctx.destination);
  return comp;
};

const note = (ctx, dest, freq, start, duration, vol = 1.0, type = 'sine') => {
  try {
    // Guard against non-finite values which crash Web Audio API
    if (!isFinite(freq) || !isFinite(start) || !isFinite(duration) || !isFinite(vol)) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(dest);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, vol), start + 0.008);
    gain.gain.setValueAtTime(Math.max(0.0001, vol), start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  } catch (e) {}
};

const playGeneratedOrderReady = async () => {
  const ctx  = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  const comp = addCompressor(ctx);
  const now  = ctx.currentTime;
  note(ctx, comp, 392,  now,        0.55, 0.9, 'sine');
  note(ctx, comp, 392,  now,        0.55, 0.45, 'triangle');
  note(ctx, comp, 494,  now + 0.22, 0.50, 0.9, 'sine');
  note(ctx, comp, 494,  now + 0.22, 0.45, 'triangle');
  note(ctx, comp, 587,  now + 0.44, 0.50, 0.9, 'sine');
  note(ctx, comp, 587,  now + 0.44, 0.45, 'triangle');
  note(ctx, comp, 784,  now + 0.66, 0.85, 0.9, 'sine');
  note(ctx, comp, 784,  now + 0.66, 0.45, 'triangle');
};

const playGeneratedNewOrder = async () => {
  const ctx  = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  const comp = addCompressor(ctx);
  const now  = ctx.currentTime;
  note(ctx, comp, 1400, now,        0.12, 1.0, 'square');
  note(ctx, comp, 1400, now,        0.12, 0.5, 'sine');
  note(ctx, comp, 1400, now + 0.17, 0.12, 1.0, 'square');
  note(ctx, comp, 1400, now + 0.17, 0.12, 0.5, 'sine');
  note(ctx, comp, 1100, now + 0.42, 0.30, 1.0, 'square');
  note(ctx, comp, 1100, now + 0.42, 0.30, 0.5, 'sine');
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(comp);
  osc.type = 'square';
  osc.frequency.setValueAtTime(900,  now + 0.80);
  osc.frequency.linearRampToValueAtTime(1300, now + 1.00);
  gain.gain.setValueAtTime(0,   now + 0.80);
  gain.gain.linearRampToValueAtTime(0.8, now + 0.81);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);
  osc.start(now + 0.80);
  osc.stop(now + 1.10);
};

// ── PUBLIC API ─────────────────────────────────────────────

// Student sound — plays when order becomes Ready
export const playOrderReadySound = async () => {
  try {
    if (USE_CUSTOM_SOUNDS && orderReadySoundFile) {
      await playAudioFile(orderReadySoundFile, 1.0);
    } else {
      await playGeneratedOrderReady();
    }
  } catch (e) { console.warn('Sound failed:', e); }
};

// Manager sound — plays when new order is placed
export const playNewOrderSound = async () => {
  try {
    if (USE_CUSTOM_SOUNDS && newOrderSoundFile) {
      await playAudioFile(newOrderSoundFile, 1.0);
    } else {
      await playGeneratedNewOrder();
    }
  } catch (e) { console.warn('Sound failed:', e); }
};

// Unlock AudioContext — call this on any user interaction
export const unlockAudio = async () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    await ctx.close();
    audioCtx = null; // reset so next getAudioContext() gets a fresh one
  } catch (e) {}
};

// Notification helpers
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
};

export const showNotification = (title, body, tag = 'canteenbite') => {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/favicon.svg', tag });
  } catch (e) {}
};

/**
 * AlgoVerse Audio Synthesizer (Web Audio API)
 * Rebuilt from scratch with programmatically generated tones (100% offline, zero external files).
 *
 * Core Architecture:
 * 1. Single shared AudioContext for the entire application, created/resumed strictly on user gesture.
 * 2. One central reusable tone generator: playTone(frequency, duration, type, volume, delay).
 * 3. Five distinct sounds:
 *    - Comparison: short, soft, low beep (200-340Hz sine).
 *    - Swap: slightly higher-pitched, punchier pop (580Hz triangle).
 *    - Node visited: clean, short ping (784-1175Hz sine).
 *    - Complete / Search found: brief 3-note ascending chime (C5-E5-G5 triangle).
 *    - Reset: low, short thud tone (110Hz sine).
 * 4. Mute toggle with instant sound cutoff mid-animation and session persistence.
 * 5. Full console logging of AudioContext state to assist diagnostics.
 */

class AlgoSound {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.activeOscillators = new Set();
    this.isMuted = false;

    // Restore mute preference from sessionStorage (default to unmuted: false)
    try {
      const saved = sessionStorage.getItem('algoverse_muted');
      if (saved !== null) {
        this.isMuted = (saved === 'true');
      }
    } catch (e) {
      this.isMuted = false;
    }

    console.log(`[AlgoSound] Engine created. State: ${this.isMuted ? 'MUTED' : 'UNMUTED'}. Awaiting user gesture to initialize AudioContext.`);
  }

  /**
   * Initializes or resumes the single shared AudioContext.
   * MUST only be called inside a direct user gesture (e.g. Play, Step, or Mute click).
   * Never called on page load.
   */
  initContext() {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          console.warn('[AlgoSound] Web Audio API is not supported in this environment.');
          return null;
        }
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        console.log(`[AlgoSound] AudioContext created. Initial state: ${this.ctx.state}`);
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          console.log(`[AlgoSound] AudioContext resumed successfully -> state: ${this.ctx.state}`);
        }).catch(err => {
          console.warn('[AlgoSound] AudioContext resume failed:', err);
        });
      }

      return this.ctx;
    } catch (err) {
      console.warn('[AlgoSound] Failed to initialize AudioContext:', err);
      return null;
    }
  }

  /**
   * REUSABLE TONE GENERATOR
   * Plays a short beep/tone given frequency, duration, tone shape, volume, and optional delay.
   * Every sound in AlgoVerse routes through this single function.
   *
   * @param {number} frequency - Tone frequency in Hz
   * @param {number} duration  - Tone duration in seconds
   * @param {string} type      - Tone shape: 'sine' | 'triangle' | 'sawtooth' | 'square'
   * @param {number} volume    - Amplitude from 0.0 to 1.0
   * @param {number} delay     - Delay in seconds from ctx.currentTime (for multi-note chimes)
   */
  playTone(frequency, duration = 0.08, type = 'sine', volume = 0.18, delay = 0) {
    if (this.isMuted) return null;

    // Ensure AudioContext exists if user has already triggered a gesture
    if (!this.ctx) {
      this.initContext();
      if (!this.ctx) return null;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    try {
      const now = this.ctx.currentTime;
      const startTime = now + Math.max(0, delay);
      const stopTime = startTime + duration;

      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, startTime);

      // Smooth attack and exponential decay to prevent clicks/pops
      const attack = 0.005;
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain || this.ctx.destination);

      osc.start(startTime);
      osc.stop(stopTime + 0.01);

      this.activeOscillators.add(osc);
      osc.onended = () => {
        this.activeOscillators.delete(osc);
        try {
          osc.disconnect();
          gainNode.disconnect();
        } catch (e) {}
      };

      return osc;
    } catch (err) {
      console.warn('[AlgoSound] playTone error:', err);
      return null;
    }
  }

  /**
   * Comparison: a short, soft, low beep.
   * Frequency scales subtly with bar value (200Hz - 340Hz).
   */
  playComparison(val = 50, maxVal = 100) {
    const norm = Math.max(0, Math.min(1, val / maxVal));
    const freq = 200 + norm * 140; // 200Hz - 340Hz (low, soft pitch)
    this.playTone(freq, 0.055, 'sine', 0.16);
  }

  /**
   * Swap: a slightly higher-pitched, punchier pop.
   * Triangle wave at 580Hz with punchy envelope.
   */
  playSwap(valA, valB) {
    this.playTone(580, 0.075, 'triangle', 0.24);
  }

  /**
   * Node visited (BFS/DFS traversal): a clean, short ping.
   * Sine wave at 784Hz-1175Hz (G5-D6 pentatonic register).
   */
  playNodeVisit(nodeIndex = 0) {
    const pings = [784, 880, 988, 1046, 1175];
    const freq = pings[nodeIndex % pings.length];
    this.playTone(freq, 0.09, 'sine', 0.20);
  }

  /**
   * Search found / algorithm complete: brief 3-note ascending chime in quick succession.
   * C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz).
   */
  playComplete() {
    this.playTone(523.25, 0.10, 'triangle', 0.20, 0.00);
    this.playTone(659.25, 0.10, 'triangle', 0.20, 0.08);
    this.playTone(783.99, 0.24, 'triangle', 0.24, 0.16);
  }

  // Alias for backwards compatibility
  playSuccess() {
    this.playComplete();
  }

  /**
   * Reset: a low, short thud tone.
   * Deep 110Hz sine wave.
   */
  playReset() {
    this.playTone(110, 0.10, 'sine', 0.26);
  }

  /**
   * Working Mute Toggle:
   * Instantly mutes or unmutes all sound, stops active sounds immediately,
   * updates the masterGain, and persists preference in sessionStorage.
   * @returns {boolean} true if now muted, false if unmuted
   */
  toggleMute() {
    // If context not created yet, user gesture creates it so unmuting works instantly
    this.initContext();

    this.isMuted = !this.isMuted;

    try {
      sessionStorage.setItem('algoverse_muted', String(this.isMuted));
    } catch (e) {}

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }

    if (this.isMuted) {
      // Immediately stop any sound mid-animation
      this.stopAllSounds();
    } else {
      // Short friendly confirmation pop when unmuted
      this.playTone(440, 0.05, 'sine', 0.18);
    }

    console.log(`[AlgoSound] Mute toggled. Currently ${this.isMuted ? 'MUTED (🔇)' : 'UNMUTED (🔊)'}. AudioContext: ${this.ctx ? this.ctx.state : 'uninitialized'}`);
    return this.isMuted;
  }

  /**
   * Immediately stops any currently active sounds.
   */
  stopAllSounds() {
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.activeOscillators.clear();
  }

  // Diagnostic status check
  getStatus() {
    return {
      initialized: !!this.ctx,
      state: this.ctx ? this.ctx.state : 'uninitialized',
      isMuted: this.isMuted,
      activeSounds: this.activeOscillators.size
    };
  }
}

// Single shared global instance
window.soundEngine = new AlgoSound();

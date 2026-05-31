// Procedural sound generator and HTML5 audio player for Alea Imperii.
// Uses OfflineAudioContext and in-memory mono WAV rendering to guarantee
// sound effects play back via the same HTML5 Audio engine as background music.

function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  const sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  // Helper functions to write 16-bit and 32-bit values
  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  // RIFF identifier
  setUint32(0x46464952); // "RIFF"
  // file length
  setUint32(length - 8);
  // queue WAVE
  setUint32(0x45564157); // "WAVE"
  // format chunk identifier
  setUint32(0x20746d66); // "fmt "
  // format chunk length
  setUint32(16);
  // sample format (raw PCM)
  setUint16(1);
  // channel count
  setUint16(numOfChan);
  // sample rate
  setUint32(sampleRate);
  // byte rate (sample rate * block align)
  setUint32(sampleRate * numOfChan * 2);
  // block align (channel count * bytes per sample)
  setUint16(numOfChan * 2);
  // bits per sample
  setUint16(16);
  // data chunk identifier
  setUint32(0x61746164); // "data"
  // data chunk length
  setUint32(length - pos - 4);

  // Write PCM samples
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArr], { type: 'audio/wav' });
}

class SoundSystem {
  private bgAudio: HTMLAudioElement | null = null;
  public isMuted: boolean = true; // Respect default muted starting state

  init() {
    // Left for compatibility with external references
  }

  startMusic() {
    this.isMuted = false;
    if (!this.bgAudio) {
      this.bgAudio = new Audio('assets/bronze-age.mp3');
      this.bgAudio.loop = true;
      this.bgAudio.volume = 0.35; // Curated optimal background volume
    }
    
    this.bgAudio.play().catch((e) => {
      console.log("Audio play deferred until user interaction:", e);
    });
  }

  stopMusic() {
    this.isMuted = true;
    if (this.bgAudio) {
      this.bgAudio.pause();
    }
  }

  // Play a simple interaction pluck
  playClick() {
    if (this.isMuted) return;
    try {
      const OfflineContextClass = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (!OfflineContextClass) return;

      const sampleRate = 44100;
      const duration = 0.16;
      const offlineCtx = new OfflineContextClass(1, sampleRate * duration, sampleRate);
      
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, 0); // High C
      osc.frequency.exponentialRampToValueAtTime(130.81, duration); // Slide down
      
      gain.gain.setValueAtTime(0.35, 0);
      gain.gain.linearRampToValueAtTime(0.001, duration);
      
      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      
      osc.start(0);
      osc.stop(duration);
      
      offlineCtx.startRendering().then((renderedBuffer: AudioBuffer) => {
        const blob = bufferToWav(renderedBuffer);
        const url = URL.createObjectURL(blob);
        const audioEl = new Audio(url);
        audioEl.play().catch(() => {});
        audioEl.onended = () => URL.revokeObjectURL(url);
      }).catch(() => {});
    } catch (e) {}
  }

  // Play a beautiful classic dice rolling sound!
  playDiceRoll() {
    if (this.isMuted) return;
    try {
      const OfflineContextClass = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (!OfflineContextClass) return;

      const sampleRate = 44100;
      const duration = 0.65;
      const offlineCtx = new OfflineContextClass(1, sampleRate * duration, sampleRate);
      
      // Simulate classic tumbling noise with rapid low frequency pops
      for (let i = 0; i < 7; i++) {
        const timeOffset = i * 0.08;
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80 + Math.random() * 120, timeOffset);
        
        gain.gain.setValueAtTime(0.3, timeOffset);
        gain.gain.linearRampToValueAtTime(0.001, timeOffset + 0.08);
        
        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        
        osc.start(timeOffset);
        osc.stop(timeOffset + 0.09);
      }
      
      offlineCtx.startRendering().then((renderedBuffer: AudioBuffer) => {
        const blob = bufferToWav(renderedBuffer);
        const url = URL.createObjectURL(blob);
        const audioEl = new Audio(url);
        audioEl.play().catch(() => {});
        audioEl.onended = () => URL.revokeObjectURL(url);
      }).catch(() => {});
    } catch (e) {}
  }

  // Sound for getting points!
  playChime() {
    if (this.isMuted) return;
    try {
      const OfflineContextClass = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (!OfflineContextClass) return;

      const sampleRate = 44100;
      const duration = 0.9;
      const offlineCtx = new OfflineContextClass(1, sampleRate * duration, sampleRate);
      
      const notes = [329.63, 392.00, 523.25, 659.25]; // E, G, C, E arpeggio
      notes.forEach((freq, i) => {
        const timeOffset = i * 0.12;
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, timeOffset);
        
        gain.gain.setValueAtTime(0.01, timeOffset);
        gain.gain.linearRampToValueAtTime(0.3, timeOffset + 0.02);
        gain.gain.linearRampToValueAtTime(0.001, timeOffset + 0.45);
        
        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        
        osc.start(timeOffset);
        osc.stop(timeOffset + 0.52);
      });
      
      offlineCtx.startRendering().then((renderedBuffer: AudioBuffer) => {
        const blob = bufferToWav(renderedBuffer);
        const url = URL.createObjectURL(blob);
        const audioEl = new Audio(url);
        audioEl.play().catch(() => {});
        audioEl.onended = () => URL.revokeObjectURL(url);
      }).catch(() => {});
    } catch (e) {}
  }
}

export const audio = new SoundSystem();
export default audio;

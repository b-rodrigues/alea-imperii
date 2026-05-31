// Procedural sound generator and HTML5 audio player for Alea Imperii.

class SoundSystem {
  private ctx: AudioContext | null = null;
  private bgAudio: HTMLAudioElement | null = null;

  init() {
    if (this.ctx) return;
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  }

  startMusic() {
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
    if (this.bgAudio) {
      this.bgAudio.pause();
    }
  }

  // Play a simple interaction pluck
  playClick() {
    this.init();
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // High C
      osc.frequency.exponentialRampToValueAtTime(130.81, this.ctx.currentTime + 0.15); // Slide down
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (e) {}
  }

  // Play a beautiful classic dice rolling sound!
  playDiceRoll() {
    this.init();
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      
      // Simulate classic tumbling noise with rapid low frequency pops
      for (let i = 0; i < 7; i++) {
        const timeOffset = i * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80 + Math.random() * 120, this.ctx.currentTime + timeOffset);
        
        gain.gain.setValueAtTime(0.07, this.ctx.currentTime + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + timeOffset + 0.08);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(this.ctx.currentTime + timeOffset);
        osc.stop(this.ctx.currentTime + timeOffset + 0.09);
      }
    } catch (e) {}
  }

  // Sound for getting points!
  playChime() {
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [329.63, 392.00, 523.25, 659.25]; // E, G, C, E arpeggio
      notes.forEach((freq, i) => {
        const timeOffset = i * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + timeOffset);
        
        gain.gain.setValueAtTime(0, this.ctx.currentTime + timeOffset);
        gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + timeOffset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + timeOffset + 0.4);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(this.ctx.currentTime + timeOffset);
        osc.stop(this.ctx.currentTime + timeOffset + 0.52);
      });
    } catch (e) {}
  }
}

export const audio = new SoundSystem();
export default audio;

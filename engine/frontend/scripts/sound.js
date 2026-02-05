
export const Sound = new class {
	constructor() {
		window.addEventListener('sound',this,false);
	}
	async handleEvent(event) {
		this.play(event.detail.value);
	}
	playSound(type = 0, duration = 1, ...sequence) {
		const context = new AudioContext();
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		const now = context.currentTime;
		const volume = 0.5;

		oscillator.type = ['sine','square','sawtooth','triangle'][type];

		for (let i = 0; i < sequence.length; i += 2) {
			oscillator.frequency.setValueAtTime(sequence[i], sequence[i+1]+now);
		}

		// Connect the nodes: Oscillator -> Gain -> Speakers
		oscillator.connect(gain);
		gain.connect(context.destination);

		oscillator.start();

		// Gently fade out to avoid a "clicking" sound
		gain.gain.setValueAtTime(volume, now);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
		oscillator.stop(now + duration);

	}
	play(type) {
		if (localStorage.getItem('audio') === 'true') {
			switch (type) {
				case 'accept':
					this.playSound(0,1,800,0,1100,0.05,1300,0.10,1400,0.15);
					break;
				case 'reject':
					this.playSound(0,1,300,0,200,0.1);
					break;
				case 'danger':
					this.playSound(0,1,800,0,600,0.1);
					break;
				case 'inform':
					this.playSound(0,1,300,0,500,0.2);
					break;
				default:
					this.playSound(0,0.2,200,0,300,0.05,400,0.1);
			}
		}
	}
}

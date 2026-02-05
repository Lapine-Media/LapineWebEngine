
import { Index,IO,LapineMessage } from '../frontend.js';

export const Cloudflare = new class {
	#initiated = false;
	constructor() {
		window.addEventListener('cloudflare',this,false);
	}
	async handleEvent(event) {
		switch (event.detail.name+' '+event.detail.value) {
			case 'menu visible':
				if (this.#initiated == false) {
					this.#initiated = true;
					IO.sendSignal(false,'cloudflare','check','editor');
					const signal = IO.getSignal(true,'environments','menu','visible');
					await Index.openLink('/markup/cloudflare/environments.html','subpage',signal);
				}
				break;
			case 'menu '+event.detail.value:
				const page = '/markup/cloudflare/'+event.detail.value+'.html';
				await Index.openLink(page,'subpage');
				IO.sendSignal(true,event.detail.value,'menu','visible',event.detail.data);
				break;
			case 'account whoami':
				IO.sendSignal(false,'cloudflare','account','whoami');
				break;
			default:
				console.log(event.detail);
		}
	}
}

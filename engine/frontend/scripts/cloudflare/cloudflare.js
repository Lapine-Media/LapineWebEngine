
import { Index,IO } from '../frontend.js';

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
					IO.send('cloudflare','account','api');
					IO.send('cloudflare','editor','check');
					await Index.openLink('/markup/cloudflare/environments.html','subpage');
					IO.signal('environments','menu','visible',null);
				}
				break;
			case 'menu page':
				const page = '/markup/cloudflare/'+event.detail.data.uni+'.html';
				await Index.openLink(page,'subpage');
				IO.signal(event.detail.data.uni,'menu','visible',event.detail.data);
				break;
			default:
				console.log(event.detail);
		}
	}
	account(value,data) {
		let state;
		switch (value) {
			case 'iam':
				state = data.includes('You are logged in');
				this.setState('authenticated',state);
				break;
			case 'online':
				state = string.includes('Successfully logged in');
				this.setState('authenticated',state);
				break;
			case 'offline':
				state = string.includes('Successfully logged out');
				this.setState('authenticated',!state);
				break;
			case 'api':
				console.log(value,data);
				break;
			default:
				IO.send('cloudflare','account',value,data);
		}
	}
	setState(name,value,message = true) {
		Index.elements.frame.cloudflare.dataset[name] = value;
		if (message) {
			switch (name+' '+value) {
				case 'authenticated true':
					message = IO.getMessage('accept','Success!','You are now logged in to Cloudflare.');
					message.display(true);
					break;
				case 'authenticated false':
					message = IO.getMessage('danger','Not authenticated','You must log in to Cloudflare.');
					message.display(true);
					break;
			}
		}
	}
}

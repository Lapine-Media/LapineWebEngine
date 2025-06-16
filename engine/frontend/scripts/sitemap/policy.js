
import { Index,IO,Overlay,PolicyItem } from '../frontend.js';

export const Policy = new class {
	constructor() {
		window.addEventListener('policy',this,false);
	}
	setup(file) {

		Index.elements.overlay.policy_file.textContent = 'Editing file: /app/data/'+file+'.csp.txt';

		const directives = {
			'base-uri': "",
			'child-src': "",
			'connect-src': "",
			'default-src': "'self'",
			'font-src': "",
			'form-action': "'none'",
			'frame-ancestors': "",
			'frame-src': "",
			'img-src': "",
			'manifest-src': "",
			'media-src': "",
			'object-src': "'none'",
			'report-to': "",
			'sandbox': "",
			'script-src': "",
			'script-src-elem': "'strict-dynamic' 'nonce'",
			'script-src-attr': "",
			'style-src': "",
			'style-src-elem': "",
			'style-src-attr': "",
			'upgrade-insecure-requests': "",
			'worker-src': ""
		};

		const entries = Object.entries(directives);

		for (const [key,value] of entries) {
			const element = new PolicyItem(key,value);
			Index.elements.overlay.policy_items.append(element);
		}

	}
	handleEvent(event) {
		let message;
		switch (event.detail.name+' '+event.detail.value) {
			case 'dialog open':
				this.setup(event.detail.data);
				IO.send('policy','load','file',event.detail.data);
				break;
			case 'loaded success':
				this.loaded(event.detail.data);
				break;
			case 'saved success':
				Overlay.close();
				message = IO.getMessage('accept','Success!','The file has been saved.');
				message.display(true);
				break;
			case 'options save':
				message = IO.getMessage('danger','Are you sure?','This will overwrite the existing file.');
				const confirm = IO.getSignal('policy','confirm','save',event.detail.data);
				message.addButton('accept','Yes',confirm);
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			case 'confirm save':
				this.save(event.detail.data);
				break;
			default:
				console.log(event.detail.name+' '+event.detail.value);
		}
	}
	loaded(string) {

		const form = document.forms.policy_form;
		const rules = string.split(';');

		form.reset();

		for (const rule of rules) {
			const words = rule.split(' ');
			const directive = words.shift();
			const element = form.elements[directive];
			if (element) {
				element.value = words.join(' ');
			}
		}

	}
	save(data) {
		let content = '';
		const entries = Object.entries(data);
		for (const [key,value] of entries) {
			content += value ? key+' '+value+';' : '';
		}
		IO.send('policy','save','file',content);
	}
}

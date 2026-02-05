
import { Index,IO,LapineMessage,Overlay,PolicyItem } from '../frontend.js';

export const Policy = new class {
	constructor() {
		window.addEventListener('policy',this,false);
	}
	handleEvent(event) {
		let message;
		switch (event.detail.name+' '+event.detail.value) {
			case 'loaded success':
				const signal = () => this.loaded(event.detail.data);
				Overlay.open('Edit content security policy','/markup/policy.html',signal,'max');
				break;
			case 'options save':
				message = new LapineMessage('danger','Are you sure?','This will overwrite the existing file.');
				const confirm = IO.getSignal('policy','confirm','save',event.detail.data);
				message.addButton('accept','Yes',confirm);
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			case 'confirm save':
				this.save(event.detail.data);
				break;
			case 'saved success':
				Overlay.close();
				message = new LapineMessage('accept','Success!','The file has been saved.');
				message.display(true);
				break;
			default:
				console.log(event.detail.name+' '+event.detail.value);
		}
	}
	loaded(data) {

		const directives = ['base-uri','child-src','connect-src','default-src','font-src','form-action','frame-ancestors','frame-src','img-src','manifest-src','media-src','object-src','report-to','sandbox','script-src','script-src-elem','script-src-attr','style-src','style-src-elem','style-src-attr','upgrade-insecure-requests','worker-src'];
		const form = document.forms.policy_form;
		const rules = data.content.split(';');

		form.reset();
		form.elements.csp_file.value = data.file;

		for (const directive of directives) {
			const element = new PolicyItem();
			element.id = 'csp_'+directive;
			element.name = directive;
			Index.elements.overlay.policy_items.append(element);
		}

		for (const rule of rules) {
			const words = rule.split(' ');
			const directive = words.shift();
			const element = form.elements[directive];
			if (element) {
				element.value = words.join(' ');
			}
		}

		Index.elements.overlay.policy_file.textContent = 'Editing file: /pwa/data/'+data.file+'.csp.txt';

	}
	save(data) {
		const file = data.csp_file;

		delete data.csp_file;

		const entries = Object.entries(data);
		let content = '';

		for (const [key,value] of entries) {
			content += value ? key+' '+value+';' : '';
		}

		IO.sendSignal(false,'policy','save',file,content);
	}
}

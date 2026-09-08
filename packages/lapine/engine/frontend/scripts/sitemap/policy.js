
import { Site,IO,LapineMessage,Overlay,PolicyItem } from '../frontend.js';

export const Policy = new class {
	constructor() {
		window.addEventListener('policy',this,false);
	}
	handleEvent(event) {
		const {name,value,data} = event.detail;
		let signal,message;
		switch (name+' '+value) {
			case 'loaded success':
				signal = () => this.loaded(data);
				Overlay.open('Edit content security policy','/markup/policy.html',signal,'Cancel','policy');
				break;
			case 'options save':
				message = new LapineMessage('danger','Are you sure?','This will overwrite the existing file.');
				signal = () => IO.sendSignal(true,'policy','confirm','save',data);
				message.addButton('accept','Yes',signal);
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			case 'confirm save':
				this.save(data);
				break;
			case 'saved success':
				Overlay.close();
				message = new LapineMessage('accept','Success!','The file has been saved.');
				message.display(true);
				break;
			default:
				console.log(name+' '+value);
		}
	}
	loaded(data) {

		const directives = ['base-uri','child-src','connect-src','default-src','font-src','form-action','frame-ancestors','frame-src','img-src','manifest-src','media-src','object-src','report-to','sandbox','script-src','script-src-elem','script-src-attr','style-src','style-src-elem','style-src-attr','upgrade-insecure-requests','worker-src'];
		const form = Site.elements.overlay.policy_form;
		const rules = data.content.split(';');

		form.reset();
		form.elements.csp_file.value = data.file;

		for (const directive of directives) {
			const element = new PolicyItem();
			element.id = 'csp_'+directive;
			element.name = directive;
			Site.elements.overlay.policy_items.append(element);
		}

		for (const rule of rules) {
			const words = rule.split(' ');
			const directive = words.shift();
			const element = form.elements[directive];
			if (element) {
				element.value = words.join(' ');
			}
		}

		Site.elements.overlay.policy_file.textContent = 'Editing file: /pwa/data/'+data.file+'.csp.txt';

	}
	save(data) {
		console.log(data);
		/*const file = data.csp_file;

		delete data.csp_file;

		const entries = Object.entries(data);
		let content = '';

		for (const [key,value] of entries) {
			content += value ? key+' '+value+';' : '';
		}

		IO.sendSignal(false,'policy','save',file,content);*/
	}
}


import { Index,IO,LapineMessage } from './frontend.js';

export const Manifest = new class {
	#initiated = false;
	constructor() {
		window.addEventListener('manifest',this,false);
	}
	handleEvent(event) {
		if (event.type == 'change') {
			Index.elements.manifest.manifest_icons.dataset.round = event.target.checked || false;
		} else {
			let message;
			switch (event.detail.name+' '+event.detail.value) {
				case 'menu visible':
					if (this.#initiated == false) {
						IO.sendSignal(false,'manifest','load','settings');
						document.forms.manifest_icons.elements.manifest_round.addEventListener('change',this,false);
					}
					break;
				case 'menu page':
					Index.elements.manifest.manifest_page.dataset.state = event.detail.data.uni;
					break;
				case 'loaded success':
					this.#initiated = true;
					this.loaded(event.detail.data);
					break;
				case 'saved success':
					message = new LapineMessage('accept','Success!','The manifest has been updated.');
					message.display(true);
					break;
				case 'saved error':
					message = new LapineMessage('reject','Oh noes!',event.detail.data);
					message.display(false);
					break;
				default:
					if (event.detail.name == 'save') {
						IO.sendSignal(false,'manifest','save',event.detail.value,event.detail.data);
					} else {
						console.log(event.detail);
					}
			}
		}
	}
	async loaded(data) {
		const files = data.share_target.params.files.map(item => item.name+': '+item.accept.join(' ')).join('\n');
		const handlers = data.protocol_handlers.map(item => item.protocol+': '+item.url).join('\n');
		const values = {...data.share_target,...data.share_target.params,files,handlers};
		data.icons = data.icons.find(entry => entry.sizes === 'any' || entry.sizes === '512x512');
		const fill = name => Index.fillForm(document.forms['manifest_'+name],data);
		['information','appearance','urls','shortcuts','protocols'].forEach(fill);
		document.forms.manifest_icons.elements.icons.upload(data.icons);
		document.forms.manifest_shortcuts.elements.shortcuts.upload(data.shortcuts);
		document.forms.manifest_screenshots.elements.screenshots.upload(data.screenshots);
	}
}


import { Site,IO,LapineMessage } from '../frontend.js';

export const Manifest = new class {
	constructor() {
		window.addEventListener('load',this,false);
		window.addEventListener('manifest',this,false);
	}
	async handleEvent(event) {
		switch (event.type) {
			case 'load':
				await Site.loaded;
				Site.elements.manifest.manifest_round.addEventListener('change',this,false);
				const signal = response => this.loaded(response.data);
				IO.sendSignal(false,'manifest','load','settings',null,signal);
				break;
			case 'change':
				Site.elements.manifest.icons.dataset.round = event.target.checked || false;
				break;
			case 'manifest':
				const {name,value,data} = event.detail;
				this.action(name,value,data);
		}
	}
	async action(name,value,data) {
		let message;
		switch (name+' '+value) {
			case 'menu visible':
				break;
			case 'menu '+value:
				Site.elements.manifest.container.dataset.page = value;
				break;
			case 'saved success':
				message = new LapineMessage('accept','Success!','The manifest has been updated.');
				message.display(true);
				break;
			case 'saved error':
				message = new LapineMessage('reject','Oh noes!',data);
				message.display(false);
				break;
			case 'save '+value:
				IO.sendSignal(false,'manifest','save',value,data);
				break;
			default:
				console.log(name+' '+value);
		}
	}
	async loaded(data) {
		try {
			Site.fillForm(Site.elements.manifest.manifest_information,data);
			Site.fillForm(Site.elements.manifest.manifest_appearance,data);
			Site.fillForm(Site.elements.manifest.manifest_urls,data);
			if (data.share_target) {
				const method = item => item.name+': '+item.accept.join(' ');
				const values = {
					...data.share_target,
					...data.share_target.params,
					files: data.share_target.params.files.map(method).join('\n')
				}
				Site.fillForm(Site.elements.manifest.manifest_protocols,values);
			}
			if (data.protocol_handlers) {
				const values = {
					handlers: data.protocol_handlers.map(item => item.protocol+': '+item.url).join('\n')
				};
				Site.fillForm(Site.elements.manifest.manifest_protocols,values);
			}
			if (data.icons) {
				data.icons = data.icons.find(entry => entry.sizes === 'any' || entry.sizes === '512x512');
				console.log(Site.elements.manifest.icons);
				Site.elements.manifest.icons.upload(data.icons);
			}
			if (data.shortcuts) {
				Site.fillForm(Site.elements.manifest.manifest_shortcuts,data);
				Site.elements.manifest.shortcuts.upload(data.shortcuts);
			}
			if (data.screenshots) {
				Site.elements.manifest.screenshots.upload(data.screenshots);
			}
		} catch (error) {
			console.log(error);
		}
	}
}

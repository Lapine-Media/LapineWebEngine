
import { Site,IO,LapineMessage,Output } from '../frontend.js';

export const Cloudflare = new class {
	#page = 'environments';
	constructor() {
		window.addEventListener('cloudflare',this,false);
	}
	async handleEvent(event) {
		event.preventDefault();
		switch (event.type) {
			case 'cloudflare':
				const {name,value,data} = event.detail;
				this.action(name,value,data);
				break;
		}
	}
	async action(name,value,data) {
		switch (name+' '+value) {
			case 'page visible':
				if (this.#page != 'editor') {
					IO.sendSignal(false,'cloudflare','check','editor');
					IO.sendSignal(true,this.#page,'page','visible');
				}
				break;
			case 'menu '+value:
				this.#page = value;
				await Site.elements.cloudflare.subpage.openPage('markup/cloudflare/'+value+'.html');
				IO.sendSignal(true,this.#page,'page','visible');
				break;
			case 'open editor':
			case 'reload editor':
				let page,context;
				switch (data.binding_path) {
					case 'd1_databases':
						page = 'markup/cloudflare/d1/d1_editor.html';
						context = 'd1_editor';
						break;
					case 'r2_buckets':
						page = 'markup/cloudflare/r2/r2_editor.html';
						context = 'r2_editor';
						break;
				}
				this.#page = 'editor';
				await Site.elements.frame.editor.openPage(page);
				Output.setEditorMode(true);
				document.body.dataset.page = 'editor';
				if (name == 'open') {
					IO.sendSignal(true,context,'editor','started',data);
				} else {
					IO.sendSignal(true,context,'editor','reloaded',data);
				}
				break;
			case 'editor closed':
				this.#page = 'environments';
				await Site.elements.frame.editor.openPage('markup/cloudflare/environments.html');
				document.body.dataset.page = 'cloudflare';
				Output.setEditorMode(false);
				IO.sendSignal(true,'environments','page','visible');
				break;
			case 'account whoami':
				IO.sendSignal(false,'cloudflare','account','whoami');
				break;
			default:
				console.log(name,value,data);
		}
	}
}

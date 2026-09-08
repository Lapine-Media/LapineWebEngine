
import {Index,Site,IO,Output,Overlay} from './frontend.js';

export default new class extends Index {
	constructor() {
		super();
	}
	async handleEvent(event) {
		super.handleEvent(event);
		switch (event.type) {
			case 'load':
				await Site.ready;
				console.log('Ready!');
				const settings = document.forms.index.elements.settings.elements;
				settings.awesome.addEventListener('change',this,false);
				settings.audio.addEventListener('change',this,false);
				break;
			case 'index':
				const {name,value,data} = event.detail;
				this.action(name,value,data);
				break;
			case 'change':
				if (event.target.name == 'awesome') {
					document.body.dataset.awesome = event.target.checked;
					localStorage.setItem('awesome',event.target.checked);
					if (event.target.checked == false) {
						Output.log('danger','Oh, ok... ( •_•)','reject');
					} else {
						Output.log('inform','Heck yeah! °˖✧◝ \\（ ^ ◡ ^ ）/ ◜✧˖° ♥','accept');
					}
				} else {
					document.body.dataset.audio = event.target.checked;
					localStorage.setItem('audio',event.target.checked);
					if (event.target.checked == false) {
						Output.log('danger','Got it, no sounds... (>_<)');
					} else {
						Output.log('inform','Wohoo! .☆((⸜(⁀ ᗜ ⁀)⸝))☆. ♥','accept');
					}
				}
				break;
			default:
				console.log(event);
		}
	}
	action(name,value,data) {
		switch (name+' '+value) {
			case 'menu '+value:
				if (value == 'cloudflare' && document.body.dataset.editor == 'true') {
					document.body.dataset.page = 'editor';
				} else {
					document.body.dataset.page = value;
				}
				IO.sendSignal(true,value,'page','visible');
				break;
			case 'overlay about':
				Overlay.open('Lapine App Studio','markup/about.html',null,'Close');
				break;
			case 'overlay cancel':
				Overlay.close();
				break;
			case 'clear log':
				Output.clear();
				break;
			default:
				console.log(name,value,data);
		}
	}
}

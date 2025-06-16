
import { Index,IO } from './frontend.js';

export const Manifest = new class {
	#initiated = false;
	constructor() {
		window.addEventListener('manifest',this,false);
	}
	handleEvent(event) {
		switch (event.detail.name+' '+event.detail.value) {
			case 'menu visible':
				if (this.#initiated == false) {
					IO.send('manifest','load','setup');
				}
				break;
			case 'menu page':
				Index.elements.manifest.manifest_page.dataset.state = event.detail.data.uni;
				console.log(event.detail);
				break;
			default:
				console.log(event.detail);
		}
	}
}

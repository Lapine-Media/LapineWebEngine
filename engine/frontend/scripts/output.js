
import { Index,IO } from './frontend.js';

export const Output = new class {
	#elements = {};
	constructor() {
		window.addEventListener('output',this,false);
	}
	async handleEvent(event) {
		switch (event.detail.name) {
			case 'log':
				this.log(event.detail.value,event.detail.data);
				break;
			default:
				console.log(event);//log/live/clear
		}
	}
	log(type,data) {
		
		let container,element;

		if (data && data.requestId) {
			container = this.#elements[data.requestId];
			if (!container) {
				container = document.createElement('div');
				this.#elements[data.requestId] = container;
			}
		} else {
			container = document.createDocumentFragment();
		}

		if (type == 'line') {
			element = document.createElement('hr');
			container.append(element);
		} else {
			element = document.createElement('div');
			let message = data.message ?? data;
			if (typeof message == 'object') {
				message = JSON.stringify(message,null,2);
			}
			element.classList.add(type);
			element.innerHTML = message;
			container.append(element);
		}

		if (container.isConnected == false) {
			Index.elements.frame.log.append(container);
		}

	}
	live(type,text) {
		if (type == null) {
			Index.elements.frame.live.dataset.type = 'none';
			Index.elements.frame.live.textContent = '';
		} else {
			Index.elements.frame.live.dataset.type = type;
			Index.elements.frame.live.textContent = text;
		}
	}
	clear() {
		Index.elements.frame.log.innerHTML = '';
		this.#elements = {};
	}
}

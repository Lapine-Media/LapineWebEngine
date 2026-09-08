
import { Site,Sound } from './frontend.js';

export const Output = new class {
	#elements = {};
	constructor() {
		window.addEventListener('load',this,false);
		window.addEventListener('output',this,false);
	}
	async handleEvent(event) {
		switch (event.type) {
			case 'load':
				await Site.ready;
				this.setAutoScroll(Site.elements.frame.live);
				this.setAutoScroll(Site.elements.frame.log);
				break;
			case 'output':
				switch (event.detail.name) {
					case 'log':
						this.log(event.detail.value,event.detail.data);
						break;
					case 'sidelog':
						this.sideLog(event.detail.value,event.detail.data);
						break;
					case 'live':
						this.live(event.detail.value,event.detail.data);
						break;
					case 'clear':
						this.clear();
				}
		}
	}
	setAutoScroll(container) {
		const scroll = () => container.scrollTop = container.scrollHeight;
		const observer = new MutationObserver(scroll);
		const options = {
			childList: true,
			subtree: true
		};
		observer.observe(container,options);
	}
	setEditorMode(active) {
		if (active) {
			document.body.dataset.editor = true;
			this.sideLog('accept','Loading editor...');
		} else {
			document.body.dataset.editor = false;
			Site.elements.frame.live.innerHTML = '';
		}
	}
	async log(type,data,sound = false) {

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
			await Site.ready;
			Site.elements.frame.log.append(container);
		}

		if (sound) {
			Sound.play(sound === true ? type : sound);
		}

	}
	sideLog(type,data,sound = false) {
		let element;
		if (type == 'line') {
			element = document.createElement('hr');
		} else {
			element = document.createElement('div');
			let message = data.message ?? data;
			if (typeof message == 'object') {
				message = JSON.stringify(message,null,2);
			}
			element.classList.add(type);
			element.innerHTML = message;
		}
		Site.elements.frame.live.append(element);
		if (sound) {
			Sound.play(sound === true ? type : sound);
		}
	}
	live(type,text,sound = false) {
		if (type == null) {
			Site.elements.frame.live.dataset.type = 'none';
			Site.elements.frame.live.textContent = '';
		} else {
			Site.elements.frame.live.dataset.type = type;
			Site.elements.frame.live.textContent = text;
			if (sound) {
				Sound.play(sound === true ? type : sound);
			}
		}
	}
	clear() {
		Site.elements.frame.log.innerHTML = '';
		this.#elements = {};
	}
}

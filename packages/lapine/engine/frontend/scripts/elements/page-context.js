
import {Site} from '../frontend.js';

export class PageContext extends HTMLElement {
	static views = {};
	#ready = Promise.withResolvers();
	name;
	elements;
	constructor() {
		super();
		this.name = this.getAttribute('name');
		const options = {mode: 'open'};
		this.attachShadow(options);
		PageContext.views[this.name] = this;
	}
	get ready() {
		return this.#ready.promise;
	}
	displayText(text) {
		this.shadowRoot.innerHTML = text;
	}
	async openPage(href) {
		this.#ready = Promise.withResolvers();
		const response = await fetch(href);
		const template = document.createElement('template');
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = 'styles/common.css';

		template.innerHTML = await response.text();

		this.elements = Site.getElements(template.content);
		Site.elements[this.name] = this.elements;
		Site.scanElements(template.content,this.name);

		while (this.shadowRoot.lastChild) {
			this.shadowRoot.removeChild(this.shadowRoot.lastChild);
		}

		this.shadowRoot.append(link,template.content);

		this.#ready.resolve();
	}
	connectedCallback() {
		const page = this.getAttribute('page');
		if (page != '') {
			this.openPage(page);
		}
	}
}

window.customElements.define('page-context',PageContext);

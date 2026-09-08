/*global HTMLElement*/

import { Site,Ghost } from '../frontend.js';

export class DepotNode extends HTMLElement {
	#abortController;
	#shadow;
	#template;
	data;
	constructor(type,title,description,details) {
		super();
		this.data = {type,title,description,details,uni:'new'};
		this.#abortController = new AbortController();
		this.#shadow = this.attachShadow({mode: 'open'});
	}
	handleEvent(event) {
		switch (event.type) {
			case 'dragstart':
				Ghost.drag(event,this);
				this.#template.container.dataset.dragged = 'true';
				break;
			case 'dragend':
				Ghost.end();
				this.#template.container.dataset.dragged = 'false';
				break;
		}
	}
	async connectedCallback() {

		const options = {signal: this.#abortController.signal};

		this.draggable = true;
		this.#template = await Site.getTemplate('depot-node');
		this.#template.container.dataset.type = this.data.type;
		this.#template.title.textContent = this.data.title;
		this.#template.description.textContent = this.data.description;

		this.addEventListener('dragstart',this,options);
		this.addEventListener('dragend',this,options);

		this.#shadow.appendChild(this.#template.fragment);

	}
	setState(name,value) {
		this.#template.container.dataset[name] = value;
	}
	disconnectedCallback() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
        }
	}
}

window.customElements.define('depot-node',DepotNode);

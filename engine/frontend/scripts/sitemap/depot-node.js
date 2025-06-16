/*global HTMLElement*/

import { Index,Ghost } from '../frontend.js';

export class DepotNode extends HTMLElement {
	#shadow;
	#template;
	data;
	constructor(type,title,description,details) {
		super();
		this.data = {type,title,description,details,uni:'new'};
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
	connectedCallback() {

		this.draggable = true;
		this.#template = Index.getTemplate('depot-node');
		this.#template.container.dataset.type = this.data.type;
		this.#template.title.textContent = this.data.title;
		this.#template.description.textContent = this.data.description;

		this.addEventListener('dragstart',this,false);
		this.addEventListener('dragend',this,false);

		this.#shadow.appendChild(this.#template.fragment);

	}
	disconnectedCallback() {

		this.removeEventListener('dragstart',this,false);
		this.removeEventListener('dragend',this,false);

	}
}

window.customElements.define('depot-node',DepotNode);

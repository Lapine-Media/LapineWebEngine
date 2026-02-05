
import { Index,IO } from '../frontend.js';

export class EnvironmentItem extends HTMLElement {
	#template;
	#abortController;
	#name;
	constructor(name) {
		super();
		this.#template = Index.getTemplate('environment-item');
		this.#name = name;
		this.attachShadow({mode: 'open'});
	}
	get name() {
		return this.#name;
	}
	connectedCallback() {

		this.#abortController = new AbortController();
		const options = {signal: this.#abortController.signal};

		this.#template.name.textContent = this.#name;
		this.#template.edit.addEventListener('click',this,options);
		this.#template.bind.addEventListener('click',this,options);
		this.shadowRoot.appendChild(this.#template.fragment);

		if (this.#name == 'top') {
			this.#template.edit.hidden = true;
		}
	}
	handleEvent(event) {
		IO.sendSignal(true,'environments',event.target.name,event.target.value,this);
	}
	disconnectedCallback() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
        }
	}
}

window.customElements.define('environment-item',EnvironmentItem);

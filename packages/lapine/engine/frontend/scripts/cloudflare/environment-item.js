
import { Site,IO } from '../frontend.js';

export class EnvironmentItem extends HTMLElement {
	#abortController;
	#template;
	#name;
	constructor(name) {
		super();
		this.#name = name;
		this.#abortController = new AbortController();
		const options = {mode: 'open'};
		this.attachShadow(options);
	}
	get name() {
		return this.#name;
	}
	async connectedCallback() {
		const options = {signal: this.#abortController.signal};
		const action = () => IO.sendSignal(true,'environments','edit','environment',this);
		this.#template = await Site.getTemplate('environment-item');
		this.#template.name.textContent = this.#name;
		this.#template.edit.addEventListener('click',action,options);
		this.shadowRoot.appendChild(this.#template.fragment);
	}
	disconnectedCallback() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
        }
	}
}

window.customElements.define('environment-item',EnvironmentItem);

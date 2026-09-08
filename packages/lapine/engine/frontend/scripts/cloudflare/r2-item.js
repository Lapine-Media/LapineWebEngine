
import { Site,IO,Tools } from '../frontend.js';

export class R2Item extends HTMLElement {
	#abortController;
	#data;
	#bound;
	constructor(data,bound) {
		super();
		this.#data = data;
		this.#bound = bound;
		this.#abortController = new AbortController();
		this.attachShadow({mode: 'open'});
	}
	get data() {
		return this.#data;
	}
	get bound() {
		return this.#bound;
	}
	handleEvent(event) {
		IO.sendSignal(true,'r2_buckets','inspect','bucket',this);
	}
	async connectedCallback() {
		const options = {signal: this.#abortController.signal};
		const template = await Site.getTemplate('r2-item');

		template.container.dataset.bound = this.#bound;
		template.name.textContent = this.#data.name;
		template.creation_date.textContent = Tools.formatTimestamp(this.#data.creation_date);

		template.inspect.addEventListener('click',this,options);

		this.shadowRoot.appendChild(template.fragment);
	}
	disconnectedCallback() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
        }
	}
}

window.customElements.define('r2-item',R2Item);

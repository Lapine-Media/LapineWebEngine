
import { Site,IO,Tools } from '../frontend.js';

export class D1Item extends HTMLElement {
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
		IO.sendSignal(true,'d1_databases','inspect','database',this);
	}
	async connectedCallback() {
		const options = {signal: this.#abortController.signal};
		const template = await Site.getTemplate('d1-item');

		template.container.dataset.bound = this.#bound;
		template.created_at.textContent = Tools.formatTimestamp(this.#data.created_at);
		template.file_size.textContent = Tools.formatFileSize(this.#data.file_size || 0);
		template.name.textContent = this.#data.name;
		template.num_tables.textContent = this.#data.num_tables || 0;

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

window.customElements.define('d1-item',D1Item);

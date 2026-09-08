
import { Site,IO,Tools } from '../frontend.js';

export class DOItem extends HTMLElement {
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
		IO.sendSignal(true,'durable_objects','inspect','namespace',this);
	}
	async connectedCallback() {
		const options = {signal: this.#abortController.signal};
		const template = await Site.getTemplate('do-item');
console.log(this.#data);
		template.container.dataset.bound = this.#bound;
		template.name.textContent = this.#data.name;
		template.id.textContent = this.#data.id;
		//template.class.textContent = this.#data.class;
		//template.script.textContent = this.#data.script;
		//template.use_sqlite.textContent = this.#data.use_sqlite;

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

window.customElements.define('do-item',DOItem);

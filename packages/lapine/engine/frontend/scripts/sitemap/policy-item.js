
import { Site } from '../frontend.js';

export class PolicyItem extends HTMLElement {
	#template;
	#internals;
	#ready = Promise.withResolvers();
	static formAssociated = true;
	static observedAttributes = ['id','name','type','value'];
	constructor() {

		super();

		this.#internals = this.attachInternals();

		const options = {
			mode: 'open',
			delegatesFocus: true
		}

		this.attachShadow(options);

	}
	get form() {
		return this.#internals.form;
	}
	set value(value) {
		this.setAttribute('value',value);
	}
	get value() {
		return this.#template.input.value;
	}
	set name(value) {
		this.setAttribute('name',value);
	}
	get name() {
		return this.getAttribute('name');
	}
	set type(value) {
		this.setAttribute('type',value);
	}
	get type() {
		return this.getAttribute('type');
	}
	async attributeChangedCallback(name,oldValue,newValue) {

		await this.#ready.promise;

		switch (name) {
			case 'id':
				this.#template.label.htmlFor = newValue;
				this.#template.input.id = newValue;
				break;
			case 'name':
				this.#template.input.name = newValue;
				this.#template.label.textContent = newValue;
				break;
			case 'type':
				this.#template.input.type = newValue;
				break;
			case 'value':
				this.#template.input.value = newValue;
				this.#internals.setFormValue(newValue);
				break;
		}
	}
	async connectedCallback() {

		this.#template = await Site.getTemplate('policy-item');
		this.#ready.resolve();

		this.#template.input.onchange = event => {
			this.#internals.setFormValue(event.target.value);
		}

		this.shadowRoot.appendChild(this.#template.fragment);

	}
}

window.customElements.define('policy-item',PolicyItem);


import { Index,IO } from '../frontend.js';

export class PolicyItem extends HTMLElement {
	#data;
	#template;
	#internals;
	static formAssociated = true;
	static observedAttributes = ['name','type'];
	constructor(key,value) {

		super();

		const options = {
			mode: 'open',
			delegatesFocus: true
		}

		this.attachShadow(options);

		this.#data = {key,value};
		this.#internals = this.attachInternals();

	}
	get form() {
		return this.#internals.form;
	}
	set value(value) {
		this.#template.input.value = value;
		this.#internals.setFormValue(value);
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
	attributeChangedCallback(name,oldValue,newValue) {
		switch (name) {
			case 'name':
				this.#template.input.name = newValue;
				this.#template.label.textContent = newValue;
				break;
			case 'type':
				this.#template.input.type = newValue;
				break;
		}
	}
	connectedCallback() {

		this.#template = Index.getTemplate('policy-item');

		this.id = this.#data.key;
		this.name = this.#data.key;
		this.value = this.#data.value;
		this.type = 'text';

		this.#template.label.htmlFor = 'value';
		this.#template.input.id = 'value';
		this.#template.input.onchange = event => {
			this.#internals.setFormValue(event.target.value);
		}

		this.shadowRoot.appendChild(this.#template.fragment);

	}
}

window.customElements.define('policy-item',PolicyItem);

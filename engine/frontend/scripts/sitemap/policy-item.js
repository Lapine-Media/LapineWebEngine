
import { Index } from '../frontend.js';

export class PolicyItem extends HTMLElement {
	#template;
	#internals;
	static formAssociated = true;
	static observedAttributes = ['id','name','type','value'];
	constructor() {

		super();

		this.#internals = this.attachInternals();
		this.#template = Index.getTemplate('policy-item');

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
	attributeChangedCallback(name,oldValue,newValue) {
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
	connectedCallback() {

		this.#template.input.onchange = event => {
			this.#internals.setFormValue(event.target.value);
		}

		this.shadowRoot.appendChild(this.#template.fragment);

	}
}

window.customElements.define('policy-item',PolicyItem);

/*global document,HTMLElement*/

import { Kits } from '../scripts/frontend.js';

export default class PathSelect extends HTMLElement {
	static observedAttributes = ['required'];
	static formAssociated = true;
	constructor() {

		super();

		const options = {
			mode: 'open',
			delegatesFocus: true
		}

		this.attachShadow(options);

		this.internals = this.attachInternals();

	}
	connectedCallback() {

		this.template = Kits.getTemplate(this,'path-select');

		this.template.button.textContent = this.getAttribute('button');
		this.template.button.addEventListener('click',this,false);

		this.template.input.addEventListener('blur',this,false);

		this.shadowRoot.appendChild(this.template.fragment);

	}
	buttonHandler(element) {}
	handleEvent(event) {
		switch (event.type) {
			case 'blur':
				this.internals.setFormValue(this.template.input.value);
				break;
			case 'click':
				this.buttonHandler(this);
		}
	}
	checkValidity() {
		return this.internals.checkValidity();
	}
	reportValidity() {
		return this.internals.reportValidity();
	}
	get validity() {
		return this.internals.validity;
	}
	get validationMessage() {
		return this.internals.validationMessage;
	}
	get value() {
		return this.template.input.value;
	}
	set value(text) {
		this.template.input.value = text;
		this.internals.setFormValue(text);
	}
	attributeChangedCallback(name,oldValue,newValue) {
		this.template.input[name] = newValue;
	}
	disconnectedCallback() {
		this.template.button.removeEventListener('click',this,false);
		this.template.input.removeEventListener('blur',this,false);
	}
}

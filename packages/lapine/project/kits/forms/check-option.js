/*global document,HTMLElement,RadioNodeList*/

import { Kits } from '../scripts/frontend.js';

export default class CheckOption extends HTMLElement {
	static observedAttributes = ['required'];
	static formAssociated = true;
	static selected = {};
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

		this.name = this.getAttribute('name');
		this.template = Kits.getTemplate(this,'check-option');
		this.template.label.textContent = this.getAttribute('label');
		this.template.container.addEventListener('click',this,false);

		this.shadowRoot.appendChild(this.template.fragment);

		const list = this.internals.form.elements[this.name];

		if (list instanceof RadioNodeList) {
			CheckOption.selected[this.name] ??= document.createElement('input');
		}

	}
	onclick(event) {}
	handleEvent(event) {
		switch (event.type) {
			case 'click':
				this.checked = this.checked ? false : true;
				this.onclick(event);
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
	get checked() {
		return this.template.input.checked;
	}
	set checked(value) {

		if (value) {
			this.internals.states.add('checked');
		} else {
			this.internals.states.delete('checked');
		}

		this.template.input.checked = value;
		this.internals.setFormValue(value);

		const list = this.internals.form.elements[this.name];
		const unique = list instanceof RadioNodeList;
		const current = CheckOption.selected[this.name];

		if (unique && current != this) {
			CheckOption.selected[this.name].checked = false;
			CheckOption.selected[this.name] = this;
		}

	}
	attributeChangedCallback(name,oldValue,newValue) {
		this.template.input[name] = newValue;
	}
	disconnectedCallback() {
		this.template.container.removeEventListener('click',this,false);
	}
}

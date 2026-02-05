/*global document,HTMLElement*/

import { Kits } from '../scripts/frontend.js';

export default class TabTextarea extends HTMLElement {
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

		this.template = Kits.getTemplate(this,'tab-textarea');

		this.template.textarea.addEventListener('keydown',this,false);
		this.template.textarea.addEventListener('blur',this,false);

		this.shadowRoot.appendChild(this.template.fragment);

	}
	handleEvent(event) {
		switch (event.type) {
			case 'blur':
				this.internals.setFormValue(this.template.textarea.value);
				break;
			default:
				if (event.key == 'Tab') {
					event.preventDefault();
					const start = this.template.textarea.selectionStart;
					const end = this.template.textarea.selectionEnd;
					this.template.textarea.value = [
						this.template.textarea.value.substring(0,start),
						this.template.textarea.value.substring(end)
					].join('\t');
					this.template.textarea.selectionStart = start+1;
					this.template.textarea.selectionEnd = start+1;
				}
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
		return this.template.textarea.value;
	}
	set value(text) {
		this.template.textarea.value = text;
		this.internals.setFormValue(text);
	}
	attributeChangedCallback(name,oldValue,newValue) {
		this.template.textarea[name] = newValue;
	}
	disconnectedCallback() {
		this.template.textarea.removeEventListener('keydown',this,false);
		this.template.textarea.removeEventListener('blur',this,false);
	}
}

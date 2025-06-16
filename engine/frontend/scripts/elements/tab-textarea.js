
import { Index,IO } from '../frontend.js';

export class TabTextarea extends HTMLElement {
	#template;
	#shadowRoot;
	#internals;
	static formAssociated = true;
	constructor() {

		super();

		const options = {
			mode: 'open',
			delegatesFocus: true
		}

		this.#template = Index.getTemplate('tab-textarea');
		this.#shadowRoot = this.attachShadow(options);
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
	handleEvent(event) {
		switch (event.type) {
			case 'change':
				this.#internals.setFormValue(event.target.value);
				break;
			case 'keydown':
				if (event.code == 'Tab') {
					event.preventDefault();
					const position = event.target.selectionStart;
					const start = event.target.value.substring(0,position);
					const end = event.target.value.substring(event.target.selectionEnd);
					event.target.value = start+'\t'+end;
					event.target.selectionStart = event.target.selectionEnd = position + 1;
				}
		}
	}
	connectedCallback() {
		this.value = this.innerHTML;
		this.#template.input.addEventListener('change',this,false);
		this.#template.input.addEventListener('keydown',this,false);
		this.#shadowRoot.appendChild(this.#template.fragment);
	}
}

window.customElements.define('tab-textarea',TabTextarea);

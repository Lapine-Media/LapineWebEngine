
import { Site } from '../frontend.js';

export class TabTextarea extends HTMLElement {
	#template;
	#internals;
	#abortController;
	static formAssociated = true;
	constructor() {
		super();
		const options = {
			mode: 'open',
			delegatesFocus: true
		}
		this.#abortController = new AbortController();
		this.#internals = this.attachInternals();
		this.attachShadow(options);
	}
	get form() {
		return this.#internals.form;
	}
	set name(value) {
		this.setAttribute('name',value);
		this.#template.select.name = value;
	}
	get name() {
		return this.getAttribute('name');
	}
	set value(value) {
		this.#internals.setFormValue(value);
		this.#template.input.value = value;
	}
	get value() {
		return this.#template.input.value;
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
	async connectedCallback() {
		try {
			const options = {signal: this.#abortController.signal};
			this.#template = await Site.getTemplate('tab-textarea');
			this.#template.input.value = this.innerHTML;
			this.#template.input.className = this.className;
			this.#template.input.addEventListener('change',this,options);
			this.#template.input.addEventListener('keydown',this,options);
			this.#internals.setFormValue(this.innerHTML);
			this.shadowRoot.appendChild(this.#template.fragment);
		} catch (error) {
			console.log(error);
		}

	}
	disconnectedCallback() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
        }
	}
}

window.customElements.define('tab-textarea',TabTextarea);

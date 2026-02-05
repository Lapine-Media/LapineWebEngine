
import { Index } from '../frontend.js';

export class SelectItem extends HTMLElement {
	#template;
	#internals;
	static formAssociated = true;
	static observedAttributes = ['id','name','value'];
	constructor() {
		super();
		this.#internals = this.attachInternals();
		this.#template = Index.getTemplate('select-item');
		const options = {
			mode: 'open',
			delegatesFocus: true
		}
		this.attachShadow(options);
	}
	set name(value) {
		this.setAttribute('name',value);
	}
	get name() {
		return this.getAttribute('name');
	}
	set value(value) {
		this.setAttribute('value',value);
	}
	get value() {
		return this.getAttribute('value');
	}
	attributeChangedCallback(name,oldValue,newValue) {
		switch (name) {
			case 'id':
				this.#template.select.id = newValue;
				break;
			case 'name':
				this.#template.select.name = newValue;
				break;
			case 'value':
				this.#template.select.value = newValue;
				this.#internals.setFormValue(newValue);
		}
	}
	connectedCallback() {
		this.#template.select.addEventListener('change',this,false);
		this.#template.button.addEventListener('click',this,false);
		this.#template.slot.addEventListener('slotchange',this,false);
		this.#internals.setFormValue(this.#template.select.value);
		this.shadowRoot.appendChild(this.#template.fragment);
	}
	addItem(value,title) {
		const element = document.createElement('option');
		element.textContent = title;
		element.value = value;
		this.append(element);
	}
	handleEvent(event) {
		let options;
		switch (event.type) {
			case 'slotchange':
				Index.slotChange(this.#template.slot,this.#template.select);
				break;
			case 'change':
				this.value = this.#template.select.value;
				break;
			case 'click':
				this.value = this.#template.select.value;
				options = {
					submitter: this,   // Identify THIS custom element as the submitter
					bubbles: true,     // Essential so the form's parent can also hear it
					cancelable: true   // Allows listeners to call event.preventDefault()
				};
				const submitEvent = new SubmitEvent('submit',options);
				this.#internals.form.dispatchEvent(submitEvent);
		}
	}
}

window.customElements.define('select-item',SelectItem);

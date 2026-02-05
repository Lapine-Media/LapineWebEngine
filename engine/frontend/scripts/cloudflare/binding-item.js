
import { Index,IO } from '../frontend.js';

export class BindingItem extends HTMLElement {
	#template;
	#abortController;
	#data;
	constructor(binding_environment,binding_path,binding_type,data) {
		super();
		this.#data = {binding_environment,binding_path,binding_type,...data};
		this.#template = Index.getTemplate('binding-item');

		this.attachShadow({mode: 'open'});
	}
	get data() {
		return this.#data;
	}
	connectedCallback() {

		this.#abortController = new AbortController();
		const options = {signal: this.#abortController.signal};
		const {binding_path,binding,name,...rest} = this.#data;
		let entries = Object.entries(rest);

		this.#template.binding.textContent = binding || name;
		this.#template.type.textContent = binding_path;
		this.#template.edit.addEventListener('click',this,options);

		switch (binding_path) {
			case 'd1_databases':
			case 'r2_buckets':
				this.#template.run.addEventListener('click',this,options);
				break;
			default:
				this.#template.run.remove();
		}

		switch (binding_path) {
			case 'vars':
				this.#template.binding.textContent = ' ...';
			case 'assets':
			case 'services':
				this.#template.use.setAttribute('href','#workers');
				break;
			case 'durable_objects.bindings':
				this.#template.type.textContent = 'durable_objects';
				this.#template.use.setAttribute('href','#durable_objects');
				break;
			case 'queues.consumers':
				this.#template.title.textContent = 'Consumer';
			case 'queues.producers':
				this.#template.type.textContent = 'queues';
				this.#template.use.setAttribute('href','#queues');
				break;
			default:
				this.#template.use.setAttribute('href','#'+binding_path);
		}

		for (const [key,value] of entries) {
			const skip = ['binding_environment','binding_type'].includes(key);
			if (skip) continue;
			const span = document.createElement('span');
			const strong = document.createElement('strong');
			const text = document.createTextNode(value == '[object Object]' ? '{...}' : value);
			strong.textContent = key;
			span.append(strong);
			span.append(text);
			this.#template.data.append(span);
		}

		this.shadowRoot.appendChild(this.#template.fragment);

	}
	handleEvent(event) {
		switch (event.target) {
			case this.#template.edit:
				IO.sendSignal(true,'environments','edit','binding',this);
				break;
			case this.#template.run:
				IO.sendSignal(true,'environments','open','editor',this);
				break;
		}
	}
	disconnectedCallback() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
        }
	}
}

window.customElements.define('binding-item',BindingItem);

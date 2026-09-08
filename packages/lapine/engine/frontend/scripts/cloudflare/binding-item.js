
import { Site,IO } from '../frontend.js';

export class BindingItem extends HTMLElement {
	#abortController;
	#template;
	#data;
	constructor(binding_environment,binding_path,binding_type,data) {
		super();
		this.#data = {binding_environment,binding_path,binding_type,...data};
		this.#abortController = new AbortController();
		const options = {mode: 'open'};
		this.attachShadow(options);
	}
	get data() {
		return this.#data;
	}
	disable() {
		this.setAttribute('disabled','');
	}
	enable() {
		this.removeAttribute('disabled');
	}
	async connectedCallback() {
		const options = {signal: this.#abortController.signal};
		const {binding_path,binding,name,...rest} = this.#data;
		const action = () => IO.sendSignal(true,'environments','edit','binding',this);
		//let entries = Object.entries(rest);

		this.#template = await Site.getTemplate('binding-item');
		this.#template.binding.textContent = binding || name;
		this.#template.type.textContent = binding_path;

		this.addEventListener('click',action,options);

		switch (binding_path) {
			case 'd1_databases':
				this.#template.name.textContent = this.#data.database_name;
				break;
			case 'r2_buckets':
				this.#template.name.textContent = this.#data.bucket_name;
				break;
			case 'assets':
				this.#template.name.textContent = this.#data.directory;
				break;
			case 'durable_objects.bindings':
				this.#template.name.textContent = this.#data.class_name;
				break;
			default:
				this.#template.name.textContent = 'Blergh';
		}

		switch (binding_path) {
			case 'vars':
				this.#template.binding.textContent = ' ...';
			case 'assets':
			case 'services':
				this.#template.icon.setAttribute('use','workers');
				break;
			case 'durable_objects.bindings':
				this.#template.type.textContent = 'durable_objects';
				this.#template.icon.setAttribute('use','durable_objects');
				break;
			case 'queues.consumers':
				this.#template.title.textContent = 'Consumer';
			case 'queues.producers':
				this.#template.type.textContent = 'queues';
				this.#template.icon.setAttribute('use','queues');
				break;
			default:
				this.#template.icon.setAttribute('use',binding_path);
		}

		/*for (const [key,value] of entries) {
			const skip = ['binding_environment','binding_type'].includes(key);
			if (skip) continue;
			const span = document.createElement('span');
			const strong = document.createElement('strong');
			const text = document.createTextNode(value == '[object Object]' ? '{...}' : value);
			strong.textContent = key;
			span.append(strong);
			span.append(text);
			this.#template.data.append(span);
		}*/

		this.shadowRoot.appendChild(this.#template.fragment);

	}
	disconnectedCallback() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
        }
	}
}

window.customElements.define('binding-item',BindingItem);

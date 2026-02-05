
import { Index,IO,Tools } from '../frontend.js';

export class D1Item extends HTMLElement {
	#template;
	#abortController;
	#data;
	#bound;
	constructor(data,bound) {
		super();
		this.#data = data;
		this.#bound = bound;
		this.#template = Index.getTemplate('d1-item');
		this.attachShadow({mode: 'open'});
	}
	get data() {
		return this.#data;
	}
	get bound() {
		return this.#bound;
	}
	set info(data) {
		this.#template.running_in_region.textContent = data.running_in_region;
		this.#template.read_queries_24h.textContent = data.read_queries_24h;
		this.#template.write_queries_24h.textContent = data.write_queries_24h;
		this.#template.read_replication.textContent = data.read_replication.mode;
		this.#template.rows_read_24h.textContent = data.rows_read_24h;
		this.#template.rows_written_24h.textContent = data.rows_written_24h;
		this.#template.container.dataset.info = true;
	}
	handleEvent(event) {
		IO.sendSignal(true,'d1',event.target.value,'database',this);
	}
	connectedCallback() {

		this.#abortController = new AbortController();
		const options = {signal: this.#abortController.signal};

		this.#template.info.addEventListener('click',this,options);
		this.#template.remove.addEventListener('click',this,options);

		this.#template.container.dataset.bound = this.#bound;
		this.#template.created_at.textContent = Tools.formatTimestamp(this.#data.created_at);
		this.#template.file_size.textContent = Tools.formatFileSize(this.#data.file_size || 0);
		this.#template.name.textContent = this.#data.name;
		this.#template.num_tables.textContent = this.#data.num_tables || 0;
		this.#template.uuid.textContent = this.#data.uuid;
		this.#template.version.textContent = this.#data.version;

		this.shadowRoot.appendChild(this.#template.fragment);
	}
	disconnectedCallback() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
        }
	}
}

window.customElements.define('d1-item',D1Item);

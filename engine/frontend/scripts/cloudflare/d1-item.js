
import { Index,IO,Tools } from '../frontend.js';

export class D1Item extends HTMLElement {
	data;
	#signal = 'd1-item';
	constructor(data) {
		super();
		this.data = data;
		this.attachShadow({mode: 'open'});
	}
	setBound() {
		this.template.container.dataset.bound = true;
	}
	handleEvent(event) {
		switch (event.type) {
			case 'click':
				if (event.target.value == 'bind') {
					IO.signal('bindings','add','options',this);
				} else {
					IO.send('d1','database','info',this.data);
				}
				break;
			case this.#signal:
				if (event.detail.name == this.data.name) {
					if (event.detail.value == 'info') {
						this.template.running_in_region.textContent = event.detail.data.running_in_region;
						this.template.read_queries_24h.textContent = event.detail.data.read_queries_24h;
						this.template.write_queries_24h.textContent = event.detail.data.write_queries_24h;
						this.template.read_replication.textContent = event.detail.data.read_replication.mode;
						this.template.rows_read_24h.textContent = event.detail.data.rows_read_24h;
						this.template.rows_written_24h.textContent = event.detail.data.rows_written_24h;
						this.template.container.dataset.info = true;
					} else {
						const message = IO.getMessage('danger','Let\'s try that again','Sometimes the API authentication fails for unknown reason. Try again, or check your API token permissions.');
						message.display();
					}
				}
		}
	}
	connectedCallback() {
		this.template = Index.getTemplate('d1-item');

		this.template.created_at.textContent = Tools.formatTimestamp(this.data.created_at);
		this.template.file_size.textContent = Tools.formatFileSize(this.data.file_size || 0);
		this.template.name.textContent = this.data.name;
		this.template.num_tables.textContent = this.data.num_tables || 0;
		this.template.uuid.textContent = this.data.uuid;
		this.template.version.textContent = this.data.version;

		this.template.info.addEventListener('click',this,false);

		if (this.data.binding) {
			this.template.container.dataset.bound = true;
		} else {
			this.template.bind.addEventListener('click',this,false);
		}

		window.addEventListener(this.#signal,this,false);

		this.shadowRoot.appendChild(this.template.fragment);
	}
	disconnectedCallback() {
		window.removeEventListener(this.#signal,this,false);
	}
}

window.customElements.define('d1-item',D1Item);

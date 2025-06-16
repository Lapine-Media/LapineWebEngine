
import { Index,IO } from '../frontend.js';

export class BindingItem extends HTMLElement {
	data;
	constructor(environment,type,data) {
		super();
		this.data = {environment,type,...data};
		this.attachShadow({mode: 'open'});
	}
	update(data) {
		console.log(data);
	}
	connectedCallback() {

		const template = Index.getTemplate('binding-item');
		const {binding,type,environment,...rest} = this.data;
		const entries = Object.entries(rest);

		template.binding.textContent = binding;
		template.type.textContent = type;

		template.edit.onclick = () => IO.signal('bindings','remove','options',this);

		switch (type) {
			case 'd1_databases':
				template.run.onclick = () => IO.signal('d1','editor','start options',this.data);
				break;
			case 'r2_buckets':
				template.run.onclick = () => IO.signal('r2','editor','start options',this.data);
				break;
			default:
				template.run.remove();
		}

		for (const [key,value] of entries) {
			const dt = document.createElement('dt');
			const dd = document.createElement('dd');
			dt.textContent = key.replaceAll('_',' ');
			dd.textContent = value;
			template.data.append(dt,dd);
		}

		this.data.item = {
			d1_databases: 'database_name',
			r2_buckets: 'bucket_name',
			kv_namespaces: 'id',
			services: 'services',
			analytics_engine_datasets: 'dataset',
			workflows: this.data.name,
			durable_objects: this.data.name,
			queues: this.data.queue,
			assets: this.data.directory,
			//vars: this.data.join(':'),
			images: 'images',
			ai: 'ai'
		}[type];

		this.shadowRoot.appendChild(template.fragment);

	}
}

window.customElements.define('binding-item',BindingItem);

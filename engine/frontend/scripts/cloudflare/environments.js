
import { Index,IO,Settings,Overlay,EnvironmentItem,BindingItem } from '../frontend.js';

const methods = {
	values: {
		d1_databases: {
			database_name: 'name',
			database_id: 'uuid',
			preview_database_id: null,
			migrations_dir: null
		},
		r2_buckets: {
			bucket_name: 'name',
			preview_bucket_name: null
		},
		durable_objects: {},
		kv_namespaces: {},
		queues: {},
		services: {},
		vars: {},
		assets: {},
		images: {},
		analytics_engine_datasets: {},
		ai: {},
		workflows: {}
	},
	listEnvironments: function(wrangler) {
		console.log(wrangler);
		Settings.wrangler = wrangler;
		Settings.bindings = {};

		const fragment = document.createDocumentFragment();
		const types = Object.keys(this.values);
		const environments = [
			'top',
			...(wrangler.env ? Object.keys(wrangler.env) : [])
		];

		for (const name of environments) {
			const object = name == 'top' ? wrangler : wrangler.env[name];
			const environment = new EnvironmentItem(name);
			fragment.append(environment);

			for (const type of types) {
				if (object[type] != undefined) {
					const addBinding = data => {
						const binding = new BindingItem(name,type,data);
						Settings.bindings[data.binding] = binding.data;
						environment.append(binding);
					}
					switch (type) {
						case 'durable_objects':
							object[type].bindings.map(addBinding);
							break;
						case 'queues':
							object[type].producers.map(addBinding);
							break;
						case 'vars':
							const data = object[type];
							Object.entries(data).map(addBinding);
							break;
						case 'assets':
						case 'images':
						case 'ai':
							const item = object[type];
							addBinding(item);
							break;
						default:
							object[type].map(addBinding);
					}
				}
			}
		}

		Index.update(Index.elements.subpage.environment_items,fragment);

	}
}

export const Environments = new class {
	constructor() {
		window.addEventListener('environments',this,false);
	}
	async handleEvent(event) {
		switch (event.detail.name+' '+event.detail.value) {
			case 'menu visible':
				if (Settings.wrangler) {
					methods.listEnvironments(Settings.wrangler);
				} else {
					IO.send('cloudflare','environments','load');
				}
				break;
			case 'wrangler loaded':
				methods.listEnvironments(event.detail.data);
				break;
			case 'add environment options':
				Overlay.open('Add environment','/markup/cloudflare/environments_add.html');
				break;
			case 'add environment confirm':
				IO.send('cloudflare','environment','add',event.detail.data);
				Overlay.close();
				break;
			case 'environment added':
				const message = IO.getMessage('accept','Environment added','Your wrangler file has been edited.');
				message.display(true);
				methods.listEnvironments(event.detail.data);
				break;
			default:
				console.log(event.detail);
		}
	}
}

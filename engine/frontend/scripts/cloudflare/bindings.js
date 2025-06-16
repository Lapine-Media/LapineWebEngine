
import { Settings,Index,IO,Overlay,BindingItem } from '../frontend.js';

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
	listBindings: function(wrangler) {

		Settings.bindings = {};

		const fragment = document.createDocumentFragment();
		const types = Object.keys(this.values);
		const environments = [
			'top',
			...(wrangler.env ? Object.keys(wrangler.env) : [])
		];

		for (const environment of environments) {
			const object = environment == 'top' ? wrangler : wrangler.env[environment];
			for (const type of types) {
				if (object[type] != undefined) {
					const addItem = data => {
						const element = new BindingItem(environment,type,data);
						Settings.bindings[data.binding] = element.data;
						fragment.append(element);
					}
					switch (type) {
						case 'durable_objects':
							object[type].bindings.map(addItem);
							break;
						case 'queues':
							object[type].producers.map(addItem);
							break;
						case 'vars':
							const data = object[type];
							Object.entries(data).map(addItem);
							break;
						case 'assets':
						case 'images':
						case 'ai':
							const item = object[type];
							addItem(item);
							break;
						default:
							object[type].map(addItem);
					}
				}
			}
		}

		Index.update(Index.elements.subpage.binding_items,fragment);

	},
	fillBindingForm: function(data) {
		const form = document.forms.binding;

		form.elements.type.value = data.type;
		form.elements[data.type].removeAttribute('hidden');
		form.elements.add.removeAttribute('hidden');

		const object = this.values[data.type];
		const entries = Object.entries(object);

		for (const [key, value] of entries) {
			if (value) {
				form.elements[key].value = data[value];
			}
		}
	},
	getBindingData: function(input) {
		if (Settings.bindings[input.binding] != undefined) {
			return {error: 'A binding with the name "'+input.binding+'" already exist.'}
		}
		if (input.environment.trim() === '') {
			input.environment = 'top';
		}

		const {environment,type,binding} = input;
		const output = {environment,type,binding};
		const object = this.values[type];
		const extract = key => output[key] = input[key];

		Object.keys(object).map(extract);

		return output;
	}
}

export const Bindings = new class {
	constructor() {
		window.addEventListener('bindings',this,false);
	}
	async handleEvent(event) {
		switch (event.detail.name+' '+event.detail.value) {
			case 'menu visible':
				if (Settings.wrangler) {
					methods.listBindings(Settings.wrangler);
				} else {
					IO.send('cloudflare','bindings','list',null);
				}
				break;
			case 'list loaded':
				Settings.wrangler = event.detail.data;
				methods.listBindings(event.detail.data);
				break;
			case 'add options': {
				const element = event.detail.data;
				Overlay.data = element;
				await Overlay.open('Add binding','/markup/cloudflare/bindings_add.html');
				methods.fillBindingForm(element.data);
			} break;
			case 'add confirm': {
				const data = methods.getBindingData(event.detail.data);
				if (data.error) {
					const message = IO.getMessage('reject','Error',data.error);
					message.display();
				} else {
					console.log(data);
					IO.send('cloudflare','bindings','add',data);
				}
			} break;
			case 'add saved': {
				const {wrangler,binding,environment} = event.detail.data;
				Settings.wrangler = wrangler;
				let text = 'Binding "'+binding+'" has been added to the "'+environment+'" environment.';
				if (environment == 'top') {
					text = 'Binding "'+binding+'" has been added to the top environment.';
				}
				const message = IO.getMessage('accept','Binding added',text+' Your wrangler file has been edited.');
				message.display(true);
				Overlay.data.setBound();
				Overlay.close();
			} break;
			case 'remove options': {
				const element = event.detail.data;
				Overlay.data = element;
				const signal = IO.getSignal('bindings','remove','confirm',element.data);
				const message = IO.getMessage('danger','Are you sure?','This will remove the binding.');
				message.addButton('accept','Remove',signal);
				message.addButton('reject','Cancel');
				message.display();
			} break;
			case 'remove confirm': {
				IO.send('cloudflare','bindings','remove',event.detail.data);
				Overlay.data.remove();
				Overlay.close();
			} break;
			case 'remove saved': {
				const {wrangler,binding,environment} = event.detail.data;
				Settings.wrangler = wrangler;
				delete Settings.bindings[binding];
				const message = IO.getMessage('accept','Binding removed','Your wrangler file has been edited.');
				message.display(true);
			} break;
			default:
				console.log(event.detail);
		}
	}
	remove(type,data) {
		console.log(type,data);
		//IO.send('cloudflare','bindings','remove',event.detail.data);
	}
}

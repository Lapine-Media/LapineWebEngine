
import { Site,IO,Overlay,Project } from '../frontend.js';

export const DurableObjects = new class {
	#loaded = false;
	#list = Promise.withResolvers();
	constructor() {
		window.addEventListener('durable_objects',this,false);
	}
	async handleEvent(event) {
		try {
			const {name,value,data} = event.detail;
			switch (name+' '+value) {
				case 'inspect namespace':
					Overlay.setData('namespace',data.data);
					Overlay.open('Inspect namespace','/markup/cloudflare/durable_objects/inspect_namespace.html');
					break;
				default:
					console.log(name,value,data);
			}
		} catch (error) {
			console.log(error);
		}
	}
	getList(force = false) {
		if (this.#loaded == false || force) {
			this.#loaded = true;
			const order = (a,b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
			const signal = response => {
				response.data.sort(order);
				this.#list.resolve(response.data);
			};
			IO.sendSignal(false,'durable_objects','list','namespaces',null,signal);
		}
		return this.#list.promise;
	}
	getBindings() {
		const list = [];
		const environments = Project.getEnvironments();
		const add = environment => {
			const scope = environments.scope(environment);
			if (scope && scope.durable_objects) {
				for (const item of scope.durable_objects.bindings) {
					list.push(item.name);
				}
			}
		}
		environments.list.forEach(add);
		return list;
	}
	getObjects(data) {
		const list = Promise.withResolvers();
		const signal = response => list.resolve(response.data);
		IO.sendSignal(false,'durable_objects','list','objects',data,signal);
		return list.promise;
	}
}

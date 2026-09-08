
import { Site,Project,Overlay,Output,IO,EnvironmentItem,BindingItem,LapineMessage,D1Editor } from '../frontend.js';

export const Environments = new class {
	#bindings = [
		'ai',
		'analytics_engine_datasets',
		'assets',
		'browser',
		'd1_databases',
		'durable_objects.bindings',
		'images',
		'kv_namespaces',
		'queues.producers',
		'queues.consumers',
		'r2_buckets',
		'services',
		'vars'
	];
	constructor() {
		window.addEventListener('environments',this,false);
	}
	async handleEvent(event) {
		event.preventDefault();
		switch (event.type) {
			case 'environments':
				const {name,value,data} = event.detail;
				this.action(name,value,data);
				break;
		}
	}
	async action(name,value,data) {
		let signal;
		switch (name+' '+value) {
			case 'page visible':
				this.listEnvironments();
				break;
			case 'edit binding':
				this.editBinding(data,data.data);
				break;
			case 'bind '+value:
				data = Overlay.getData();
				signal = () => Site.fillForm(Site.elements.overlay.binding,data);
				Overlay.close();
				Overlay.open('Add binding','/markup/cloudflare/bindings/'+value+'.html',signal,null,'add');
				break;
			case 'add environment':

				break;
			case 'edit environment':
				signal = () => Site.fillForm(Site.elements.overlay.environment,data);
				Overlay.setData('binding_environment',data.name);
				Overlay.open('Edit environment','/markup/cloudflare/bindings/environments_edit.html',signal,null,data.name);
				break;
			case 'save binding':

				break;
			case 'remove binding':

				break;
			default:
				console.log(name,value,data);
		}
	}
	editBinding(element,data) {
		let message;
		const fillForm = () => Site.fillForm(Site.elements.overlay.binding,data);
		const openSettings = () => Overlay.open('Edit binding','/markup/cloudflare/bindings/'+data.binding_path+'.html',fillForm,null,'edit');
		const openEditor = () => {
			element.disable();
			Output.setEditorMode(true);
			const signal = details => {
				IO.sendSignal(true,'cloudflare','open','editor',details.data);
				element.enable();
			};
			IO.sendSignal(false,'cloudflare','start','editor',data,signal);
		}
		switch (data.binding_path) {
			case 'd1_databases':
				message = new LapineMessage('inform','Options','Edit the binding settings or open the D1 database manager?');
				message.addButton('accept','Edit binding',openSettings);
				message.addButton('accept','Open D1 manager',openEditor);
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			default:
				openSettings();
		}
	}
	listEnvironments() {
		const environments = Project.getEnvironments();
		const fragment = document.createDocumentFragment();
		for (const environment of environments.list) {
			const environmentItem = new EnvironmentItem(environment);
			fragment.append(environmentItem);

			for (const pathStr of this.#bindings) {
				const scope = environments.scope(environment);
				if (!scope) continue;

				const [parent, child] = pathStr.split('.');
				if (!scope[parent]) continue;

				const target = child ? scope[parent][child] : scope[parent];
				const addItem = (data,isObject) => {
					const type = isObject === true ? 'object' : 'array';
					const bindingItem = new BindingItem(environment,pathStr,type,data);
					environmentItem.append(bindingItem);
				}

				if (Array.isArray(target)) {
					target.forEach(addItem);
				} else if (target) {
					addItem(target,true);
				}
			}
		}

		Site.clearElement(Site.elements.subpage.environment_items,fragment);
	}
	editEnvironment() {

	}
}

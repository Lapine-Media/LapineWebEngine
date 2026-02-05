
import { Index,IO,Settings,Overlay,LapineMessage,EnvironmentItem,BindingItem } from '../frontend.js';

export const Environments = new class {
	#bindings = ['ai', 'analytics_engine_datasets', 'assets', 'browser', 'd1_databases', 'durable_objects.bindings', 'images', 'kv_namespaces', 'queues.producers', 'queues.consumers', 'r2_buckets', 'services', 'vars'];
	constructor() {
		window.addEventListener('environments',this,false);
	}
	async handleEvent(event) {
		let message,signal,data,element;
		switch (event.detail.name+' '+event.detail.value) {
			case 'menu visible':
				this.#listEnvironments();
				break;
			case 'add environment':
				signal = () => {
					document.forms.edit_environment.elements.environment.value = 'add';
				};
				Overlay.open('Add environment','/markup/cloudflare/environments_edit.html',signal,'add');
				break;
			case 'edit environment':
				signal = () => {
					document.forms.edit_environment.elements.name.value = event.detail.data;
					document.forms.edit_environment.elements.environment.value = event.detail.data;
				};
				Overlay.open('Edit environment','/markup/cloudflare/environments_edit.html',signal,'edit');
				break;
			case 'save environment':
				this.#editEnvironment(event.detail.data);
				break;
			case 'remove environment':
				signal = () => IO.sendSignal(false,'cloudflare','remove','environment',event.detail.data);
				message = new LapineMessage('danger','Are you sure?','Removing this environment will also remove all its bindings.');
				message.addButton('accept','Proceed',signal);
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			case 'bind environment':
				signal = () => {
					const data = {binding_environment: event.detail.data.name};
					Index.fillForm(document.forms.bindings,data);
				}
				Overlay.setData('environment-item',event.detail.data);
				Overlay.open('Select binding','/markup/cloudflare/bindings/bindings.html',signal);
				break;
			case 'select binding':
				data = event.detail.data;
				element = Overlay.getData('environment-item');
				const existing = this.#checkExistingObject(element,data.binding_path);
				if (existing) {
					const path = data.binding_path.toUpperCase();
					signal = () => IO.sendSignal(true,'environments','edit','binding',existing);
					message = new LapineMessage('inform','Binding already exist','Only one instance of '+path+' is allowed, and there is already an existing binding. If you proceed, you will be editing the existing one.');
					message.addButton('accept','Edit existing',signal);
					message.addButton('reject','Cancel',null);
					message.display(false);
				} else {
					signal = () => Index.fillForm(document.forms.bindings,data);
					Overlay.close();
					Overlay.open('Add binding','/markup/cloudflare/bindings/'+data.binding_path+'.html',signal,'bindings add');
				}
				break;
			case 'add binding':
				element = Overlay.getData('environment-item');
				this.#addBinding(element,event.detail.data,null);
				break;
			case 'edit binding':
				data = event.detail.data.data;
				signal = () => {
					data = this.#specialFieldHandler(true,data);
					Index.fillForm(document.forms.bindings,data);
				};
				Overlay.setData('binding-item',event.detail.data);
				Overlay.open('Edit binding','/markup/cloudflare/bindings/'+data.binding_path+'.html',signal,'bindings edit');
				break;
			case 'save binding':
				element = Overlay.getData('binding-item');
				const oldName = element.data.binding || element.data.name;
				const newName = event.detail.data.binding || event.detail.data.name;
				if (newName != oldName && event.detail.data.binding_type == 'array') {
					signal = () => this.#addBinding(element.parentNode,event.detail.data,element);
					message = new LapineMessage('danger','Saving as duplicate','This will create a new binding because the name has changed. Make sure to delete the old binding if you no longer need it.');
					message.addButton('accept','Add duplicate',signal);
					message.addButton('reject','Cancel',null);
					message.display(false);
				} else {
					this.#addBinding(element.parentNode,event.detail.data,element);
				}
				break;
			case 'remove binding':
				signal = () => IO.sendSignal(false,'cloudflare','remove','binding',event.detail.data);
				message = new LapineMessage('danger','Are you sure?','This will remove the binding.');
				message.addButton('accept','Remove binding',signal);
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			case 'environment added':
			case 'environment edited':
			case 'environment removed':
			case 'binding added':
			case 'binding edited':
			case 'binding removed':
				Overlay.close();
				Overlay.clearData();
				const string = event.detail.name+' '+event.detail.value;
				const title = string.charAt(0).toUpperCase()+string.slice(1);
				message = new LapineMessage('accept',title,'Your wrangler file has been updated.');
				message.display(true);
				Settings.wrangler = event.detail.data;
				this.#listEnvironments();
				break;
			case 'open editor':
				console.log(event.detail.data.data);
				IO.sendSignal(false,'cloudflare','start','editor',event.detail.data.data);
				break;
			case 'editor closed':
				document.body.dataset.editor = false;
				message = new LapineMessage('reject','An error has occured','Something caused the editor to close. Check the Output window for more information.');
				message.display(false);
				break;
			default:
				console.log(event.detail);
		}
	}

	// ENVIRONMENTS ///////////////////////////////////////////////////////////

	#listEnvironments() {
		const wrangler = Settings.wrangler;
		const fragment = document.createDocumentFragment();
		const environments = [
			'top',
			...(wrangler.env ? Object.keys(wrangler.env) : [])
		];

		for (const environment of environments) {

			const environmentItem = new EnvironmentItem(environment);
			fragment.append(environmentItem);

			for (const pathStr of this.#bindings) {
				const scope = environment === 'top' ? wrangler : wrangler.env[environment];
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

		Index.update(Index.elements.subpage.environment_items, fragment);
	}
	#editEnvironment(data) {
		let message;
		const name = data.name = data.name.toLowerCase();
		switch (true) {
			case name == '':
				message = new LapineMessage('reject','Missing name','The environment name can\'t be empty.');
				message.display(false);
				return;
			case name == 'add':
			case name == 'top':
				message = new LapineMessage('reject','Bad name','The environment name can\'t be "'+name+'".');
				message.display(false);
				return;
			case Settings.wrangler.env && typeof Settings.wrangler.env[name] == 'object':
				message = new LapineMessage('reject','Already existing','An environment named "'+name+'" already exist.');
				message.display(false);
				break;
			case data.environment == 'add':
				IO.sendSignal(false,'cloudflare','add','environment',data);
				break;
			case name != data.environment:
				IO.sendSignal(false,'cloudflare','edit','environment',data);
				break;
			default:
				Overlay.close();
		}
	}

	// BINDINGS ///////////////////////////////////////////////////////////////

	#addBinding(environmentItem,input,bindingItem = null) {
		try {
			const context = bindingItem ? 'edit' : 'add';
			const data = this.#specialFieldHandler(false,input);
			const list = environmentItem.children;
			const checkCollisions = postedBinding => {
				for (const sibling of list) {
					if (sibling === bindingItem) continue;
					const listedBinding = sibling.data.binding || sibling.data.name;
					if (listedBinding == postedBinding) {
						const type = sibling.data.binding_path.split('.')[0];
						const message = new LapineMessage('reject','Name conflict','"'+postedBinding+'" is already defined as an Environment Variable by '+type+'.');
						if (data.binding_path == 'vars') {
							message.text += ' Top-level variables must not share names with existing bindings.';
						}
						message.display(false);
						return true;
					}
				}
				return false;
			}
			if (data.binding_path == 'vars') {
				const keys = Object.keys(data);
				for (const key of keys) {
					const skip = ['binding_path', 'binding_type', 'binding_environment'].includes(key);
					if (skip) continue;
					const collision = checkCollisions(key);
					if (collision) return;
				}
			} else {
				const collision = checkCollisions(data.binding || data.name);
				if (collision) return;
			}
			IO.sendSignal(false,'cloudflare',context,'binding',data);
		} catch (error) {
			console.log(error);
		}
	}
	#specialFieldHandler(fillForm, data) {
		const direction = fillForm ? 'set' : 'get';
		let value;
		switch (direction + ' ' + data.binding_path) {
			case 'set assets':
				value = data.run_worker_first;
				if (value === undefined || value === null) value = false;
				data.run_worker_first = Array.isArray(value) ? value.join(' ') : String(value);
				break;
			case 'get assets':
				const raw = String(data.run_worker_first).trim();
				if (raw === 'true') {
					data.run_worker_first = true;
				} else if (raw === 'false') {
					data.run_worker_first = false;
				} else {
					data.run_worker_first = raw.split(/\s+/).filter(v => v.length > 0);
				}
				break;
			case 'set vars':
				const { binding_environment, binding_path, binding_type, ...rest } = data;
				const cleanLines = line => {
					const clean = line.replace(/,$/, '').replace(/"/g, '').replace(/^\t/, '');
					switch (true) {
						case clean.match(/:\s*[{\[]/) != null:
							return clean.replace(/:\s/, ' ');
						case clean.match(/^\s*[^:]+:\s/) != null:
							return clean.replace(/:\s/, ' = ');
						default:
							return clean;
					}
				};
				if (Object.keys(rest).length > 0) {
					data.variables = JSON.stringify(rest, null, '\t').split('\n').slice(1, -1).map(cleanLines).join('\n');
				} else {
					data.variables = '';
				}
				break;
			case 'get vars':
				const object = this.#parseObjectNotation(data.variables);
				object.binding_environment = data.binding_environment;
				object.binding_path = data.binding_path;
				object.binding_type = data.binding_type;
				data = object;
				break;
		}
		return data;
	}
	#parseObjectNotation(input) {
		const lines = input.split('\n');
		const root = {};
		const stack = [];
		let currentContainer = root;
		const parseValue = value => {
			value = value.trim().replace(/,$/, '');
			switch (true) {
				case value === 'true':
					return true;
				case value === 'false':
					return false;
				case value === 'null':
					return null;
				case value !== '' && !isNaN(Number(value)):
					return Number(value);
				default:
					return value;
			}
		};
		const advanceContext = (item,newItem) => {
			const key = item[1].trim();
			const container = { container: currentContainer };
			if (Array.isArray(currentContainer)) {
				currentContainer.push(newItem);
			} else {
				currentContainer[key] = newItem;
			}
			stack.push(container);
			currentContainer = newItem;
		};

		for (let line of lines) {

			line = line.trim();

			switch (true) {
				case line === '':
					continue;
				case line === '}':
				case line === ']':
					if (stack.length > 0) {
						const parent = stack.pop();
						currentContainer = parent.container;
					}
					continue;
			}

			const objMatch = line.match(/^(.+?)\s*\{$/);
			if (objMatch) {
				advanceContext(objMatch,{});
				continue;
			}

			const arrMatch = line.match(/^(.+?)\s*\[$/);
			if (arrMatch) {
				advanceContext(arrMatch,[]);
				continue;
			}

			const kvMatch = line.match(/^([^=]+?)\s*=\s*(.+)$/);
			if (kvMatch && !Array.isArray(currentContainer)) {
				const key = kvMatch[1].trim();
				const value = parseValue(kvMatch[2]);
				currentContainer[key] = value;
				continue;
			}

			if (Array.isArray(currentContainer)) {
				currentContainer.push(parseValue(line));
			}
		}

		return root;
	}
	#checkExistingObject(environmentItem,binding_path) {
		const list = environmentItem.children;
		for (const sibling of list) {
			if (sibling.data.binding_path == binding_path) {
				if (sibling.data.binding_type == 'object') {
					return sibling;
				}
			}
		}
		return false;
	}
}

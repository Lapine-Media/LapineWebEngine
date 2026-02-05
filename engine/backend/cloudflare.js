
import IO from './io.js';
import Settings from './settings.js';
import Worker from './worker.js';

const methods = {
	resolveScope: function(wrangler, data, create = false) {
		let container = wrangler;
		if (data.binding_environment !== 'top') {
			if (create) {
				wrangler.env ??= {};
				wrangler.env[data.binding_environment] ??= {};
			}
			if (!wrangler.env?.[data.binding_environment] && !create) {
				return null;
			}
			container = wrangler.env[data.binding_environment];
		}
		const [parent, child] = data.binding_path.split('.');
		if (child) {
			if (create) {
				container[parent] ??= {};
			}
			if (!container[parent] && !create) {
				return null;
			}
			return {
				targetObject: container[parent],
				key: child
			};
		}
		return {
			targetObject: container,
			key: parent
		};
	},
	pruneEmpty: function(obj) {
		switch (true) {
			case !obj || typeof obj !== 'object':
				return false;
			case Array.isArray(obj):
				return obj.length === 0;
		}
		for (const key in obj) {
			const empty = this.pruneEmpty(obj[key]);
			if (empty) {
				delete obj[key];
			}
		}
		return Object.keys(obj).length === 0;
	},
	updateBinding: async function(data) {
		let wrangler = await Settings.loadWrangler();
		const { binding_identity, binding_environment, binding_path, binding_type, ...binding } = data;
		const { targetObject, key } = this.resolveScope(wrangler, data, true);
		if (binding_type === 'array') {
			targetObject[key] ??= [];
			const idKey = binding.name ? 'name' : 'binding';
			const compare = item => item[idKey] === binding[idKey]
			const index = targetObject[key].findIndex(compare);
			if (index > -1) {
				targetObject[key][index] = binding;
			} else {
				targetObject[key].push(binding);
			}
		} else {
			targetObject[key] = binding;
		}
		return await Settings.saveWrangler(wrangler);
	},
	removeBinding: async function(data) {
		let wrangler = await Settings.loadWrangler();
		const scope = this.resolveScope(wrangler, data, false);
		if (!scope) {
			return wrangler;
		}
		const { targetObject, key } = scope;
		const { name, binding } = data;
		if (data.binding_type === 'array') {
			const array = targetObject[key];
			if (Array.isArray(array)) {
				const idKey = name ? 'name' : 'binding';
				const value = name || binding;
				const index = array.findIndex(item => item[idKey] === value);
				if (index > -1) {
					array.splice(index, 1);
				}
			}
		} else {
			delete targetObject[key];
		}
		this.pruneEmpty(wrangler);
		return await Settings.saveWrangler(wrangler);
	},
	addEnvironment: async function(name) {
		const object = {
			env: {
				[name]: {}
			}
		};
		return await Settings.saveWrangler(object,true);
	},
	renameEnvironment: async function(oldName,newName) {
		let wrangler = await Settings.loadWrangler();
		const envs = wrangler.env;
		const existing = envs && Object.prototype.hasOwnProperty.call(envs,oldName);
		if (existing) {
			const newEnvs = {};
			const keys = Object.keys(envs);
			for (const key of keys) {
				if (key === oldName) {
					newEnvs[newName] = envs[oldName];
				} else {
					newEnvs[key] = envs[key];
				}
			}
			wrangler.env = newEnvs;
		}
		return await Settings.saveWrangler(wrangler);
	},
	removeEnvironment: async function(name) {
		let wrangler = await Settings.loadWrangler();
		delete wrangler.env[name];
		return await Settings.saveWrangler(wrangler);
	}
}

export default async function(name,value,data) {
	try {
		let editor,wrangler,binding;
		switch (name+' '+value) {
			// ACCOUNT ////////////////////////////////////////////////////////
			case 'account whoami':
				IO.log('accept','Checking Cloudflare authentication status...');
				await IO.spawn('npx wrangler whoami --account');
				IO.log('accept','Done!');
				IO.log('line');
				break;
			// EDITOR /////////////////////////////////////////////////////////
			case 'start editor':
				if (Object.keys(Worker.instances).length > 0) {
					IO.log('danger', 'Editor is already running.');
					IO.log('line');
				} else {
					data.editor_context = {
						d1_databases: 'D1',
						r2_buckets: 'R2'
					}[data.binding_path];
					IO.log('accept', 'Starting '+data.editor_context+' editor for "'+data.binding+'"...');
					try {
						const result = await Worker.start(data);
						const options = {...data, connections: result};
						const context = {
							d1_databases: 'd1_editor',
							r2_buckets: 'r2_editor'
						}[data.binding_path];
						IO.signal(context, 'editor', 'started', options);
					} catch (error) {
						console.log(error);
						IO.log('reject', 'Failed to start editor');
					}
					IO.log('line');
				}
				break;
			case 'check editor':
				if (Worker.data && Object.keys(Worker.instances).length > 0) {
					const context = {
						d1_databases: 'd1_editor',
						r2_buckets: 'r2_editor'
					}[Worker.data.binding_path];
					IO.log('normal', Worker.data.editor_context+' editor is active.');
					IO.signal(context, 'editor', 'started', Worker.data);
					IO.log('line');
				}
				break;
			case 'stop editor':
				if (Object.keys(Worker.instances).length > 0) {
					console.log(Worker.data);
					const context = Worker.data.editor_context;
					Worker.stop();
					IO.log('accept', 'Exited '+context+' editor.');
					IO.signal('environments', 'editor', 'stopped');
					IO.log('line');
				}
				break;
			// ENVIRONMENT ////////////////////////////////////////////////////
			case 'add environment':
				IO.log('accept','Adding environment "'+data.name+'" to wrangler...');
				wrangler = await methods.addEnvironment(data.name);
				IO.signal('environments','environment','added',wrangler);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'edit environment':
				IO.log('accept','Renaming environment from "'+data.environment+'" to "'+data.name+'"...');
				wrangler = await methods.renameEnvironment(data.environment,data.name);
				IO.signal('environments','environment','edited',wrangler);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'remove environment':
				IO.log('accept','Removing environment "'+data.environment+'"...');
				wrangler = await methods.removeEnvironment(data.environment);
				IO.signal('environments','environment','removed',wrangler);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			// BINDING ////////////////////////////////////////////////////////
			case 'add binding':
				binding = data.binding || data.name;
				IO.log('accept','Adding binding "'+binding+'" to the '+data.binding_environment+' environment...');
				wrangler = await methods.updateBinding(data);
				IO.signal('environments','binding','added',wrangler);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'edit binding':
				binding = data.binding || data.name;
				IO.log('accept','Updating binding "'+binding+'" in the '+data.binding_environment+' environment...');
				wrangler = await methods.updateBinding(data);
				IO.signal('environments','binding','edited',wrangler);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'remove binding':
				binding = data.binding || data.name;
				IO.log('accept','Removing binding "'+binding+'" in the '+data.binding_environment+' environment...');
				wrangler = await methods.removeBinding(data);
				IO.signal('environments','binding','removed',wrangler);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			/*case 'api test': {
				IO.log('accept','Testing the API...');
				const request = {
					href: 'user/tokens/verify',
					method: 'get'
				}
				const response = {blergh:'blargh'};//await IO.api(request);
				//IO.signal('cloudflare','account','api',response);
				IO.signal('account','settings','loaded',response);
				IO.log('accept','Done!');
				IO.log('line');
			} break;*/
			default:
				console.log('???',name,value,data);
		}
	} catch (error) {
		console.log(error);
		IO.log('reject','Error: '+error.message);
		IO.log('line');
	}
}

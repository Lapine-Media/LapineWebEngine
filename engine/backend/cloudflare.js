
import IO from './io.js';
import Settings from './settings.js';
import Worker from './worker.js';

const methods = {
	resolveTarget: function(wrangler, environment, type) {
		let target = wrangler;
		if (environment != 'top') {
			wrangler.env ??= {};
			wrangler.env[environment] ??= {};
			target = wrangler.env[environment];
		}
		switch (true) {
			case type === 'durable_objects':
				target.durable_objects ??= {};
				target.durable_objects.bindings ??= [];
				return target.durable_objects.bindings;
			case type === 'queues':
				target.queues ??= {};
				target.queues.producers ??= [];
				return target.queues.producers;
			case ['assets', 'vars', 'images', 'ai'].includes(type):
				return target;
			default:
				target[type] ??= [];
				return target[type];
		}
	},
	cleanBindings: function(wrangler, environment, type) {
		const top = environment == 'top';
		const isEmpty = obj => (
			obj &&
			typeof obj === 'object' &&
			!Array.isArray(obj) &&
			Object.keys(obj).length === 0
		);
		const envTarget = top ? wrangler : wrangler.env?.[environment];
		let targetArray = envTarget?.[type];
		if (type === 'durable_objects') {
			targetArray = envTarget?.durable_objects?.bindings;
		} else if (type === 'queues') {
			targetArray = envTarget?.queues?.producers;
		}
		const isZero = Array.isArray(targetArray) && targetArray.length === 0;
		switch (true) {
			case type === 'durable_objects':
				if (isZero) {
					delete envTarget.durable_objects.bindings;
				}
				if (isEmpty(envTarget?.durable_objects)) {
					delete envTarget.durable_objects;
				}
				break;
			case type === 'queues':
				if (isZero) {
					delete envTarget.queues.producers;
				}
				if (isEmpty(envTarget?.queues)) {
					delete envTarget.queues;
				}
				break;
			case ['assets', 'vars', 'images', 'ai'].includes(type):
			case isZero:
				delete envTarget[type];
				break;
		}
		if (!top) {
			if (isEmpty(envTarget)) {
				delete wrangler.env[environment];
			}
			if (isEmpty(wrangler.env)) {
				delete wrangler.env;
			}
		}
	},
	updateBindings: async function(data, add = true) {
		const wrangler = await Settings.loadWrangler();
		const { type, environment, ...binding } = data;
		const target = this.resolveTarget(wrangler, environment, type);
		const isObjectType = ['assets', 'vars', 'images', 'ai'].includes(type);

		if (add) {
			if (isObjectType) {
				target[type] = binding;
			} else {
				target.push(binding);
			}
		} else {
			if (isObjectType) {
				delete target[type];
			} else if (binding.binding) {
				const index = target.findIndex(item => item.binding === binding.binding);
				if (index !== -1) {
					target.splice(index, 1);
				}
			}
			this.cleanBindings(wrangler, environment, type);
		}

		await Settings.saveWrangler(wrangler);

		return {wrangler,environment,binding: binding.binding};
	}
}

export default async function(name,value,data) {
	try {
		switch (name+' '+value) {
			case 'editor start': {
				if (Worker.instances) {
					IO.log('danger','Editor is already running.');
					IO.log('line');
				} else {
					const name = data.context.toUpperCase();
					IO.log('accept','Starting '+name+' editor.');
					data = await Worker.start(data);
					IO.signal(data.context,'editor','started',data);
					IO.log('line');
				}
			} break;
			case 'editor check': {
				if (Worker.instances) {
					const name = Worker.data.context.toUpperCase();
					IO.log('normal',name+' editor is active.');
					IO.signal(Worker.data.context,'editor','started',Worker.data);
					IO.log('line');
				}
			} break;
			case 'editor stop': {
				if (Worker.instances) {
					const data = Worker.data;
					const name = data.context.toUpperCase();
					Worker.stop();
					IO.log('accept','Exited '+name+' editor.');
					IO.signal(data.context,'editor','stopped',data);
					IO.log('line');
				}
			} break;
			case 'environments load':
				IO.log('accept','Loading wrangler settings...');
				const wrangler = await Settings.loadWrangler();
				IO.signal('environments','wrangler','loaded',wrangler);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			/*case 'bindings list': {
				IO.log('accept','Loading list of bindings...');
				const wrangler = await Settings.loadWrangler();
				IO.signal('bindings','list','loaded',wrangler);
				IO.log('accept','Done!');
				IO.log('line');
			} break;*/
			case 'bindings add': {
				IO.log('accept','Adding binding to wrangler...');
				const result = await methods.updateBindings(data,true);
				IO.signal('bindings','add','saved',result);
				IO.log('accept','Done!');
				IO.log('line');
			} break;
			case 'bindings remove': {
				IO.log('accept','Removing binding from wrangler...');
				const result = await methods.updateBindings(data,false);
				IO.signal('bindings','remove','saved',result);
				IO.log('accept','Done!');
				IO.log('line');
			} break;
			case 'account whoami': {
				IO.log('accept','Checking Cloudflare authentication status...');
				const response = await IO.execute('npx wrangler whoami --account');
				IO.signal('cloudflare','account','iam',response);
				IO.log('accept','Done!');
				IO.log('line');
			} break;
			case 'account login': {
				IO.log('accept','Starting Cloudflare authentication process...');
				const response = await IO.execute('npx wrangler login');
				IO.signal('cloudflare','account','online',response);
				IO.log('accept','Done!');
				IO.log('line');
			} break;
			case 'account logout': {
				IO.log('accept','Logging out from Cloudflare...');
				const response = await IO.execute('npx wrangler logout');
				IO.signal('cloudflare','account','offline',response);
				IO.log('accept','Done!');
				IO.log('line');
			} break;
			case 'account api': {
				IO.log('accept','Testing the API...');
				const request = {
					href: 'user/tokens/verify',
					method: 'get'
				}
				const response = await IO.api(request);
				IO.signal('cloudflare','account','api',response);
				IO.log('accept','Done!');
				IO.log('line');
			} break;
		}
	} catch (error) {
		console.log(error);
		IO.log('reject','Error: '+error.message);
		IO.log('line');
	}
}

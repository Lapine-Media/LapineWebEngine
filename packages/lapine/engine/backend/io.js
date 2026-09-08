
import Index from './index.js';
import Tools from './tools.js';
import Settings from './settings.js';
import Paths from './paths.js';
import { spawn } from 'child_process';
import { AsyncLocalStorage } from 'node:async_hooks';
//import Convert from 'ansi-to-html';

export default new class {
	#clients;
	store;
	constructor() {
		this.store = new AsyncLocalStorage();
	}
	set clients(value) {
		this.#clients = value;
	}
	get client() {
		const [client] = this.#clients;
		return client;
	}
	#getSignal(context,name,value,data = null) {
		const response = {front:true,context,name,value,data};
		return JSON.stringify(response);
	}
	receiveMessage(json) {
		try {
			const {context,name,value,data,id} = JSON.parse(json);
			const method = () => Index.runAction(context,name,value,data,id);
			const store = {requestId: id};
			this.store.run(store,method);
		} catch (error) {
			this.console('reject',error);
		}
	}
	log(type,message,replace = false,sideLog = false) {
		if (replace) {
			message = message.replace(Paths.folders.project.working,'');
			message = message.replace(Paths.folders.project.template,'');
		}
		const store = this.store.getStore();
		if (store) {
			const data = { message, requestId: store.requestId };
			const target = sideLog ? 'sidelog' : 'log';
			this.signal('output',target,type,data);
		} else {
			this.console(type,message);
		}
	}
	sideLog(type,message,replace = false) {
		this.log(type,message,replace,true);
	}
	signal(context,name,value,data) {
		const signal = this.#getSignal(context,name,value,data);
		this.client.send(signal);
	}
	broadcast(context,name,value,data,id) {
		const method = client => {
			const signal = this.#getSignal(context,name,value,data);
			client.send(signal);
		}
		this.#clients.forEach(method);
	}
	console(type,message) {
		const s = '\x1b[48;5;91m \x1b[';
		const e = '\x1b[0m';
		switch (type) {
			case 'begin':
				this.console('purple','////////// LAPINE WEB ENGINE //////////');
				break;
			case 'end':
				this.console('purple','///////////////////////////////////////');
				break;
			case 'line':
				this.console('purple','---------------------------------------');
				break;
			case 'purple':
				console.log(s+'0m\x1b[38;5;91m\x1b[1m '+message+' '+e);
				break;
			case 'log':
				console.log(s+'0m '+message);
				break;
			case 'reject':
				console.log(s+'0m\x1b[38;5;9m '+message+e);
				break;
			case 'accept':
				console.log(s+'0m\x1b[38;5;10m '+message+e);
				break;
			case 'danger':
				console.log(s+'0m\x1b[38;5;214m '+message+e);
				break;
			case 'inform':
				console.log(s+'0m\x1b[38;5;39m '+message+e);
				break;
			case 'prompt':
				return '\x1b[0m\x1b[38;5;229m'+message+e;
			default:
				console.log(s+'0m\x1b[38;5;229m '+message+e);
		}
	}
	async api(object) {
		try {
			this.log('normal','Connecting to api.cloudflare.com...');

			const token = await Settings.getAPIToken();
			const account = await Settings.getAccountID();
			const options = {
				method: object.method ? object.method.toUpperCase() : 'GET',
				headers: {
					'Authorization': 'Bearer ' + token,
					'Content-Type': 'application/json',
					...(object.headers ?? {})
				}
			};

			if (object.body) {
				if (object.body instanceof FormData) {
					// Fetch handles Content-Type for FormData automatically (boundary),
					// so we should actually REMOVE it from headers to let the browser/node set it.
					delete options.headers['Content-Type'];
					options.body = object.body;
				} else {
					options.body = JSON.stringify(object.body);
				}
			}

			object.href ??= '';
			object.href = object.href.replace('$ACCOUNT_ID',account);

			// 1. URL Construction (Fixed)
			const url = new URL(object.href, 'https://api.cloudflare.com/client/v4/');

			// 2. Append Params correctly to the URL object
			if (object.params) {
				const params = new URLSearchParams(object.params);
				url.search = params.toString();
			}

			this.log('normal', url.href);

			const response = await fetch(url, options);
			const contentType = response.headers.get('Content-Type');
			let data;

			// 3. Robust Response Handling
			switch (true) {
				case contentType?.includes('application/json'):
					data = await response.json();
					// Cloudflare standard response handling
					if (data.messages?.length) {
						data.messages.forEach(item => this.log('normal', item.message || item));
					}
					if (!data.success && data.errors?.length) {
						data.errors.forEach(item => this.log('reject', item.message || item));
						throw data.errors; // Throw to catch block
					}
					return data; // Async functions return via return, not resolve
				case contentType?.includes('text/'):
				case contentType?.includes('xml'):
					data = await response.text();
					if (response.ok) {
						this.log('accept', 'Request successful'); // Log success, maybe not whole HTML body
						return data;
					} else {
						this.log('reject', data);
						throw new Error(data);
					}
				default:
					return null;
			}
		} catch (error) {
			console.error('IO API Error:', error);
			throw error; // Propagate error to caller
		}
	}
	async spawn(command) {
		const { promise, resolve, reject } = Promise.withResolvers();
		const options = {
			shell: true, // so we can pass a single string command just like exec
			stdio: ['inherit', 'pipe', 'pipe'], // Allows browser interaction
			env: {
				...process.env, // Fixes pathing issues for opening apps
				CLOUDFLARE_API_TOKEN: await Settings.getAPIToken()
			}
		};
		let response = '';
		let errorOutput = '';
		const child = spawn(command,options);
		this.log('normal','Starting process: '+child.pid);
		this.log('inform',command);
		const output = chunk => response += chunk.toString();
		const error = chunk => errorOutput += chunk.toString();
		const close = code => {
			if (code > 0) {
				this.log('normal','Process '+child.pid+' exited with errors:');
				try {
					const object = JSON.parse(response);
					this.log('reject', object.error.text);
					if (object.error.notes) {
						this.log('reject', object.error.notes[0].text);
					}
				} catch {
					this.log('reject', errorOutput || response);
				}
				reject(errorOutput || response);
			} else {
				this.log('normal','Process '+child.pid+' exited.');
				resolve(response);
			}
		}
		child.stdout.on('data',output);
		child.stderr.on('data',error);
		child.on('close',close);
		child.on('error',error);
		return promise;
	}
}

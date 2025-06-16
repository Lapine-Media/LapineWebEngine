
import { Tools } from './tools.js';
import Settings from './settings.js';
import { exec } from 'child_process';
import { AsyncLocalStorage } from 'node:async_hooks';

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
		const response = {context,name,value,data};
		return JSON.stringify(response);
	}
	log(type,message,replace = false) {
		if (replace) {
			message = message.replace(Settings.paths.project,'');
			message = message.replace(Settings.paths.lapine,'');
		}
		const store = this.store.getStore();
		const data = {
			requestId: store.requestId,
			message: message
		}
		this.signal('output','log',type,data);
	}
	signal(context,name,value,data) {
		const signal = this.#getSignal(context,name,value,data);
		this.client.send(signal);
	}
	broadcast(context,name,value,data) {
		const method = client => {
			const signal = this.#getSignal(context,name,value,data);
			client.send(signal);
		}
		this.#clients.forEach(method);
	}
	console(type,message,bold = false) {
		let string;
		if (type == 'error') {
			string = [
				'\x1b[48;5;124m',
				'\x1b[38;5;228m'
			]
		} else {
			string = [
				'\x1b[48;5;54m',
				'\x1b[38;5;228m',
				bold ? '\x1b[1m' : ''
			]
		}
		string = string.join('');
		console.log(string+' '+message+' \x1b[0m');
	}
	api(object) {
		const promise = async (resolve,reject) => {
			try {
				const devVars = await Settings.loadDevVars();
				const options = {
					method: object.method ? object.method.toUpperCase() : 'GET',
					headers: {
						'Authorization': 'Bearer '+devVars.CLOUDFLARE_API_TOKEN,
						'Content-Type': 'application/json',
						...(object.headers ?? {})
					}
				}

				if (object.body) {
					if (object.body instanceof FormData) {
						options.body = object.body;
					} else {
						options.body = JSON.stringify(object.body);
					}
				}

				object.href ??= '';
				object.href = object.href.replace('$ACCOUNT_ID',devVars.CLOUDFLARE_ACCOUNT_ID);

				if (object.params) {
					const params = new URLSearchParams(object.params);
					object.href+'?'+params;
				}

				const url = new URL(object.href,'https://api.cloudflare.com/client/v4/');

				this.log('normal',url.href);

				const response = await fetch(url,options);
				const contentType = response.headers.get('Content-Type');
				let data;

				switch (true) {
					case contentType?.includes('application/json'):
						data = await response.json();
						if (data.messages && data.messages.length > 0) {
							data.messages.forEach(item => this.log('normal',item.message));
						}
						if (data.errors && data.errors.length > 0) {
							data.errors.forEach(item => this.log('reject',item.message));
							reject(data.errors);
						} else {
							resolve(data);
						}
						break;
					case contentType?.includes('text/'):
					case contentType?.includes('application/xml'):
						data = await response.text();
						if (response.ok) {
							this.log('accept',data);
							resolve(null);
						} else {
							this.log('reject',data);
							reject(null);
						}
						break;
					/*case contentType?.includes('application/octet-stream'):
						data = await response.arrayBuffer();
						break;
					default:
						data = await response.blob();*/
				}
			} catch(error) {
				console.log('IO error:',error);
				reject(null);
			}
		}
		return new Promise(promise);
	}
	async execute(command) {
		const { promise, resolve, reject } = Promise.withResolvers();
		const callback = (error,stdout,stderr) => {
			if (stdout != '') {
				resolve(stdout);
			} else if (stderr != '') {
				resolve(stderr);
			} else {
				reject(error);
			}
		}
		try {
			exec(command,callback);
			return promise;
		} catch (error) {
			throw error;
		}
	}
}

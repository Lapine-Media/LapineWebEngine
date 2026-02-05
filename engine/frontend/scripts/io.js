
import { Index,Output,LapineMessage } from './frontend.js';

export const IO = new class {
	server;
	#signalBuffer = {};
	constructor() {
		window.addEventListener('error',this,false);
		window.addEventListener('unhandledrejection',this,false);
		window.addEventListener('load',this,false);
	}
	async handleEvent(event) {
		event.preventDefault();
		let start,end,message;
		const style = 'display:block;color:white;background:Red;font-weight:bold;';
		const background = 'background:#660000;';
		switch (event.type) {
			case 'load':
				console.log('Site ready');
				const url = new URL(document.location);
				const port = 1+parseInt(url.port,10);
				this.server = new WebSocket('ws://127.0.0.1:'+port);
				this.server.addEventListener('open',this,false);
				this.server.addEventListener('message',this,false);
				this.server.addEventListener('close',this,false);
				break;
			case 'open':
				console.log('Server connected');
				this.sendSignal(true,'index','state','ready');
				await Index.ready;
				Output.log('accept','Welcome!');
				Output.log('normal','Lapine Web Engine is connected and ready.');
				Output.log('line');
				break;
			case 'message':
				const {context,name,value,data} = JSON.parse(event.data);
				if (context.startsWith('signal_') && this.#signalBuffer[context] != undefined) {
					const response = {name,value,data};
					this.receiveSignal(this.#signalBuffer[context],response);
					delete this.#signalBuffer[context];
				} else {
					this.sendSignal(true,context,name,value,data);
				}
				break;
			case 'close':
				this.sendSignal(true,'index','state','disconnected');
				break;
			case 'error':
				message = new LapineMessage('reject','Internal error',event.error.message);
				message.display();

				Output.log('reject',event.error.name);
				Output.log('reject',event.error.message);
				Output.log('reject',event.filename+' @ '+event.lineno+':'+event.colno);
				Output.log('line');
				start = ('--- '+event.error.name+' ---').toUpperCase();
				end = '-'.repeat(start.length);
				console.log('%c '+start+' ',style+'border-radius:8px 0 0 0;');
				console.log('%c '+event.error.message,background);
				console.log('%c '+event.filename+' @ '+event.lineno+':'+event.colno,background);
				console.log('%c '+end+' ',style+'border-radius:0 0 0 8px;');
				break;
			case 'unhandledrejection':
				message = new LapineMessage('reject','Internal error',event.error.message);
				message.display();

				Output.log('reject',event.type);
				Output.log('reject',event.reason.stack);
				Output.log('line');
				start = ('--- '+event.type+' ---').toUpperCase();
				end = '-'.repeat(start.length);
				console.log('%c '+start+' ',style+'border-radius:8px 0 0 0;');
				console.log('%c '+event.reason.stack,background);
				console.log('%c '+end+' ',style+'border-radius:0 0 0 8px;');
				break;
		}
	}
	getSignal(front,context,name,value,data = null,signal = null) {
		return {front,context,name,value,data,signal};
	}
	sendSignal(front,context,name,value,data = null,signal = null) {
		const id = 'signal_'+crypto.randomUUID();
		if (signal) {
			this.#signalBuffer[id] = signal;
		}
		if (front) {
			const options = {
				detail: {name,value,data,id}
			};
			const event = new CustomEvent(context,options);
			window.dispatchEvent(event);
		} else {
			const signal = {context,name,value,data,id};
			const json = JSON.stringify(signal);
			this.server.send(json);
		}
	}
	request(context, name, value, data) {
		const promise = resolve => {
			const signal = response => resolve(response);
			this.sendSignal(false, context, name, value, data, signal);
		}
		return new Promise(promise);
	}
	receiveSignal(signal,argument = null) {
		switch (true) {
			case !signal:
				break;
			case signal instanceof Function:
				signal(argument);
				break;
			default:
				const {front,context,name,value,data} = signal;
				this.sendSignal(front,context,name,value,data);
		}
	}
	async loadAsset(href,type,decompress = false) {
		const promise = async (resolve,reject) => {
			try {
				const mime = {
					text: 'text/plain',
					html: 'text/html',
					json: 'application/json'
				}[type];
				const url = new URL(href,document.location.href);
				const options = {
					method: 'GET',
					headers: {
						'Document-Type': mime
					}
				}
				const response = await fetch(url,options);
				let content;
				switch (type) {
					case 'json':
						content = await response.json();
					default:
						content = await response.text();
				}
				resolve(content);
			} catch(error) {
				console.log(error);
				reject(null);
			}
		}
		return new Promise(promise);
	}
	async worker(href,formData = null,attempt = 3) {
		const url = new URL(href,'http://127.0.0.1:3002/');
		const options = {
			method: 'POST',
			body: formData
		}
		try {
			this.log('normal',url.href);
			const response = await fetch(url,options);
			const json = await response.json();
			if (response.ok) {
				return json;
			}
			throw new Error(json.error);
		} catch (error) {
			if (error?.cause?.code == 'ECONNREFUSED') {
				if (attempt > 0) {
					this.log('danger','Server busy, trying again...');
					await new Promise(resolve => setTimeout(resolve,1000));
					return await this.worker(href,body,attempt-1);
				} else {
					this.log('reject','Server not started.');
				}
			}
			throw error;
		}
	}
}

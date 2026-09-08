
export const IO = {
	loaded: (async function() {
		await loaded;
		window.onerror = IO.errorMessage;
		window.onunhandledrejection = IO.errorMessage;
	}()),
	signal: function(name,detail) {
		return {name,detail};
	},
	message: function(type,title,text,timeout = 0) {
		return {
			type: type,
			title: title,
			text: text,
			buttons: [],
			timeout: timeout,
			addButton: function(label,icon = null,signal = null) {
				const button = {
					label: label,
					icon: icon,
					signal: signal
				};
				this.buttons.push(button);
			},
			send: function() {
				if (this.buttons.length == 0) {
					this.addButton('Ok');
				}
				IO.send('message',this);
			}
		}
	},
	send: function(type,detail) {
		const options = {detail:detail};
		const event = new CustomEvent(type,options);
		window.dispatchEvent(event);
	},
	errorMessage: function(event) {

		event.preventDefault();

		const start = ('--- '+event.type+' ---').toUpperCase();
		const end = '-'.repeat(start.length);
		const style = 'display:block;color:white;background:Red;font-weight:bold;';
		const message = event.type == 'unhandledrejection' ? event.reason : event.error.stack;

		console.log('%c '+start+' ',style+'border-radius:8px 0 0 0;');
		console.log(message);
		console.log('%c '+end+' ',style+'border-radius:0 0 0 8px;');

	}
}

export class API {
	constructor(api,method) {
		const path = ['api',api,method].join('/');
		this.url = new URL(path,document.baseURI);
		this.options = {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		}
	}
	async request(callback,data = null) {
		if (data) {
			this.options.method = 'POST';
			this.options.body = JSON.stringify(data);
		}
		const request = new Request(this.url,this.options);
		const response = await fetch(request);
		const signals = await response.json();
		signals.forEach(signal => callback(signal));
	}
}

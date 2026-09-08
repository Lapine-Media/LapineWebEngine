
export const IO = {
	list: [],
	signal: function(name,detail = {}) {
		const signal = {name,detail};
		this.list.push(signal);
	},
	message: function(type,title,text,timeout = 0) {
		const message = {
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
			}
		}
		this.signal('message',message);
		return message;
	},
	response: function(code,text) {
		const body = JSON.stringify(this.list);
		const options = {
			status: code,
			statusText: text,
			headers: {
				'Content-Type': 'application/json',
				'X-Responded-With': 'LAPINE'
			}
		};
		this.list = [];
		return new Response(body,options);
	}
}

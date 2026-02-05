/*global window,document*/

import {Index,Signals,Navigation,Session} from './frontend.js';

Index.requests = {
	request: async function(path,options,callback) {
		const url = new URL(path,document.baseURI);
		const request = new Request(url,options);
		const response = await fetch(request);
		const signals = await response.json();
		signals.forEach(signal => callback(signal));
	},
	get: function(path,callback) {
		const options = {
			method: 'GET',
			headers: {'Content-Type': 'application/json'}
		}
		this.request(path,options,callback);
	},
	post: function(path,body,callback) {
		const options = {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(body)
		}
		this.request(path,options,callback);
	}
}

Index.messages = {
	invalid: function() {
		const message = Signals.message('reject','Whoops!','Please check the form and try again.');
		message.send();
	},
	error: function(name) {
		console.log(name);
		const message = Signals.message('reject','Server error','Sorry, something went wrong. Try again?');
		message.send();
	}
}

const Events = {
	request: async function(path) {
		const options = {
			method: 'GET',
			headers: {'Content-Type': 'text/plain'}
		};
		const url = new URL(path,document.baseURI);
		const request = new Request(url,options);
		const response = await fetch(request);
		const signals = await response.json();
		await Session.update(response);
		return signals;
	},
	session_expired: function() {
		const message = Signals.message('reject','Your session has expired','You are now logged out. Please log in again to continue.');
		const node = Navigation.getNode('login');
		const url = Navigation.getURL(node);
		url.searchParams.set('action','session_expired');
		url.searchParams.set('url',document.location);
		const signal = Signals.signal('redirect',url);
		message.addButton('To login',null,signal);
		message.send();
	},
	session_invalid: function() {
		const message = Signals.message('reject','Session error','Try logging in again.');
		const node = Navigation.getNode('login');
		const url = Navigation.getURL(node);
		url.searchParams.set('action','session_invalid');
		url.searchParams.set('url',document.location);
		const signal = Signals.signal('redirect',url);
		message.addButton('To login',null,signal);
		message.send();
	},
	session_warning: function(detail) {
		const message = Signals.message('warn','Are you still there?','Your session will expire in '+detail.minutes+' minutes.');
		const logout = Signals.signal('session_event',{action:'session_logout'});
		const remain = Signals.signal('session_event',{action:'session_extend'});
		message.addButton('Log out',null,logout);
		message.addButton('Stay logged in',null,remain);
		message.send();
	},
	session_logout: async function() {
		const signals = await this.request('api/lapine_accounts/logout');
		for (const signal of signals) {
			if (signal.name == 'success') {
				const message = Signals.message('accept','See you later '+signal.detail+'!','You are now logged out.');
				const node = Navigation.getNode('index');
				const url = Navigation.getURL(node);
				url.searchParams.set('action','logout');
				const redirect = Signals.signal('redirect',url);
				message.addButton('Ok',null,redirect);
				message.send();
			}
		}
	},
	session_extend: async function() {
		const signals = await this.request('api/lapine_accounts/extend');
		for (const signal of signals) {
			if (signal.name == 'success') {
				const message = Signals.message('accept','Ok!','Your session has been extended to '+signal.detail+' minutes.');
				message.send();
			} else {
				this.session_expired();
			}
		}
	}
}

export default new class {
	constructor() {

		document.all.year.textContent = new Date().getFullYear();
		document.all.open.addEventListener('click',this,false);
		document.all.close.addEventListener('click',this,false);

		window.addEventListener('link',this,false);
		window.addEventListener('button',this,false);
		window.addEventListener('session_event',this,false);

		const url = new URL(document.location.href);

		document.body.dataset.menu = false;

		switch (true) {
			case url.pathname == '/':
			case url.searchParams.get('action') == 'logout':
				document.body.dataset.menu = true;
		}

	}
	handleEvent(event) {
		switch (event.type) {
			case 'link':
				document.body.dataset.menu = 'false';
				break;
			case 'button':
				if (event.detail.name == 'logout') {
					Events.session_logout();
				} else {
					console.log(event.detail);
				}
				break;
			case 'click':
				switch (event.target) {
					case document.all.open:
						document.body.dataset.menu = 'true';
						break;
					case document.all.close:
						document.body.dataset.menu = 'false';
						break;
				}
				break;
			case 'session_event':
				Events[event.detail.action](event.detail);
				break;
		}
	}
};

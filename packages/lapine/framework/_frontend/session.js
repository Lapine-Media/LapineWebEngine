
import Navigation from './navigation.js';
import IO from './io.js';

export const Session = {
	timers: {
		warning: 0,
		expired: 0
	},
	cookie: (function() {
		const string = window.localStorage.getItem('session');
		return string ? JSON.parse(string): null;
	}()),
	loaded: (async function() {
		await loaded;
		document.body.classList.toggle('session',Session.cookie == null ? false: true);
	}()),
	conditions: function(string) {
		const list = string.split(';');
		let match;
		for (const condition of list) {
			const [tag,a,b] = condition.split(' ');
			if (this.cookie == null) {
				match = b;
			} else if (tag == 'session') {
				match = a;
			} else {
				match = this.cookie.tags.includes(tag) ? a : b;
			}
			if (match == 'continue') {
				continue;
			}
			break;
		}
		return match;
	},
	setTimers: function(timeout) {

		window.clearTimeout(this.timers.warning);
		window.clearTimeout(this.timers.expired);

		const remaining = timeout-Site.getTime();
		const alert = remaining - (Navigation.data.site.session_warning * 60000);
		const warning = {
			action: 'session_warning',
			minutes: Math.ceil(alert/60000)
		}
		const expired = {
			action:'session_expired'
		}
		const method = (detail) => IO.send('session_event',detail);

		this.timers.warning = window.setTimeout(method,alert,warning);
		this.timers.expired = window.setTimeout(method,remaining,expired);

	},
	update: function(response) {

		const string = response.headers.get('X-Session-Data');

		switch (string) {
			case 'session_expired':
			case 'session_invalid':
				const detail = {action: string};
				IO.send('session_event',detail);
			case '':
			case null:
				this.cookie = null;
				window.localStorage.removeItem('session');
				break;
			default:
				console.log(string);
				this.cookie = JSON.parse(string);
				window.localStorage.setItem('session',string);
				this.setTimers(this.cookie.time);
		}

	}
}

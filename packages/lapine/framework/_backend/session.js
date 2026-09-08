
import cookie from 'cookie';
//import Navigation from './navigation.js';

export const Session = {
	ttl: null,
	secret: null,
	algorithm: 'HMAC',
	name: 'lapine',
	cookie: null,
	getTime: function(delay = 0) {

		const date = new Date();
		const offset = date.getTimezoneOffset();
		let time = date.getTime();

		time -= (offset*60000);
		time += (delay*60000);

		return time;

	},
	importKey: async function(data,usage) {

		const encoder = new TextEncoder();
		const keyData = encoder.encode(this.secret);
		const algorithm = {
			name: this.algorithm,
			hash: 'SHA-256'
		};
		const keyUsages = [usage];

		return [
			await crypto.subtle.importKey('raw',keyData,algorithm,false,keyUsages),
			encoder.encode(data)
		];

	},
	sign: async function(data,minutes) {

		data.time = this.getTime(minutes);

		const json = JSON.stringify(data);
		const [key,encoded] = await this.importKey(json,'sign');

		const mac = await crypto.subtle.sign(this.algorithm,key,encoded);
		const array = new Uint8Array(mac);
		const string = String.fromCharCode(...array);
		const b64 = btoa(json);
		const signature = btoa(string);

		return (b64+'.'+signature).replaceAll('+','-');

	},
	getToken: async function(data,uni = 'confirm') {

		const minutes = parseInt(Navigation.data.site.session_timeout,10);
		const token = await this.sign(data,minutes);
		const node = Navigation.getNode(uni);
		const url = Navigation.getURL(node);

		url.searchParams.set('token',token);

		return url;

	},
	verifyToken: async function(token) {

		token = token.replaceAll('-','+');

		const [b64,mac] = token.split('.');
		const data = atob(b64);
		const byteString = atob(mac);
		const ui = new Uint8Array(byteString.length);

		for (let i = 0; i < byteString.length; ++i) {
			ui[i] = byteString.charCodeAt(i);
		}

		const [key,encoded] = await this.importKey(data,'verify');
		const verified = await crypto.subtle.verify(this.algorithm,key,ui,encoded);
		const object = JSON.parse(data);
		const timeout = parseInt(object.time,10);

		switch (false) {
			case verified:
				object.error = 'invalidToken';
				break;
			case this.getTime(0) < timeout:
				object.error = 'expiredToken';
				break;
			default:
				object.error = false;
		}

		return object;

	},
	getCookie: async function(request,env,name) {

		this.ttl = Navigation.data.site.session_timeout;
		this.secret = env.SESSION_SECRET;
		this.name = name;

		const string = request.headers.get('Cookie');
		const cookies = cookie.parse(string || '');
		const token = cookies[this.name];

		this.cookie = token ? await this.verifyToken(token) : null;

	},
	setCookie: async function(response,data) {

		let token = '';
		let frontend = '';
		let settings = {
			path: '/',
			maxAge: 0
		};

		if (data != null) {

			const minutes = parseInt(this.ttl,10);
			const time = this.getTime(minutes);

			frontend = {time: time, tags: data.tags};
			frontend = JSON.stringify(frontend);
			token = await this.sign(data,minutes);
			settings = {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: true,
				priority: 'high',
				maxAge: minutes*60,//seconds
				expires: new Date(time)//datetime
			};
		}

		const value = cookie.serialize(this.name,token,settings);

		response.headers.set('Set-Cookie',value);
		response.headers.set('X-Session-Data',frontend);

		return response;

	},
	refresh: function(response) {
		switch (true) {
			case this.cookie == null:
				this.setCookie(response,null);
				break;
			case this.cookie.error:
				this.setCookie(response,null);
				response.headers.set('X-Session-Data',this.cookie.error);
				break;
			default:
				delete this.cookie.error;
				delete this.cookie.time;
				this.setCookie(response,this.cookie);
		}
		return response;
	},
	conditions: function(string) {
		switch (true) {
			case string.length == 0:
				return 'continue';
			case this.cookie == null:
				break;
			case this.cookie.error !== false:
				return 'break';
		}
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
	}
}

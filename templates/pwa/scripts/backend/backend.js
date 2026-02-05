/*global HTMLRewriter*/

import cookie from 'cookie';

export const Site = {
	url: null,
	getAsset: async function(env,path,type = null) {
		const url = new URL(path,this.url.origin);
		const result = await env.ASSETS.fetch(url);
		if (result.ok) {
			switch (type) {
				case 'text':
					return await result.text();
				case 'json':
					return await result.json();
				default:
					return result;
			}
		}
		throw new class AssetError extends Error {
			constructor() {
				super('Not found: '+path);
				this.name = 'AssetError';
			}
		}
	},
	decompress: async function(response) {
		const data = await response.arrayBuffer();
		const ds = new DecompressionStream('gzip');
		const writer = ds.writable.getWriter();
		writer.write(data);
		writer.close();
		const arrayBuffer = await new Response(ds.readable).arrayBuffer();
		return new TextDecoder().decode(arrayBuffer);
	}
}

export const Signals = {
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

export const Sitemap = {
	data: null,
	loadMap: async function(env) {
		if (this.data == null) {
			const response = await Site.getAsset(env,'/data/sitemap.gzip');
			const data = await Site.decompress(response);
			this.data = await JSON.parse(data);
		}
		return true;
	},
	getUniFromURL: function(url) {
		let path = url.pathname;
		path = path.endsWith('/') ? path.slice(0,-1) : path;
		path = path == '' ? '/' : path;
		while (this.data.endpoints[path] == undefined && path != '') {
			const index = path.lastIndexOf('/',path.length);
			path = path.substring(0,index);
		}
		const index = this.data.endpoints[path];
		return index > 0 ? this.data.unis[index] : 'missing';
	},
	getNode: function(uni) {
		let index = this.data.unis.indexOf(uni);
		if (index < 0) {
			index = this.data.unis.indexOf('missing');
		}
		const values = this.data.nodes[index];
		const value = values[0];
		const type = this.data.keys.types[value];
		const keys = this.data.keys[type];
		const node = {};
		for (let k = 0; k < keys.length; k += 1) {
			const index = keys[k];
			const key = this.data.keys.values[index];
			node[key] = values[k];
		}
		node.uni = uni;
		node.type = type;
		if (node.conditions != undefined) {
			const list = node.conditions.map(i => this.data.conditions[i]);
			if (list[0] == '') list.shift();
			node.conditions = list.join(';');
		}
		if (node.frame != undefined) {
			node.frame = this.data.unis[node.frame];
		}
		return node;
	},
	getFirstChild: function(node) {
		if (node.children.length > 0) {
			const index = node.children[0];
			const uni = this.data.unis[index];
			return this.getNode(uni);
		}
		return this.getNode('missing');
	},
	getURL: function(node) {
		const list = [node.path];
		for (const i of node.parents) {
			let index = this.data.nodes[i][0];
			const type = this.data.keys.types[index];
			if (type != 'frame') {
				index = this.data.keys.values.indexOf('path');
				index = this.data.keys[type].indexOf(index);
				const path = this.data.nodes[i][index];
				list.unshift(path);
			}
		}
		if (node.type == 'api') {
			list.unshift('api');
		}
		const href = list.join('/');
		return new URL(href,Site.url.origin);
	}
}

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

		const minutes = parseInt(Sitemap.data.site.session_timeout,10);
		const token = await this.sign(data,minutes);
		const node = Sitemap.getNode(uni);
		const url = Sitemap.getURL(node);

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

		this.ttl = Sitemap.data.site.session_timeout;
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

const Rewrite = {
	data: {
		head: '',
		templates: '',
		content: '',
		values: ''
	},
	nonce: Math.random().toString(16).slice(2),
	element: function(element) {
		switch (element.tagName) {
			case 'meta':
			case 'link':
				const attribute = element.tagName == 'meta' ? 'content' : 'href';
				const key = element.getAttribute(attribute);
				if (key && this.data.values[key] != undefined) {
					const value = this.data.values[key];
					element.setAttribute(attribute,value);
				}
				break;
			case 'title':
				element.setInnerContent(this.data.values.title);
				break;
			case 'head':
				element.append(this.data.head,{html:true});
				break;
			case 'body':
				element.prepend(this.data.templates,{html:true});
				break;
			case 'lapine-frame':
				element.setInnerContent(this.data.content,{html:true});
				break;
			case 'script':
				element.setAttribute('nonce',this.nonce);
				break;
			default:
				const string = element.getAttribute('condition');
				if (Session.conditions(string) != 'continue') {
					element.remove();
				}
				break;
		}
	}
};

const Content = {
	getHTML: async function(request,env) {
		try {
			await Sitemap.loadMap(env);
			await Session.getCookie(request,env,Sitemap.data.site.location);

			const uni = Sitemap.getUniFromURL(Site.url);

			let page = Sitemap.getNode(uni);

			if (page.file == '') {
				page = Sitemap.getFirstChild(page);
			}

			const result = Session.conditions(page.conditions);

			switch (result) {
				case 'continue':
					break;
				case 'break':
					page = Sitemap.getNode('denied');
					break;
				default:
					page = Sitemap.getNode(result);
			}

			let rewriter = new HTMLRewriter();
			let response = await Site.getAsset(env,'/markup/pages/'+page.file+'.html');

			if (request.headers.get('X-Requested-With') == 'LAPINE') {
				rewriter.on('*[condition]',Rewrite);
				response = rewriter.transform(response);
				response = await Session.refresh(response);
				return response;
			}

			const remover = {element: (element) => element.remove()};

			rewriter.on('script',remover);
			rewriter.on('lapine-kit',remover);
			rewriter.on('lapine-svg',remover);

			response = rewriter.transform(response);
			rewriter = new HTMLRewriter();

			const frame = Sitemap.getNode(page.frame);
			let csp = await Site.getAsset(env,'/data/'+frame.csp+'.csp.txt','text');

			Rewrite.data.content = await response.text();
			Rewrite.data.head = await Site.getAsset(env,'/markup/frames/head.html','text');
			Rewrite.data.templates = await Site.getAsset(env,'/markup/frames/templates.html','text');
			Rewrite.data.values = Sitemap.data.site;
			Rewrite.data.values.title = page.seo_title || frame.seo_title;
			Rewrite.data.values.description = page.seo_description || frame.seo_description;
			Rewrite.data.values.keywords = page.seo_keywords || frame.seo_keywords;
			Rewrite.data.values.base_url = Site.url.origin;

			rewriter.on('title',Rewrite);
			rewriter.on('head',Rewrite);
			rewriter.on('meta',Rewrite);
			rewriter.on('link',Rewrite);
			rewriter.on('body',Rewrite);
			rewriter.on('lapine-frame',Rewrite);
			rewriter.on('*[condition]',Rewrite);
			rewriter.on('script',Rewrite);

			response = await Site.getAsset(env,'/markup/frames/'+frame.file+'.html');
			response = rewriter.transform(response);
			csp = csp.replaceAll('nonce','nonce-'+Rewrite.nonce);

			response.headers.set('Content-Type','text/html; charset=utf-8');
			response.headers.set('X-Responded-With','LAPINE');
			response.headers.set('Content-Security-Policy',csp);

			return response;
		} catch (error) {
			if (error.name == 'AssetError') {
				return new Response(error.message);
			}
			console.log(error);
			return new Response('Error');
			//throw new Error(error);
		}
	},
	getAPI: async function(request,env) {

		await Sitemap.loadMap(env);
		await Session.getCookie(request,env,Sitemap.data.site.location);

		const [module,method,context] = Site.url.pathname.split('/').slice(2);
		const input = (request.method == 'GET') ? Site.url.searchParams: await request.json();
		let response;

		try {

			const modules = await import('./api.js');
			const responder = modules[module][method];

			response = await responder(request,env,input,context);

		} catch (error) {
			if (error.name == 'invalid') {
				Signals.signal('invalid',error.detail);
				response = Signals.response(400,'Form error');
			} else {
				console.log(error);
				const message = Signals.message('reject','Error','Server error');
				message.addButton('Ok');
				response = Signals.response(500,'Form error');
			}
		}

		await Session.refresh(response);

		return response;

	}
}

export const Backend = {
	fetch: function fetch(request,env) { //context
		try {
			Site.url = new URL(request.url);
			switch (true) {
				case Site.url.pathname == '/favicon.ico':
				case Site.url.pathname == '/robots.txt':
					return Site.getAsset(env,Site.url.pathname);
				case Site.url.pathname.startsWith('/frontend/'):
					const path = Site.url.pathname.replace('/frontend/','/');
					return Site.getAsset(env,path);
				case Site.url.pathname.startsWith('/api/'):
					return Content.getAPI(request,env);
				default:
					return Content.getHTML(request,env);
			}
		} catch (error) {
			throw new Error(error);
		}
	}
}

export class Mail {
	constructor(env) {
		this.data = {
			api_key: env.MAIL_API_KEY,
			custom_headers: [],
			sender: null,
			subject: null,
			to: []
		};
	}
	from(name,mail) {
		const reply_to = {
			header: 'Reply-To',
			value: name+' <'+mail+'>'
		};
		this.data.sender = name+' <'+mail+'>';
		this.data.custom_headers.push(reply_to);
	}
	to(name,mail) {
		this.data.to.push(name+' <'+mail+'>');
	}
	text(content) {
		this.data.text_body = content;
	}
	async markup(env,file,replacements) {
		let template = await Site.getAsset(env,'/markup/mail/'+file+'.html','text');
		const words = Object.entries(replacements);
		for (let [key,value] of words) {
			key = key.toUpperCase();
			template = template.replaceAll('{'+key+'}',value);
		}
		this.data.html_body = template;
	}
	async send(subject) {
		this.data.subject = subject;
		const options = {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(this.data)
		};
		const request = new Request('https://api.smtp2go.com/v3/email/send',options);
		return await fetch(request);
	}
}

export class FormError extends Error {
	constructor(field,key,options) {

		super(field+':'+key,options);

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this,FormError);
		}

		this.name = 'invalid';
		this.detail = {
			type: 'reject',
			field: field,
			key: key
		};
	}
}

export class Validation {
	constructor(input) {
		this.input = input;
	}
	missing(value) {
		switch (value) {
			case '':
			case null:
			case undefined:
				return true;
		}
		return false;
	}
	string(key,required,min = 0, max = 0) {

		const value = this.input[key];

		if (this.missing(value) && required) {
			throw new FormError(key,'valueMissing');
		}

		if (min > 0 && value.length < min) {
			throw new FormError(key,'tooShort');
		}

		if (max > 0 && value.length > max) {
			throw new FormError(key,'tooLong');
		}

	}
	mail(key,required) {

		// regex kopierad från whatwg.org och justerad för att ej tillåta repeterade punkter.
		// även justerad med dubbla escape characters för att fungera med eslint no-useless-escape.
		// https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
		const pattern = new RegExp('^[a-zA-Z0-9!#$%&\'*+\\/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&\'*+\\/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$');
		const value = this.input[key];

		if (this.missing(value) && required) {
			throw new FormError(key,'valueMissing');
		}

		if (pattern.test(value) == false) {
			throw new FormError(key,'patternMismatch');
		}

	}
	token(key,required) {

		const value = this.input[key];

		if (this.missing(value) && required) {
			throw new FormError(key,'valueMissing');
		}

		const object = Session.verifyToken(value);

		if (object.error) {
			throw new FormError(key,object.error);
		}

		this.input[key] = object;

	}
	ssn(key,required) {

		// regex bör kontrolleras mot skatteverkets exempelfiler för personnummer och samordningsnummer.
		// observera att ytterligare beräkningar krävs för att validera giltighet utöver format.
		// https://www7.skatteverket.se/portal/apier-och-oppna-data/utvecklarportalen?dataresurs=oppna-data&dataresurs=oppna-data-api&q=personnummer
		const pattern = new RegExp('^(19|20)?[0-9]{2}[- ]?((0[1-9])|(10|11|12))[- ]?(([06][1-9])|([1278][0-9])|([39][0-1]))[-+ ]?([0-9]{4})$');
		let value = this.input[key];
		let sum = 0;

		if (this.missing(value) && required) {
			throw new FormError(key,'valueMissing');
		}

		value = value.replace(/\D/g,'');

		if (pattern.test(value) == false) {
			throw new FormError(key,'patternMismatch');
		}

		switch (value.length) {
			case 0:
				throw new FormError(key,'patternMismatch');
			case 10:
				let year = value.substring(0,2);
				let date = new Date().getFullYear().toString();
				let century = '20'+year > date ? '19' : '20';
				value = century+value;
			default:
				for (let i = 11; i >= 2; i -= 1) {
					let digit = parseInt(value[i],10);
					if (i%2 == 0) {
						digit *= 2;
						digit -= (digit > 9) ? 9 : 0;
					}
					sum += digit;
				}
				if (sum%10 != 0) {
					throw new FormError(key,'patternMismatch');
				}
		}

	}
	checked(key,required) {

		const value = this.input[key];

		if (this.missing(value) && required) {
			throw new FormError(key,'optionMissing');
		}

	}
	select(key,required,options = null) {

		const value = this.input[key];

		if (options != null) {
			if (this.missing(value)) {
				throw new FormError(key,'optionMissing');
			} else if (options.includes(value) == false) {
				throw new FormError(key,'stepMismatch');
			}
		}

	}
	passwords(password1,password2) {

		const value1 = this.input[password1];
		const value2 = this.input[password2];

		switch (true) {
			case this.missing(value1):
				throw new FormError(password1,'valueMissing');
			case this.missing(value2):
				throw new FormError(password2,'valueMissing');
			case value1 != value2:
				throw new FormError(password2,'patternMismatch');
		}

	}
	file(key,required) {

		const value = this.input[key];

		if (required) {
			switch (true) {
				case this.missing(value):
					throw new FormError(key,'optionMissing');
				case this.missing(value.name):
				case this.missing(value.size):
				case this.missing(value.type):
				case this.missing(value.data):
					throw new FormError(key,'badInput');
				//file type
				//file size
			}
		}

	}
}

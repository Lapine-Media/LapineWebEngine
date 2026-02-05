/*global window,document,history,HTMLLabelElement,HTMLLinkElement,HTMLImageElement,HTMLElement,HTMLInputElement*/

const method = function(resolve) {
	window.onload = () => resolve('blergh');
}
const loaded = new Promise(method);

export const Index = {};

export const Site = {
	id: 0,
	nonce: document.scripts[0].nonce,
	loaded: (async function() {

		await loaded;

		const element = document.createElement('lapine-messages');

		document.body.prepend(element);
		document.body.dataset.loaded = true;

		window.addEventListener('redirect',Site.redirect,false);

		console.log('loaded!');

		return true;

	}()),
	getID: function() {
		const id = 'id'+this.id;
		this.id += 1;
		return id;
	},
	getTime: function() {
		const date = new Date();
		const offset = date.getTimezoneOffset();
		const time = date.getTime();
		return time - (offset*60000);
	},
	setElements: function(context,target) {

		const url = new URL('/frontend/scripts/frontend.js',document.baseURI);
		const elements = target.querySelectorAll('template, script, button, a');

		for (const element of elements) {
			switch (element.tagName) {
				case 'TEMPLATE':
					context.templates[element.id] = element.content;
					break;
				case 'SCRIPT':
					if (element.type == 'application/json') {
						context.data[element.id] = JSON.parse(element.text);
						element.remove();
					} else {
						const id = this.getID();
						const content = [
							'import {Index,Site,Signals,Navigation,Form,API} from "'+url.href+'";',
							'window.currentScript = document.all.'+id+';',
							element.textContent
						];
						const options = {type:'text/javascript'};
						const blob = new Blob(content,options);
						const script = document.createElement('script');

						script.src = URL.createObjectURL(blob);
						script.type = element.type;
						script.nonce = Site.nonce;
						script.id = id;

						element.replaceWith(script);

						URL.revokeObjectURL(blob);
					}
					break;
				case 'A':
					Navigation.makeLink(element); //eslint-disable-line
					break;
				case 'BUTTON':
					if (element.form == null) {
						const method = (event) => Signals.send('button',event.target); //eslint-disable-line
						element.addEventListener('click',method,false);
					}
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
		const string = new TextDecoder().decode(arrayBuffer);
		return JSON.parse(string);
	},
	redirect: function(event) {
		window.location = event.detail;
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

export const Signals = {
	loaded: (async function() {
		await loaded;
		window.onerror = Signals.errorMessage;
		window.onunhandledrejection = Signals.errorMessage;
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
				Signals.send('message',this);
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
		const alert = remaining - (Navigation.data.site.session_warning * 60000);//eslint-disable-line
		const warning = {
			action: 'session_warning',
			minutes: Math.ceil(alert/60000)
		}
		const expired = {
			action:'session_expired'
		}
		const method = (detail) => Signals.send('session_event',detail);

		this.timers.warning = window.setTimeout(method,alert,warning);
		this.timers.expired = window.setTimeout(method,remaining,expired);

	},
	update: function(response) {

		const string = response.headers.get('X-Session-Data');

		switch (string) {
			case 'session_expired':
			case 'session_invalid':
				const detail = {action: string};
				Signals.send('session_event',detail);
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

export const Navigation = {
	data: await (async function() {
		await loaded;
		const options = {
			method: 'GET',
			headers: {'Content-Type': 'application/x-gzip-compressed'}
		};
		const url = new URL('frontend/data/sitemap.gzip',document.baseURI);
		const request = new Request(url,options);
		const response = await fetch(request);
		return Site.decompress(response);
	}()),
	getUniFromHREF: function(href) {
		const url = new URL(href);
		let path = url.pathname;
		path = path.endsWith('/') ? path.slice(0,-1) : path;
		path = path == '' ? '/' : path;
		while (this.data.endpoints[path] == undefined && path != '') {
			const index = path.lastIndexOf('/',path.length);
			path = path.substring(0,index);
		}
		const index = this.data.endpoints[path];
		return this.data.unis[index];
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
		return node;
	},
	getChildren: function(uni) {
		const node = this.getNode(uni);
		const list = [];
		for (const i of node.children) {
			uni = this.data.unis[i];
			const child = this.getNode(uni);
			list.push(child);
		}
		return list;
	},
	getConditions: function(node) {
		let list = node.conditions.map(i => this.data.conditions[i]);
		if (list[0] == '') list.shift();
		list = list.join(';');
		return list == '' ? 'continue' : Session.conditions(list);
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
		return new URL(href,document.baseURI);
	},
	getElement: function(node,title = null,ignoreHidden = false) {
		switch (node.type) {
			case 'page':
				if (node.hidden == false || ignoreHidden == true) {
					if (this.getConditions(node) == 'continue') {
						const element = document.createElement('a');
						const method = (event) => {
							event.preventDefault();
							Signals.send('link',element);
						};
						element.href = this.getURL(node);
						element.target = node.target;
						element.title = node.title;
						element.dataset.uni = node.uni;
						element.textContent = title ? title : node.title;
						element.addEventListener('click',method,false);
						return element;
					}
				}
				break;
			case 'title':
			case 'redirect':
				console.log(node.type);
				break;
			case 'element':
				if (this.getConditions(node) == 'continue') {
					if (node.button == true) {
						const element = document.createElement('button');
						const method = (event) => {
							event.preventDefault();
							Signals.send('button',element);
						};
						element.type = 'button';
						element.name = node.element;
						element.value = node.uni;
						element.textContent = node.title;
						element.addEventListener('click',method,false);
						return element;
					}
				}
		}
		return document.createTextNode('');
	},
	makeLink: function(element) {
		if (element.dataset.uni) {
			const node = this.getNode(element.dataset.uni);
			if (this.getConditions(node) == 'continue') {
				const url = this.getURL(node);
				const method = (event) => {
					event.preventDefault();
					Signals.send('link',element);
				};
				element.href = url.href;
				element.target = node.target;
				element.title = node.title;
				element.addEventListener('click',method,false);
			} else {
				element.remove();
			}
		}
	}
}

export const Kits = {
	kits: {},
	constructors: {},
	install: function(name) {
		if (this.kits[name] == undefined) {
			console.log('install',name);
			const method = async (resolve,reject) => {
				const options = {
					method: 'GET',
					headers: {'Content-Type': 'application/x-gzip-compressed'}
				};
				const request = new Request('frontend/kits/'+name+'.kit',options);
				const response = await fetch(request);
				if (response.ok) {
					const kit = await Site.decompress(response);

					kit.name = name;

					await this.addTemplates(kit);
					await this.addAssets(kit);
					await this.addScript(kit);

					resolve(kit);
				} else {
					console.log(response);
					reject({});
				}
			}
			this.kits[name] = new Promise(method);
		}
	},
	createObjectURL: function(mime,...data) {
		const options = {type:mime};
		const blob = new Blob(data,options);
		return URL.createObjectURL(blob);
	},
	addAssets: function(kit) {
		const entries = Object.entries(kit.assets);
		for (const [name,asset] of entries) {
			switch (asset.mime) {
				case 'image/svg+xml':
					const template = document.createElement('template');
					template.innerHTML = asset.data.markup;
					kit.assets[name] = this.createObjectURL('text/css',asset.data.style);
					kit.templates[name] = template.content;
					break;
				case 'text/css':
					const url = new URL('../',document.location.href);
					asset.data = asset.data.replaceAll('../',url.href);
				default:
					kit.assets[name] = this.createObjectURL(asset.mime,asset.data);
					break;
			}
		}
	},
	addTemplates: function(kit) {

		const range = document.createRange();
		const fragment = range.createContextualFragment(kit.templates);
		const entries = Object.values(fragment.children);
		const templates = {};

		entries.forEach(element => templates[element.id] = element.content);

		kit.templates = templates;

	},
	getSVG: function(context,id) {

		const kit = this.constructors[context];
		const fragment = kit.assets[id].cloneNode(true);
		const template = {
			fragment: fragment,
			style: fragment.querySelector('style')
		};

		const ids = fragment.querySelectorAll('*[id]');

		for (const element of ids) {
			template[element.id] = element;
			element.id = Site.getID();
		}

		return template;

	},
	getTemplate: function(context,id) {

		const kit = this.constructors[context.constructor.name];
		const fragment = kit.templates[id].cloneNode(true);
		const template = {fragment: fragment};
		const elements = fragment.querySelectorAll('label[for],link,img,svg-object');

		fragment.querySelectorAll('*[id]').forEach(element => template[element.id] = element);

		for (const element of elements) {
			switch (element.constructor) {
				case HTMLLabelElement:
					element.htmlFor = template[element.htmlFor].id;
					break;
				case HTMLLinkElement:
					const href = element.getAttribute('href');
					if (href.startsWith('../') == false) {
						element.href = kit.assets[href];
					}
					break;
				case HTMLImageElement:
					const src = element.getAttribute('src');
					if (src.startsWith('../') == false) {
						element.src = kit.assets[src];
						element.nonce = Site.nonce;
					}
					break;
				default:
					element.setAttribute('context',context.constructor.name);
			}
		}

		return template;

	},
	getData: function(context,id,clone = false) {

		const kit = this.constructors[context.constructor.name];
		const data = kit.data[id];

		return clone ? structuredClone(data): data;

	},
	addScript: function(kit) {

		const content = [];
		const element = document.createElement('script');
		const url = new URL('/frontend/scripts/',document.location.href);

		kit.constructors.forEach(instance => Kits.constructors[instance] = kit);
		kit.dependencies = kit.dependencies.join(' ');
		kit.dependencies = kit.dependencies.replaceAll('../',url.href);

		content.push(kit.dependencies,kit.scripts);

		delete kit.scripts;
		delete kit.dependencies;
		delete kit.constructors;

		const options = {type:'text/javascript'};
		const blob = new Blob(content,options);

		element.title = kit.name;
		element.type = 'module';
		element.onload = () => URL.revokeObjectURL(blob);
		element.src = URL.createObjectURL(blob);

		document.head.appendChild(element);

	},
	addStyle: function(css) {

		const url = new URL('../styles/common.css',document.location.href);
		const style = '@import \''+url.href+'\'; '+css;
		const link = document.createElement('link');

		link.rel = 'stylesheet';
		link.href = 'data:text/css;base64,'+btoa(style);

		return link;

	}
}

export class Form {
	constructor(id) {

		this.url = new URL(document.location.href);
		this.form = document.forms[id];
		this.errors = {
			valid: 'Valid',
			customError: '',
			badInput: 'Bad input detected',
			patternMismatch: 'Incomplete or wrong',
			rangeOverflow: 'The value exceeds maximum',
			rangeUnderflow: 'The value is below minimum',
			stepMismatch: 'Incorrect value',
			tooLong: 'Too many characters',
			tooShort: 'Too few characters',
			typeMismatch: 'Invalid data type',
			valueMissing: 'Please fill in this field',
			optionMissing: 'Kindly select one option'
		};
		this.patterns = {
			mail: new RegExp('^[a-zA-Z0-9!#$%&\'*+\\/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&\'*+\\/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'),
			ssn: new RegExp('^(19|20)?[0-9]{2}[- ]?((0[1-9])|(10|11|12))[- ]?(([06][1-9])|([1278][0-9])|([39][0-1]))[-+ ]?([0-9]{4})$'),
			phone: new RegExp('^[0-9 -+]+$')
		};
		this.onResponse = () => {};

		this.form.noValidate = true;
		this.form.addEventListener('submit',this,false);
		this.form.addEventListener('reset',this,false);

		for (let element of this.form.elements) {
			if (element instanceof HTMLInputElement) {
				if (this.patterns[element.pattern] != undefined) {
					element.pattern = this.patterns[element.pattern];
				}
				element.addEventListener('change',this,false);
				element.addEventListener('invalid',this,false);
			}
		}

	}
	async handleEvent(event) {

		switch (event.type) {
			case 'submit':
				event.preventDefault();
				this.clearFormState();
				await this.submit(event);
				break;
			case 'reset':
				this.clearFormState();
				break;
			case 'change':
				if (event.target.pattern == 'ssn') {
					this.checkSSN(event.target);
				} else {
					event.target.checkValidity();
				}
				break;
			case 'invalid':
				this.invalid(event.target);
				break;
		}

	}
	invalid(element) {
		switch (element.type) {
			case 'hidden':
				break;
			case 'radio':
				this.form.elements[element.name][0].setCustomValidity(this.errors.optionMissing);
				break;
			default:
				for (let error in element.validity) {
					if (element.validity[error]) {
						this.setError(element,error);
						break;
					}
				}
		}
		for (let i = 0; i < element.labels.length; i += 1) {
			if (!element.validity.valid) {
				element.labels[i].dataset.error = element.validationMessage;
			}
		}
	}
	setError(element,error) {
		const custom = this.errors[element.name];
		const message = custom && custom[error] ? custom[error] : this.errors[error];
		element.setCustomValidity(message);
	}
	checkSSN(element) {
		let ssn = element.value.replace(/\D/g, '');
		let sum = 0;
		switch (ssn.length) {
			case 0:
				this.setError(element,'patternMismatch');
				break;
			case 10:
				let year = ssn.substring(0, 2);
				let date = new Date().getFullYear().toString();
				let century = '20' + year > date ? '19' : '20';
				ssn = century + ssn;
			default:
				for (let i = 11; i >= 2; i -= 1) {
					let digit = parseInt(ssn[i], 10);
					if (i % 2 == 0) {
						digit *= 2;
						digit -= (digit > 9) ? 9 : 0;
					}
					sum += digit;
				}
				if (sum % 10 != 0) {
					this.setError(element,'patternMismatch');
				}
		}
		element.checkValidity();
	}
	async submit(event) {

		const valid = this.form.checkValidity();

		for (const element of this.form.elements) {
			if (!element.validity.valid) {
				element.labels[0].scrollIntoView();
				break;
			}
		}

		if (valid) {

			const action = this.form.getAttribute('action');
			const path = ['api',action,event.submitter.name,event.submitter.value].join('/');
			const url = new URL(path,document.baseURI);
			const formData = new FormData(this.form);
			const body = {};

			for (const [key,value] of formData) {
				if (value instanceof File) {
					let binary = '';
					const buffer = await value.arrayBuffer();
					const bytes = new Uint8Array(buffer);
					bytes.forEach(byte => binary += String.fromCharCode(byte));
					const file = {
						name: value.name,
						size: value.size,
						type: value.type,
						data: btoa(binary)
					};
					body[key] = JSON.stringify(file);
				} else {
					body[key] = value;
				}
			}

			const options = {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify(body)
			};
			const request = new Request(url.href,options);
			const response = await fetch(request);
			const signals = await response.json();

			await Session.update(response);

			for (const signal of signals) {
				console.log(signal);
				if (signal.detail.field) {
					this.setFormState(signal.detail);
				}
				this.onResponse(signal);
			}

		}
	}
	reset() {

	}
	setFormState(data) {
		const element = this.form.elements[data.field];
		if (element == undefined) {
			throw new Error('Missing form field: '+data.field);
		}
		element.dataset.type = data.type;
		for (const label of element.labels) {
			label.dataset.type = data.type;
			if (this.errors[data.field]) {
				if (this.errors[data.field][data.key]) {
					label.dataset.text = this.errors[data.field][data.key];
				} else {
					label.dataset.text = this.errors[data.key];
				}
			} else if (this.errors[data.key]) {
				label.dataset.text = this.errors[data.key];
			}
		}
	}
	clearFormState() {
		for (const element of this.form.elements) {
			if (element.labels) {
				delete element.dataset.type;
				for (const label of element.labels) {
					delete label.dataset.text;
					delete label.dataset.type;
				}
			}
		}
	}
}

export class LapineKit extends HTMLElement {
	constructor() {
		super();
	}
	async connectedCallback() {

		const name = this.getAttribute('as');

		this.removeAttribute('as');

		const [kit,type] = name.split('/');
		const element = document.createElement(type);

		await Kits.install(kit);

		for (const attribute of this.attributes) {
			element.setAttribute(attribute.name,attribute.value);
		}

		element.innerHTML = this.innerHTML;

		this.replaceWith(element);

	}
}

export class LapineSVG extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode: 'open'});
	}
	async connectedCallback() {
		const as = this.getAttribute('as');
		const [context,name] = as.split('/');

		if (this.shadowRoot.firstChild == null) {
			Kits.install(context);

			const kit = await Kits.kits[context];
			const link = document.createElement('link');
			const fragment = kit.templates[name].cloneNode(true);

			link.rel = 'stylesheet';
			link.href = kit.assets[name];

			fragment.firstChild.before(link);

			this.shadowRoot.appendChild(fragment);
		}
	}
}

export class LapineFrame extends HTMLElement {
	constructor() {

		super();

		this.link = null;
		this.node = null;
		this.elements = null;
		this.isMain = this.id == 'main';

	}
	async connectedCallback() {

		this.dataset.loading = true;

		window.addEventListener('link',this,false);

		if (this.isMain) {

			const state = {href: window.location.href};

			history.replaceState(state,'',window.location.href);
			window.addEventListener('popstate',this,false);

			await Navigation.data;

			this.request(window.location.href);

		}
	}
	handleEvent(event) {
		switch (event.type) {
			case 'link':
				if (this.id == event.detail.target) {
					this.request(event.detail.href);
				}
				break;
			case 'popstate':
				event.preventDefault();
				this.request(event.state.href);
		}
	}
	async request(href) {

		this.dataset.loading = true;

		const options = {
			method: 'GET',
			headers: {
				'Accept': 'text/html',
				'X-Requested-With': 'LAPINE'
			}
		};

		const request = new Request(href,options);
		const response = await fetch(request);
		const html = await response.text();
		const range = document.createRange();
		const fragment = range.createContextualFragment(html);
		const uni = Navigation.getUniFromHREF(href);

		await Session.update(response);

		this.node = Navigation.getNode(uni);
		this.data = {};

		Site.setElements(this,fragment);

		while (this.firstChild) this.removeChild(this.firstChild);

		this.setAttribute('uni',this.uni);
		this.appendChild(fragment);

		document.body.dataset.state = this.node.state;

		if (this.isMain) {
			document.title = this.node.title;
			document.body.dataset.uni = this.node.uni;
			history.pushState({href: href},'',href);
		}

		this.dataset.loading = false;

	}
	disconnectedCallback() {
		window.removeEventListener('ready',this,false);
		window.removeEventListener('link',this,false);
		if (this.id == 'main') {
			window.removeEventListener('popstate',this,false);
		}
	}
}

export class LapineMessage extends HTMLElement { // eslint-disable-line no-unused-vars
	constructor(signal) {

		super();

		this.type = signal.type;
		this.title = signal.title;
		this.text = signal.text;
		this.buttons = signal.buttons;
		this.timeout = signal.timeout;

		this.attachShadow({mode: 'open'});

	}
	connectedCallback() {

		const element = document.getElementById('lapine-message');
		const fragment = element.content.cloneNode(true);
		const template = {fragment: fragment};

		fragment.querySelectorAll('*[id]').forEach(element => template[element.id] = element);

		template.container.classList.add(this.type);
		template.title.textContent = this.title;
		template.text.textContent = this.text;

		for (const button of this.buttons) {
			const element = document.createElement('button');
			const method = event => {
				event.preventDefault();
				if (button.signal) {
					Signals.send(button.signal.name,button.signal.detail);
				}
				this.remove();
			};

			element.textContent = button.label;
			element.addEventListener('click',method,false);

			template.buttons.appendChild(element);
		}

		this.shadowRoot.appendChild(template.fragment);

	}
}

export class LapineMessages extends HTMLElement {
	constructor() {

		super();

		this.attachShadow({mode: 'open'});

	}
	connectedCallback() {

		window.addEventListener('message',this,false);

		const element = document.getElementById('lapine-messages');
		const fragment = element.content.cloneNode(true);

		this.shadowRoot.appendChild(fragment);

	}
	handleEvent(event) {

		const message = new LapineMessage(event.detail);

		this.appendChild(message);

	}
	disconnectedCallback() {

		window.removeEventListener('message',this,false);

	}
}

window.customElements.define('lapine-kit',LapineKit);
window.customElements.define('lapine-svg',LapineSVG);
window.customElements.define('lapine-frame',LapineFrame);
window.customElements.define('lapine-message',LapineMessage);
window.customElements.define('lapine-messages',LapineMessages);

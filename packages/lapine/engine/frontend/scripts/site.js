
import {Output,Overlay} from './frontend.js';

export const Index = class {
	constructor() {
		window.addEventListener('load',this,false);
		window.addEventListener('index',this,false);
	}
	async handleEvent(event) {}
	async handleButton(context,name,value,data) {}
}

export const Site = new class {
	#loaded = Promise.withResolvers();
	#ready = Promise.withResolvers();
	#templates;
	elements = {};
	constructor() {
		window.addEventListener('load',this,false);
		window.addEventListener('site',this,false);
	}
	get loaded() {
		return this.#loaded.promise;
	}
	get ready() {
		return this.#ready.promise;
	}
	async handleEvent(event) {
		switch (event.type) {
			case 'load':
				this.#templates = await this.loadTemplates();
				this.elements.frame = this.getElements(document.body);
				this.scanElements(document.body);
				this.#loaded.resolve();
				break;
			case 'site':
				const {name,value} = event.detail;
				document.body.dataset.state = value;
				switch (name+' '+value) {
					case 'server ready':
						await this.loaded;
						this.#ready.resolve();
						Output.log('accept','Welcome!');
						Output.log('normal','Lapine App Studio is connected and ready.');
						Output.log('line');
						break;
					case 'server multiple':
						const port = new URL(document.location).port;
						Overlay.block('Multiple instances open on port '+port+', please close all except one');
						break;
					case 'server normal':
						Overlay.close();
						Output.log('accept','All other instances closed.');
						Output.log('line');
						break;
					case 'server disconnected':
						Overlay.block('Server disconnected on the backend');
						break;
				}
				break;
			case 'click':
				event.preventDefault();
				if (event.target.tagName == 'A') {
					console.log(event.target.href);
				} else {
					this.sendEvent('index',event.target.name,event.target.value,event.target);
				}
				break;
			case 'submit':
				event.preventDefault();
				const context = event.target.getAttribute('action');
				const data = new FormData(event.target);
				this.sendEvent(context,event.submitter.name,event.submitter.value,data,event.submitter);
				break;
		}
	}
	getElements(context) {
		const elements = context.querySelectorAll('*[id]');
		const method = element => [element.getAttribute('id'),element];
		const entries = Array.from(elements).map(method);
		return Object.fromEntries(entries);
	}
	scanElements(context,name) {
		const elements = context.querySelectorAll('form,template,script[type="module"]');
		for (const element of elements) {
			switch (element.tagName) {
				case 'FORM':
					element.addEventListener('submit',this,false);
					break;
				case 'TEMPLATE':
					this.#templates[element.id] = element.content;
					break;
				case 'SCRIPT':
					const script = document.createElement('script');
					const use = element.dataset.import || null;
					script.type = 'module';
					script.textContent = [
						use ? 'import {PageContext,'+use+'} from "'+document.baseURI+'scripts/frontend.js";' : '',
						'const ViewContext = PageContext.views[\''+name+'\'];',
						element.textContent
					].join('\n');
					element.replaceWith(script);
					break;
			}
		}
	}
	async loadTemplates() {
		const fragment = document.createElement('template');
        const response = await fetch('markup/templates.html');
        fragment.innerHTML = await response.text();
        const elements = fragment.content.querySelectorAll('template');
		const templates = {};
        elements.forEach(element => templates[element.id] = element.content);
        return templates;
	}
	async getTemplate(id) {
		await this.loaded;
		const fragment = this.#templates[id].cloneNode(true);
		const elements = fragment.querySelectorAll('*[id]');
		const template = {fragment};
		const add = element => {
			template[element.id] = element;
			//element.removeAttribute('id'); // id is needed by sitemap to identify drop areas
		}
		elements.forEach(add);
		return template;
	}
	slotChange(slot,element) {
		const options = {flatten: true};
		const nodes = slot.assignedNodes(options);
		const clone = node => {
			if (node.nodeType === Node.ELEMENT_NODE) {
				const clone = node.cloneNode(true);
				element.appendChild(clone);
			}
		}
		nodes.forEach(clone);
	}
	async APIRequest(context,name,value,data) {
		const options = {
			method: 'post',
			headers: {
				'accept': 'application/json',
				'content-type': 'application/json'
			},
			body: {context,name,value,data}
		}
		options.body = JSON.stringify(options.body);
		const request = new Request('/api/',options);
		const response = await fetch(request);
		if (response.ok) {
			const {context,name,value,data} = await response.json();
			this.sendEvent(context,name,value,data);
		} else {
			console.error(response);
		}
	}
	sendEvent(context,name,value,data,button = null) {
		const options = {
			detail: {name,value,data,button}
		}
		const event = new CustomEvent(context,options);
		window.dispatchEvent(event);
	}
	clearElement(element,fragment = null) {
		while (element.lastChild) {
			element.removeChild(element.lastChild);
		}
		if (fragment) {
			element.append(fragment);
		}
	}
	fillForm(form,data) {
		for (const input of form.elements) {
			const value = data[input.name];
			if (value !== undefined && value !== null) {
				switch (true) {
					case input.type == 'checkbox':
						input.checked = value === true || value === 'true';
						break;
					case Array.isArray(value):
						input.value = value.join(', ');
						break;
					default:
						input.value = value;
				}
			}
		}
	}
}

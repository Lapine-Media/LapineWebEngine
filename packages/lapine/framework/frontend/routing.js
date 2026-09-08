
import IO from './io.js';
import Site from './site.js';
import Session from './session.js';
import Forms from './forms.js';
import LapineFrame from './lapine-frame.js';

export const Routing = new class {
	#state = Promise.withResolvers();
	#clickLocked = false;
	data;
	node;
	constructor() {
		window.addEventListener('load',this,false);
	}
	get ready() {
		return this.#state.promise;
	}
	async handleEvent(event) {
		event.preventDefault();
		switch (event.type) {
			case 'load':
				const string = await IO.loadAsset('data/sitemap.gzip','gzip');
				this.data = JSON.parse(string);
				console.log(this.data);
				const uni = this.getUniFromHREF(window.location.href);
				this.node = this.getNode(uni);
				this.#state.resolve(true);
				break;
			case 'click':
				if (this.#clickLocked == true) {
					return;
				} else {
					this.#clickLocked = true;
					const unlock = () => this.#clickLocked = false;
					setTimeout(unlock,500);
				}
				const element = event.target;
				if (element.tagName == 'A') {
					if (element.target == '_blank') {
						window.open(element.href,element.target);
					} else if (element.target == 'button') {
						const URL = new URL(element.href);
						const button = document.createElement('button');
						button.name = URL.pathname;
						button.value = URL.searchParams;
						Site.handleButton(button);
					} else {
						Site.loadPage(element.href,element.target);
					}
				} else if (element.form) {
					//event.submitter
					Forms.handleEvent(event);
				} else {
					Site.handleButton(element);
				}
				break;
			default:

		}
	}
	getUniFromHREF(href) {
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
	}
	getNode(uni) {
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
	}
	getChildren(uni) {
		const node = this.getNode(uni);
		const list = [];
		for (const i of node.children) {
			uni = this.data.unis[i];
			const child = this.getNode(uni);
			list.push(child);
		}
		return list;
	}
	getURL(node) {
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
	}
	getConditions(conditions) {
		/*if (conditions === undefined) {
			return 'continue';
		}
		let list = node.conditions.map(i => this.data.conditions[i]);
		if (list[0] == '') {
			list.shift();
		}
		list = list.join(';');
		return list == '' ? 'continue' : this.getConditions(list);*/
		console.log(conditions);
		console.log(this.data.conditions);
		return 'continue';
	}
	getElement(node,ignoreHidden = false) {
		if (this.getConditions(node.conditions) != 'continue') {
			return document.createTextNode('');
		}
		switch (node.type) {
			case 'page':
				if (node.hidden == false || ignoreHidden == true) {
					const element = document.createElement('a');
					element.href = this.getURL(node);
					element.target = node.target;
					element.title = node.title;
					element.dataset.uni = node.uni;
					element.textContent = node.title;
					element.addEventListener('click',this,false);
					return element;
				}
				break;
			case 'title':
			case 'redirect':
				console.log(node.type);
				break;
			case 'element':
				if (node.button == true) {
					const element = document.createElement('button');
					element.type = 'button';
					element.name = node.element;
					element.value = node.uni;
					element.textContent = node.title;
					element.addEventListener('click',this,false);
					return element;
				}
		}
		return document.createTextNode('');
	}
	makeURL(href,path = null,parameters = null,hash = null) {
		const url = path ? new URL(path,href): new URL(href);
		if (parameters) {
			const entries = url.searchParams.entries();
			const array = [
				...Array.from(entries),
				...Object.entries(parameters)
			];
			parameters = new URLSearchParams(array);
			parameters = '?'+parameters.toString();
		}
		href = parameters ? url.href+parameters : url.href;
		href = hash ? href+'#'+hash : href;
		return new URL(href);
	}
	makeLink(element) {
		if (element.dataset.uni) {
			const node = this.getNode(element.dataset.uni);
			if (this.getConditions(node.conditions) == 'continue') {
				element.href = this.getURL(node);
				element.target = node.target;
				element.title = node.title;
				element.addEventListener('click',this,false);
			} else {
				element.remove();
			}
		}
	}
}

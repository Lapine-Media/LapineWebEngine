
import Site from './site.js';
//loaded

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

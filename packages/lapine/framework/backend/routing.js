
import Site from './site.js';

const sitemap = Promise.withResolvers();
let sitemapRequested = false;

export const Routing = {
	data: null,
	loadSitemap: async function() {
		if (sitemapRequested == false) {
			sitemapRequested = true;
			const data = await Site.loadAsset('/data/sitemap.json','json');
			sitemap.resolve(data);
		}
		this.data = await sitemap.promise;
	},
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


import { Index,MapData,MapNode } from '../frontend.js';

export const NodeTree = new class {
	#elements;
	#uniCount = -1;
	constructor() {}
	setup() {

		const methods = {
			arrange: function(a,b) {
				if (a.data.index < b.data.index) return -1;
				if (a.data.index > b.data.index) return 1;
				return 0;
			},
			sortChildren: function(element) {
				const items = Array.prototype.slice.call(element.children);
				const readd = item => element.appendChild(item);
				items.sort(this.arrange);
				items.forEach(readd);
			}
		}

		this.#elements = {};

		const values = {
			uni: 'root',
			type: 'root',
			title: MapData.getSiteValue('site_name'),
			details: MapData.getSiteValue('location'),
			expanded: true
		}

		const rootNode = new MapNode(values);

		for (let i = 0; i < MapData.length; i += 1) {
			const node = MapData.getNode(i);
			const element = new MapNode(node);
			rootNode.appendChild(element);
		}

		const elements = Object.values(this.#elements);

		for (const element of elements) {
			const parents = element.data.parents;
			if (parents && parents.length > 0) {
				const index = parents[parents.length-1];
				const uni = MapData.getUni(index);
				const parent = this.getElement(uni);
				parent.appendChild(element);
			}
		}

		for (const element of elements) {
			if (element.children.length > 1) {
				methods.sortChildren(element);
			}
		}

	}
	get root() {
		return this.#elements.root;
	}
	updateRoot(data) {
		this.#elements.root.data.title = data.site_name;
		this.#elements.root.data.details = data.location;
		this.#elements.root.update();
	}
	addElement(uni,element) {
		this.#elements[uni] = element;
	}
	removeElement(uni) {
		delete this.#elements[uni];
	}
	getElement(uni) {
		return this.#elements[uni];
	}
	getUni(type) {
		this.#uniCount += 1;
		const uni = type+this.#uniCount;
		return this.#elements[uni] == undefined ? uni : this.getUni(type);
	}
	getPath(element,path = []) {
		path.push(element.data.path);
		if (element.parentNode.data.type == 'root') {
			path = path.reverse().join('/');
			path = path.startsWith('/') ? path : '/'+path;
			const url = MapData.getSiteValue('base_url').replace(/\/$/,'');
			return url+path;
		}
		return this.getPath(element.parentNode,path);
	}
	getParents(element,map,list = []) {
		const parent = element.parentNode;
		if (parent.data.type != 'root') {
			const index = map.unis.indexOf(parent.data.uni);
			list.push(index);
			list = this.getParents(parent,map,list);
		}
		return list;
	}
	getChildren(element,map,list = []) {
		for (const child of element.children) {
			const index = map.unis.indexOf(child.data.uni);
			list.push(index);
		}
		return list;
	}
	getConditions(element,map,list = []) {
		const condition = element.data.conditions || '';
		let index = map.conditions.indexOf(condition);
		if (index < 0) {
			map.conditions.push(condition);
			index = map.conditions.length-1;
		}
		block: {
			if (list.includes(index) == false) {
				if (index == 0 && list.length > 0) {
					break block;
				}
				list.push(index);
			}
		}
		if (element.parentNode.data.type != 'root') {
			list = this.getConditions(element.parentNode,map,list);
		}
		return list;
	}
	getFrame(element,map) {
		let parent = element.parentNode;
		while (parent.data.type != 'frame') {
			parent = parent.parentNode;
		}
		return map.unis.indexOf(parent.data.uni);
	}
	getInherentedValue(element,name,frame) {
		if (element.parentNode.data.type == 'root') {
			return MapData.getSiteValue(name);
		}
		const value = element.parentNode.data[name];
		return value.length == 0 ? this.getInherentedValue(element.parentNode,name,frame) : value;
	}
	getValue(key,element,map) {
		const value = element.data[key];
		switch (key) {
			case 'type':
				return map.keys.types.indexOf(value);
			case 'index':
				return Array.prototype.indexOf.call(element.parentNode.childNodes,element);
			case 'missing':
				return value ? value : this.#elements.frame.data.missing;
			case 'parents':
				return this.getParents(element,map).reverse();
			case 'children':
				return this.getChildren(element,map);
			case 'conditions':
				return this.getConditions(element,map);
			case 'frame':
				return this.getFrame(element,map);
			case 'hidden':
			case 'button':
			case 'nofollow':
			case 'permanent':
			case 'redirect':
				return value === true || value == 'true';
			default:
				return value;
		}
	}
	getNewNode(type,title) {
		const uni = this.getUni(type);
		const node = MapData.getNewNode(type,title,uni);
		return new MapNode(node);
	}
	getMap() {

		const map = {
			site: MapData.site,
			unis: [],
			endpoints: {},
			nodes: [],
			conditions: [''],
			keys: MapData.keys
		};

		const collect = element => {
			switch (true) {
				case element.isConnected == false:
				case element.data.type == 'root':
					return;
			}
			map.unis.push(element.data.uni);

			let path = '';
			switch (element.data.type) {
				case 'frame':
					path = element.data.uni == 'frame' ? '/' : element.data.path;
					map.endpoints[path] = element.firstChild.data.uni;
				break;
				case 'page':
				case 'redirect':
					path += this.getPath(element);
					map.endpoints[path] = element.data.uni;
			}
		}

		Object.values(this.#elements).forEach(collect);

		const a = value => map.unis.indexOf(value);
		const indexes = Object.values(map.endpoints).map(a);
		const b = (key,i) => map.endpoints[key] = indexes[i];
		const c = index => map.keys.values[index];
		const d = value => map.keys.values.indexOf(value);
		const e = type => map.keys[type] = map.keys[type].map(c);
		const f = type => map.keys[type] = map.keys[type].map(d);
		const g = uni => {
			const element = this.getElement(uni);
			const keys = map.keys[element.data.type];
			const node = [];
			for (const index of keys) {
				const key = map.keys.values[index];
				const value = this.getValue(key,element,map);
				node.push(value);
			}
			map.nodes.push(node);
		}

		Object.keys(map.endpoints).forEach(b);

		map.keys.types.forEach(e);
		map.keys.values.sort();
		map.keys.types.forEach(f);
		map.unis.forEach(g);

		return map;

	}
}

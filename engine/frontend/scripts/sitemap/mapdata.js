
export const MapData = new class {
	#data;
	constructor() {}
	setup(data) {
		this.#data = data;
		console.log(data);
	}
	get length() {
		return this.#data.nodes.length;
	}
	get site() {
		return this.#data.site;
	}
	get keys() {
		return this.#data.keys;
	}
	set site(value) {
		this.#data.site = value;
	}
	getSiteValue(name) {
		return this.#data.site[name];
	}
	setSiteValue(name,value) {
		this.#data.site[name] = value;
	}
	getUni(index) {
		return this.#data.unis[index];
	}
	isRequired(uni) {
		return this.#data.keys.required.includes(uni);
	}
	isReserved(uni) {
		return this.#data.keys.reserved.includes(uni);
	}
	getNode(i) {
		const index = this.#data.nodes[i][0];
		const type = this.#data.keys.types[index];
		const node = {};
		const method = (x,y) => {
			const key = this.#data.keys.values[x];
			node[key] = this.#data.nodes[i][y];
		}
		this.#data.keys[type].forEach(method);
		node.uni = this.#data.unis[i];
		node.type = type;
		if (node.conditions) {
			const condition = node.conditions[0];
			node.conditions = this.#data.conditions[condition];
		}
		return node;
	}
	getNewNode(type,title,uni) {

		const node = {};
		const keys = this.#data.keys[type];

		for (let i = 0; i < keys.length; i += 1) {
			const index = keys[i];
			const key = this.#data.keys.values[index];
			node[key] = '';
		}

		node.type = type;
		node.title = title;
		node.uni = uni;
		node.path = uni;
		node.expanded = false;

		switch (type) {
			case 'frame':
				node.file = uni;
				node.script = 'index';
				break;
			case 'page':
				node.target = 'main';
				break;
		}

		return node;

	}
}

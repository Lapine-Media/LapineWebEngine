
import Site from './site.js';

export const Kits = new class {
	#state = Promise.withResolvers();
	#kits = {};
	#constructors = {};
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
				this.#kits.lapine = {
					name: 'lapine',
					templates: await IO.loadAsset('markup/frames/templates.html','text')
				}
				await this.addTemplates(this.#kits.lapine);
				this.#state.resolve(true);
		}
	}
	async install(name) {
		if (this.#kits[name] === undefined) {
	        this.#kits[name] = this.loadKit(name);
	    }
	    return this.#kits[name];
	}
	async loadKit(name) {
		await Site.ready;
		console.log('install',name);
		const string = await IO.loadAsset('kits/'+name+'.kit.gzip','gzip');
		const kit = JSON.parse(string);
		kit.name = name;
		await this.addTemplates(kit);
		await this.addAssets(kit);
		await this.addScript(kit);
		console.log(kit);
		return kit;
	}
	createObjectURL(mime,...data) {
		const options = {type:mime};
		const blob = new Blob(data,options);
		return URL.createObjectURL(blob);
	}
	addTemplates(kit) {

		const range = document.createRange();
		const fragment = range.createContextualFragment(kit.templates);
		const entries = Object.values(fragment.children);
		const templates = {};

		entries.forEach(element => templates[element.id] = element.content);

		kit.templates = templates;

	}
	addAssets(kit) {
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
	}
	addScript(kit) {

		kit.scripts = kit.scripts.replaceAll('../',document.baseURI+'scripts/');
		kit.scripts = kit.scripts.replace('::/',document.baseURI+'data/sourcemaps/');

		kit.constructors.forEach(instance => this.#constructors[instance] = kit);

		const options = {type:'text/javascript'};
		const blob = new Blob([kit.scripts],options);
		const element = document.createElement('script');

		delete kit.scripts;
		delete kit.constructors;

		element.title = kit.name;
		element.type = 'module';
		element.onload = () => URL.revokeObjectURL(blob);
		element.src = URL.createObjectURL(blob);

		document.head.appendChild(element);

	}
	getTemplate(context,id) {
		const kit = this.#constructors[context.constructor.name];
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

	}
}

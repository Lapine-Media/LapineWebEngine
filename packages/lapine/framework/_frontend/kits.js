
import Site from './site.js';

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

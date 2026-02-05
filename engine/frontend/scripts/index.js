
import { IO,Output,Overlay } from './frontend.js';

export const Index = new class {
	#state = Promise.withResolvers();
	#templates = {};
	#clickLocked = false;
	elements = {};
	constructor() {
		window.addEventListener('index',this,false);
	}
	get ready() {
		return this.#state.promise;
	}
	async handleEvent(event) {
		switch (event.type) {
			case 'click':
				event.preventDefault();
				if (this.#clickLocked == true) return;
				this.#clickLocked = true;
				setTimeout(() => this.#clickLocked = false,500);
				if (event.target.tagName == 'A') {
					const url = new URL(event.target.href);
					if (url.hostname == '127.0.0.1') {
						const [,context,name,value] = url.pathname.split('/');
						const search = url.searchParams.entries();
						const data = Object.fromEntries(search);
						IO.sendSignal(true,context,name,value,data);
					} else {
						await this.openLink(event.target.href,event.target.target);
					}
				} else {
					this.buttonHandler(event.target);
				}
				break;
			case 'change':
				if (event.target == document.forms.index.elements.awesome) {
					document.body.dataset.awesome = event.target.checked;
					localStorage.setItem('awesome',event.target.checked);
					if (event.target.checked == false) {
						Output.log('danger','Oh, ok... ( •_•)','reject');
					} else {
						Output.log('inform','Heck yeah! °˖✧◝ \\（ ^ ◡ ^ ）/ ◜✧˖° ♥','accept');
					}
				} else {
					localStorage.setItem('audio',event.target.checked);
					if (event.target.checked == false) {
						Output.log('danger','Got it, no sounds... (>_<)');
					} else {
						Output.log('inform','Wohoo! .☆((⸜(⁀ ᗜ ⁀)⸝))☆. ♥','accept');
					}
				}
				Output.log('line');
				break;
			case 'submit':
				event.preventDefault();
				const context = event.target.getAttribute('action');
				let data = new FormData(event.target);
				if (event.target.enctype != 'multipart/form-data') {
					const entries = data.entries();
					data = Object.fromEntries(entries);
				}
				IO.sendSignal(true,context,event.submitter.name,event.submitter.value,data);
				break;
			default:
				this.buttonHandler(event.detail);
		}
	}
	async setState(state) {
		try {
			switch (state) {
				case 'ready':

					this.#templates = await this.loadTemplates();
					this.elements.frame = this.getElements(document.body);

					const form = document.forms.index;
					const awesome = localStorage.getItem('awesome') === 'true';
					document.body.dataset.awesome = awesome;
					form.elements.awesome.checked = awesome;
					form.elements.awesome.addEventListener('change',this);

					const audio = localStorage.getItem('audio') === 'true';
					document.body.dataset.awesome = audio;
					form.elements.audio.checked = audio;
					form.elements.audio.addEventListener('change',this);

					const promises = [
						this.openLink('/markup/project.html','project'),
						this.openLink('/markup/sitemap.html','sitemap'),
						this.openLink('/markup/manifest.html','manifest'),
						this.openLink('/markup/cloudflare.html','cloudflare')
					];

					await Promise.all(promises);

					const data = {title:'Project'};
					IO.sendSignal(true,'index','menu','project',data);

					this.#state.resolve(true);

					break;
				case 'multiple':
					const port = new URL(document.location).port;
					Overlay.block('Multiple instances open on port '+port+', please close all except one');
					break;
				case 'disconnected':
					Overlay.block('Server disconnected on the backend');
					break;
				default:
					document.body.dataset.state = state;
			}
		} catch (error) {
			console.log(error);
		}
	}
	getElements(target) {
		const elements = target.querySelectorAll('a,button,form,*[id]');
		const collection = {};
		for (const element of elements) {
			switch (element.tagName) {
				case 'A':
					if (element.id) {
						collection[element.id] = element;
					}
				case 'BUTTON':
					if (element.form == null) {
						element.addEventListener('click',this,false);
						if (element.id) {
							collection[element.id] = element;
						}
					}
					break;
				case 'FORM':
					element.addEventListener('submit',this,false);
					break;
				default:
					collection[element.id] = element;
			}
		}
		return collection;
	}
	async loadTemplates() {
		const rewriteUrls = (cssText, baseUrl) => {
			baseUrl = baseUrl.replace('../',document.location.origin+'/');
			const getURL = (match,url) => {
				switch (true) {
					case url.startsWith('data:'):
					case url.startsWith('http'):
					case url.startsWith('/'):
						return match;
				}
				return new URL(url, baseUrl).href;
			}
			const imports = (match, url1, url2) => {
				const absoluteUrl = getURL(match,url1 || url2);
				return '@import "'+absoluteUrl+'";';
			}
			const datas = (match, url) => {
				const absoluteUrl = getURL(match,url);
				return 'url("'+absoluteUrl+'");';
			}
			cssText = cssText.replace(/@import\s+(?:url\(['"]?(.+?)['"]?\)|['"](.+?)['"]);?/g, imports);
			cssText = cssText.replace(/url\(['"]?(.+?)['"]?\)/g, datas);
			return cssText;
		};
		try {
			const templateContainer = document.createElement('template');
			templateContainer.innerHTML = await IO.loadAsset('markup/templates.html', 'html');
			const elements = templateContainer.content.querySelectorAll('template');
			const templates = {};
			for (const element of elements) {
				const links = element.content.querySelectorAll('link[rel="stylesheet"]');
				for (const link of links) {
					try {
						let cssText = await IO.loadAsset(link.href, 'text');
						cssText = rewriteUrls(cssText, link.href);
						const style = document.createElement('style');
						style.textContent = cssText;
						link.replaceWith(style);
					} catch (error) {
						console.log(error);
						Output.log('danger','Failed to inline CSS for '+link.href);
					}
				}
				templates[element.id] = element.content;
			}
			return templates;
		} catch (error) {
			throw error;
		}
	}
	getTemplate(id) {
		const fragment = this.#templates[id].cloneNode(true);
		const template = {fragment};
		const method = element => template[element.id] = element;
		fragment.querySelectorAll('*[id]').forEach(method);
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
	async openLink(href,target,signal = false) {
		if (target == '_blank') {
			window.open(href,target);
			return true;
		}
		try {
			const template = document.createElement('template');
			const frame = document.getElementById(target);
			template.innerHTML = await IO.loadAsset(href,'text');
			this.update(frame,template.content);
			this.elements[target] = this.getElements(frame);
			IO.receiveSignal(signal,href);
			return this.elements[target];
		} catch (error) {
			throw error;
		}
	}
	buttonHandler(detail) {
		switch (detail.name+' '+detail.value) {
			case 'menu about':
				Overlay.open('Lapine Web Engine','/markup/about.html',null,null,'Close');
				break;
			case 'menu '+detail.value:
				document.body.dataset.page = detail.value;
				Index.elements.frame.title.textContent = detail.data.title;
				IO.sendSignal(true,detail.value,'menu','visible',detail.data);
				break;
			case 'dialog cancel':
				Overlay.close();
				break;
			case 'log clear':
				Output.clear();
				break;
			default:
				if (detail.name == 'state') {
					this.setState(detail.value);
				} else {
					console.log(detail.name+' '+detail.value);
				}
		}
	}
	update(element,fragment = null) {
		while (element.lastChild) {
			element.removeChild(element.lastChild);
		}
		if (fragment) {
			element.append(fragment);
		}
		element.classList.remove('loading');
	}
	fillForm(form,data) {
		for (const input of form.elements) {
			const value = data[input.name];
			if (value !== undefined && value !== null) {
				switch (true) {
					case input.type == 'checkbox':
						input.checked = true;
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


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
						IO.signal(context,name,value,data);
					} else {
						await this.openLink(event.target.href,event.target.target);
					}
				} else {
					this.buttonHandler(event.target);
				}
				break;
			case 'change':
				document.body.dataset.awesome = event.target.checked;
				localStorage.setItem('awesome',event.target.checked);
				if (event.target.checked == false) {
					IO.log('danger','Oh, ok... ( •_•)');
				} else {
					IO.log('inform','Heck yeah! °˖✧◝ \\（ ^ ◡ ^ ）/ ◜✧˖° ♥');
				}
				IO.log('line');
				break;
			case 'submit':
				event.preventDefault();
				const context = event.target.getAttribute('action');
				let data = new FormData(event.target);
				if (event.target.enctype != 'multipart/form-data') {
					const entries = data.entries();
					data = Object.fromEntries(entries);
				}
				IO.signal(context,event.submitter.name,event.submitter.value,data);
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

					const promises = [
						this.openLink('/markup/project.html','project'),
						this.openLink('/markup/sitemap.html','sitemap'),
						this.openLink('/markup/manifest.html','manifest'),
						this.openLink('/markup/cloudflare.html','cloudflare')
					];

					await Promise.all(promises);

					const data = {uni:'project',title:'Project'};
					IO.signal('index','menu','page',data);

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
		const promise = async (resolve,reject) => {
			try {
				const template = document.createElement('template');
				template.innerHTML = await IO.loadAsset('markup/templates.html','html');
				const elements = template.content.querySelectorAll('template');
				const templates = {};
				elements.forEach(element => templates[element.id] = element.content);
				resolve(templates);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	}
	getTemplate(id) {
		const fragment = this.#templates[id].cloneNode(true);
		const template = {fragment: fragment};
		const method = element => {
			template[element.id] = element;
		}
		fragment.querySelectorAll('*[id]').forEach(method);
		return template;
	}
	async openLink(href,target) {
		if (target == '_blank') {
			window.open(href,target);
			return Promise.resolve(true);
		}
		const promise = async (resolve,reject) => {
			try {
				const template = document.createElement('template');
				const frame = document.getElementById(target);

				template.innerHTML = await IO.loadAsset(href,'text');

				this.update(frame,template.content);

				this.elements[target] = this.getElements(frame);

				resolve(true);
			} catch (error) {
				console.log(error);
				reject(error);
			}
		}
		return new Promise(promise);
	}
	buttonHandler(detail) {
		switch (detail.name+' '+detail.value) {
			case 'menu about':
				Overlay.open('Lapine Web Engine','/markup/about.html',null,'Close');
				break;
			case 'menu page':
				document.body.dataset.page = detail.data.uni;
				Index.elements.frame.title.textContent = detail.data.title;
				IO.signal(detail.data.uni,'menu','visible',detail.data);
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
					console.log(detail);
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
}

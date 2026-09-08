
import LapineView from './lapine-view.js';

export const Index = {};

export const Site = new class {
	#state = Promise.withResolvers();
	#sw = null;
	views = {
		data: {},
		templates: {},
		elements: {}
	};
	constructor() {
		window.addEventListener('load',this,false);
		window.addEventListener('pushstate',this,false);
		window.addEventListener('popstate',this,false);
		const state = {href: window.location.href};
		history.replaceState(state,'',window.location.href);
	}
	get ready() {
		return this.#state.promise;
	}
	async handleEvent(event) {
		event.preventDefault();
		switch (event.type) {
			case 'load':
				if ('serviceWorker' in navigator) {
					const container = navigator.serviceWorker;
					container.addEventListener('controllerchange',this,false);
					container.addEventListener('message',this,false);
					if (container.controller === null) {
						console.log('Register new SW for the app.');
						const options = {type: 'module'};
						this.#sw = await container.register('scripts/lapine/sw.js',options);
						this.#sw.addEventListener('updatefound',this,false);
						console.log('SW is registered.');
					} else {
						console.log('SW is already registered.');
					}
				}
				await Routing.ready;
				const dialog = document.createElement('dialog');
				dialog.id = 'lapine_messages';
				dialog.classList.add('lapine_messages');
				document.body.append(dialog);
				this.scanElements('site',document.body);
				this.loadPage(window.location.href);
				this.#state.resolve(true);
				document.body.dataset.loaded = true;
				break;
			case 'pushstate':
				console.log(event);
				break;
			case 'popstate':
				this.loadPage(event.state.href,event.state.target,false);
				break;
			case 'controllerchange':
				console.log('SW is changed (installed or removed).');
				break;
			case 'updatefound':
				this.#sw.installing.addEventListener('statechange',this,false);
				break;
			case 'statechange':
				if (this.#sw.installing.state === 'installed' && navigator.serviceWorker.controller) {
					//showUpdateBanner(); // "A new version is available — click to update"
					// The banner triggers skipWaiting via a postMessage to the service worker, then reloads the page.
					// This gives you control over when updates apply rather than leaving it to chance.
				}
				break;
			case 'message':
				//if (event.data.type === 'SYNC_COMPLETE') refreshUI();
				break;
			default:

		}
	}
	getElements(context) {
		const elements = context.querySelectorAll('*[id]');
		const method = element => [element.id,element];
		const entries = Array.from(elements).map(method);
		return Object.fromEntries(entries);
	}
	scanElements(id,context) {
		const view = id == 'site' ? this.views : this.views.elements[id];
		const elements = context.querySelectorAll('style,template,script,button,a');
		for (const element of elements) {
			switch (element.tagName) {
				case 'STYLE':
					element.textContent = element.textContent.replace('../',document.baseURI);
					break;
				case 'TEMPLATE':
					view.templates[element.id] = element.content;
					element.remove();
					break;
				case 'SCRIPT':
					if (element.type == 'application/json') {
						view.data[element.id] = JSON.parse(element.textContent);
						element.remove();
					} else {
						const script = document.createElement('script');
						const content = [
							'import {Index,Site,IO,Routing,Form} from "'+document.baseURI+'scripts/frontend.js";',
							'const ViewContext = Site.views.elements["'+id+'"]',
							element.textContent
						];
						script.type = 'module';
						script.innerHTML = content.join('\n');
						element.replaceWith(script);
					}
					break;
				case 'BUTTON':
					if (element.form == undefined) {
						element.addEventListener('click',Routing,false);
					}
					break;
				case 'A':
					Routing.makeLink(element);
			}
		}
		view.elements = Site.getElements(context);
	}
	async loadPage(href,target = 'main',push = true) {

		const element = this.views.elements[target];
		const uni = Routing.getUniFromHREF(href);
		const node = Routing.getNode(uni);

		element.dataset.loading = true;
		element.dataset.node = node.uni;

		const options = {
			headers: {
				'Accept': 'text/html',
				'X-Requested-By': 'Lapine'
			}
		};

		const html = await IO.loadAsset(href,'text',options);
		const range = document.createRange();
		const fragment = range.createContextualFragment(html);
		const link = document.createElement('link');

		link.rel = 'stylesheet';
		link.href = document.baseURI+'styles/base.css';

		this.scanElements(target,fragment);

		fragment.prepend(link);
		element.update(fragment);

		document.body.dataset.state = node.state;

		if (target == 'main' && push) {
			document.title = node.title;
			document.body.dataset.uni = node.uni;
			const state = {href,target};
			history.pushState(state,'',href);
		}

		element.dataset.loading = false;

	}
	handleButton(button) {

	}
}
/*
click handler
button handler
submit

add LapineMessages

addEventListener
	redirect
	error
	unhandledrejection

open link
api request
load asset

elements
templates

nonce

updateElement
fillForm
getID
getTime
decompress
redirect

---

setElements
	style, template, script, button, a, lapine-kit

*/

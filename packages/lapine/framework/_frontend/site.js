
import Navigation from './navigation.js';
import IO from './io.js';
import LapineMessages from './lapine-messages.js';

const method = function(resolve) {
	window.onload = () => resolve('blergh');
}
const loaded = new Promise(method);

export const Index = {};

export const Site = {
	id: 0,
	nonce: document.scripts[0].nonce,
	loaded: (async function() {

		await loaded;

		const element = new LapineMessages();

		document.body.prepend(element);
		document.body.dataset.loaded = true;

		window.addEventListener('redirect',Site.redirect,false);

		console.log('loaded!');

		return true;

	}()),
	getID: function() {
		const id = 'id'+this.id;
		this.id += 1;
		return id;
	},
	getTime: function() {
		const date = new Date();
		const offset = date.getTimezoneOffset();
		const time = date.getTime();
		return time - (offset*60000);
	},
	setElements: function(context,target) {

		const url = new URL('/frontend/scripts/frontend.js',document.baseURI);
		const elements = target.querySelectorAll('template, script, button, a');

		for (const element of elements) {
			switch (element.tagName) {
				case 'TEMPLATE':
					context.templates[element.id] = element.content;
					break;
				case 'SCRIPT':
					if (element.type == 'application/json') {
						context.data[element.id] = JSON.parse(element.text);
						element.remove();
					} else {
						const id = this.getID();
						const content = [
							'import {Index,Site,IO,Navigation,Form} from "'+url.href+'";',
							'window.currentScript = document.all.'+id+';',
							element.textContent
						];
						const options = {type:'text/javascript'};
						const blob = new Blob(content,options);
						const script = document.createElement('script');

						script.src = URL.createObjectURL(blob);
						script.type = element.type;
						script.nonce = Site.nonce;
						script.id = id;

						element.replaceWith(script);

						URL.revokeObjectURL(blob);
					}
					break;
				case 'A':
					Navigation.makeLink(element); //eslint-disable-line
					break;
				case 'BUTTON':
					if (element.form == null) {
						const method = (event) => IO.send('button',event.target); //eslint-disable-line
						element.addEventListener('click',method,false);
					}
			}
		}
	},
	decompress: async function(response) {
		const data = await response.arrayBuffer();
		const ds = new DecompressionStream('gzip');
		const writer = ds.writable.getWriter();
		writer.write(data);
		writer.close();
		const arrayBuffer = await new Response(ds.readable).arrayBuffer();
		const string = new TextDecoder().decode(arrayBuffer);
		return JSON.parse(string);
	},
	redirect: function(event) {
		window.location = event.detail;
	}
}

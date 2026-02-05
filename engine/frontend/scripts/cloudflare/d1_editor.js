
import { Index,Settings,IO,LapineMessage } from '../frontend.js';

export const D1Editor = new class {
	#selected = null;
	#migrations = {};
	#tables = [];
	#editor = {};
	#data;
	constructor() {
		window.addEventListener('d1_editor',this,false);
	}
	async handleEvent(event) {
		try {
			let signal,message;
			switch (event.detail.name+' '+event.detail.value) {
				case 'editor started':
					this.#data = event.detail.data;
					console.log(event.detail.data);
					signal = () => {
						document.body.dataset.editor = true;
						IO.sendSignal(false,'d1','editor','setup');
					}
					Index.openLink('/markup/cloudflare/d1/d1_editor.html','editor',signal);
					break;
				case 'close editor':
					signal = () => document.body.dataset.editor = false;
					IO.sendSignal(false,'cloudflare','stop','editor',this.#data,signal);
					break;
				/*case 'database list':

					break;
				case 'migration list':

					break;*/
				default:
					console.log(event.detail.name+' '+event.detail.value, event.detail.data);
			}
		} catch (error) {
			console.log(event.detail);
			console.log(error);
		}
	}
	#listDatabase(data) {

		this.#tables = [];

		let type = '';
		const dl = document.createElement('dl');
		const makeDT = text => {
			const element = document.createElement('dt');
			element.textContent = text;
			dl.append(element);
		}
		const makeDD = (type,name) => {
			const method = event => {
				const object = {type,name,element: event.target};
				IO.sendSignal(true,'d1_editor','ui','select',object);
			};
			const element = document.createElement('dd');
			element.addEventListener('click',method,false);
			element.classList.add(type);
			element.textContent = name;
			dl.append(element);
		}
		const location = this.#editor.remote ? 'Remote' : 'Local';
		const name = this.#editor.binding+' ('+location+')';

		makeDT(name);
		makeDD('database',this.#editor.database_name);

		for (const item of data.results) {
			if (item.type != type) {
				makeDT(item.type+'s');
				type = item.type;
			}
			if (item.type == 'table') {
				this.#tables.push(item.name);
			}
			makeDD(item.type,item.name);
		}

		Index.update(Index.elements.editor.database,dl);

	}
}

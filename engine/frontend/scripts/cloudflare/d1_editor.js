
import { Index,Settings,IO,Output,LapineMessage } from '../frontend.js';

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
				case 'editor reloaded':
					this.#data = event.detail.data;
					signal = () => this.#setup();
					Index.openLink('/markup/cloudflare/d1/d1_editor.html','editor',signal);
					break;
				case 'close editor':
					IO.sendSignal(false,'cloudflare','stop','editor',this.#data);
					break;
				case 'database list':
					this.#listDatabase(event.detail.data);
					break;
				case 'editor stopped':
					console.log('editor stopped');
					document.body.dataset.editor = false;
					break;
				case 'ui size':
					Index.elements.editor.center.dataset.size = {
						same: 'results',
						results: 'query',
						query: 'same'
					}[Index.elements.editor.center.dataset.size];
					break;
				case 'ui reload':
					IO.sendSignal(false,'d1','editor','setup');
					break;
				case 'ui execute':
					signal = object => this.#queryResult(object.value,object.data);
					IO.sendSignal(false,'d1','execute','query',event.detail.data.query,signal);
					break;
				/*case 'migration list':

					break;*/
				case 'template '+event.detail.value:
					signal = object => this.#appendQueryField(object.value,object.data);
					IO.sendSignal(false,'d1','load','template',event.detail.value,signal);
					break;
				case 'file import':
					this.#importFile();
					break;
				default:
					console.log(event.detail.name+' '+event.detail.value, event.detail.data);
			}
		} catch (error) {
			console.log(event.detail);
			console.log(error);
		}
	}
	#setup() {
		const event = event => this.#select('database',this.#data.database_name,event.target);
		document.body.dataset.editor = true;
		Index.elements.editor.binding.addEventListener('click',event,false);
		Index.elements.editor.database_name.textContent = this.#data.database_name;
		Index.elements.editor.database_uuid.textContent = this.#data.database_id;
		Index.elements.editor.database_preview.textContent = this.#data.database_preview_id;
		Index.elements.editor.binding_name.textContent = this.#data.binding;
		Index.elements.editor.binding_environment.textContent = this.#data.binding_environment;
		IO.sendSignal(false,'d1','editor','setup');
	}
	#listDatabase(data) {

		console.log(data);

		const fragment = document.createDocumentFragment();

		if (data.results.length == 0) {

			document.forms.d1_form.dataset.empty = true;

			const div = document.createElement('div');
			const small = document.createElement('small');
			small.textContent = 'This database is empty.';
			div.className = 'empty';
			div.append(small);
			fragment.append(div);

		} else {

			document.forms.d1_form.dataset.empty = false;

			this.#tables = [];

			let type = '';
			const dl = document.createElement('dl');
			const makeDT = text => {
				const element = document.createElement('dt');
				element.textContent = text;
				dl.append(element);
			}
			const makeDD = (type,name) => {
				const method = () => this.#select(type,name,element);
				const element = document.createElement('dd');
				element.addEventListener('click',method,false);
				element.classList.add(type);
				element.textContent = name;
				dl.append(element);
			}

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

			fragment.append(dl);

		}

		Index.update(Index.elements.editor.database,fragment);

	}
	#select(type,name,element) {
		if (this.#selected != null) {
			this.#selected.classList.remove('selected');
		}
		element.classList.add('selected');
		this.#selected = element;
		Index.elements.editor.selected.textContent = type;
		const form = document.forms.d1_form;
		form.dataset.selected = type;
		form.elements.name.value = name;
		form.elements.type.value = type;
	}
	#deselect() {
		this.#selected.classList.remove('selected');
		this.#selected == null;
		Index.elements.editor.selected.textContent = 'Selected';
		const form = document.forms.d1_form;
		form.dataset.selected = 'none';
		form.elements.name.value = '';
		form.elements.type.value = '';
	}
	#queryResult(value,data) {
		switch (value) {
			case 'database':
				const schema = data[0];
				this.#listDatabase(schema);
		}

		const fragment = document.createDocumentFragment();
		const meta = methods.makeTable([data.meta]);
		fragment.append(meta);

		if (data.results.length > 0) {
			const results = methods.makeTable(data.results);
			fragment.append(results);
		} else {
			const text = document.createTextNode('(Empty result)');
			fragment.append(text);
		}

		Index.update(Index.elements.editor.results,fragment);
	}
	#appendQueryField(value,data) {
		const form = document.forms.d1_form;
		switch (value) {
			case 'select_from':
			case 'delete_from':
			case 'drop_table':
				data = data.replaceAll('?table_name',form.elements.name.value);
				break;
			case 'insert_into':
			/*case 'row':
				const quote = value => {
					if (typeof value === 'string') {
						value = value.replace(/'/g,'\'\'');
						return '\''+value +'\'';
					}
					return value;
				};
				const columns = JSON.parse(form.elements.name.value);
				const keys = Object.keys(columns).join(', ');
				const values = Object.values(columns).map(quote).join(', ');
				detail.data = detail.data.replaceAll('?table_columns',keys);
				detail.data = detail.data.replaceAll('?column_values',values);*/
		}
		const element = Index.elements.editor.query;
		const comment = value.replace('_',' ');
		element.value = [element.value,'','-- '+comment+' --','',data].join('\n');
	}
	#importFile() {
		const form = document.forms.d1_form;
		const options = {once: true};
		const change = event => {
			const formData = new FormData(form);
			const file = formData.get('import');
			const reader = new FileReader();
			reader.onload = () => {
				this.#appendQueryField('imported query',reader.result);
				Output.log('accept','Imported file');
				Output.log('normal',file.name);
				Output.log('line');
			};
			reader.onerror = () => {
				Output.log('reject','Error reading the file');
				Output.log('line');
			};
			reader.readAsText(file);
		};
		const cancel = event => {
			event.target.removeEventListener('change',change,options);
			event.target.removeEventListener('cancel',cancel,options);
		};
		form.elements.import.addEventListener('change',change,options);
		form.elements.import.addEventListener('cancel',cancel,options);
		form.elements.import.click();
	}
}

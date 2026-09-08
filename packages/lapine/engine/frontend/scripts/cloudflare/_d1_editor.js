
import { Index,Settings,IO,Output,LapineMessage,D1Migration } from '../frontend.js';

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
					signal = () => {
						const event = event => this.#select('database',this.#data.database_name,event.target);
						document.body.dataset.editor = true;
						Index.elements.editor.binding.addEventListener('click',event,false);
						Index.elements.editor.database_name.textContent = this.#data.database_name;
						Index.elements.editor.database_uuid.textContent = this.#data.database_id;
						Index.elements.editor.database_preview.textContent = this.#data.preview_database_id;
						Index.elements.editor.binding_name.textContent = this.#data.binding;
						Index.elements.editor.binding_environment.textContent = this.#data.binding_environment;
						IO.sendSignal(false,'d1','load','schema');
					};
					Index.openLink('/markup/cloudflare/d1/d1_editor.html','editor',signal);
					break;
				case 'close editor':
					signal = () => document.body.dataset.editor = false;
					IO.sendSignal(false,'cloudflare','stop','editor',this.#data,signal);
					break;
				case 'database list':
					this.#listDatabase(event.detail.data);
					break;
				case 'migration list':
					this.#listMigrations(event.detail);
					break;
				case 'ui size':
					Index.elements.editor.center.dataset.size = {
						same: 'results',
						results: 'query',
						query: 'same'
					}[Index.elements.editor.center.dataset.size];
					break;
				case 'ui reload':
					IO.sendSignal(false,'d1','load','schema');
					break;
				case 'ui execute':
					signal = object => this.#queryResult(object.value,object.data);
					IO.sendSignal(false,'d1','execute','query',event.detail.data.query,signal);
					break;
				case 'ui select':
					const {type,name,element} = event.detail.data;
					this.#select(type,name,element);
					break;
				case 'ui deselect':
					this.#deselect();
					break;
				case 'template '+event.detail.value:
					signal = object => this.#appendQueryField(object.value,object.data);
					IO.sendSignal(false,'d1','load','template',event.detail.value,signal);
					break;
				case 'file import':
					this.#importFile();
					break;
				case 'migration remove':
					signal = () => IO.sendSignal(false,'d1','remove','migration',event.detail.data.name);
					message = new LapineMessage('danger','Are you sure?','This can not be undone.');
					message.addButton('accept','Remove',signal);
					message.addButton('reject','Cancel',null);
					message.display(false);
					break;
				case 'migration removed':
					this.#migrations[event.detail.data].remove();
					delete this.#migrations[event.detail.data];
					this.#deselect();
					break;
				case 'migration apply':
					signal = target => IO.sendSignal(false,'d1','apply','migrations',target);
					message = new LapineMessage('inform','Select target','Which database should the migrations be applied to?');
					message.addButton('accept','Local',signal,'local');
					message.addButton('accept','Preview',signal,'preview');
					message.addButton('accept','Remote',signal,'remote');
					message.addButton('reject','Cancel',null);
					message.display(false);
					break;
				default:
					console.log(event.detail.name+' '+event.detail.value, event.detail.data);
			}
		} catch (error) {
			console.log(event.detail);
			console.log(error);
		}
	}
	#listDatabase(data) {

		console.log(data);

		if (data.results.length == 0) {

			document.forms.d1_form.dataset.empty = true;
			Index.elements.editor.database.dataset.state = 'This database is empty.';
			Index.elements.editor.migrations.dataset.state = 'No migrations available.';

		} else {

			document.forms.d1_form.dataset.empty = false;
			delete Index.elements.editor.database.dataset.state;

			IO.sendSignal(false,'d1','list','migrations');

			this.#tables = [];

			let type = '';
			const fragment = document.createDocumentFragment();
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

			Index.update(Index.elements.editor.database,fragment);

		}

	}
	#listMigrations(detail) {
		console.log(detail);

		if (detail.data.files.length == 0) {
			Index.elements.editor.migrations.dataset.state = 'No migrations available.';
		} else {

			delete Index.elements.editor.migrations.dataset.state;

			const fragment = document.createDocumentFragment();
			const addMigration = name => {
				const element = new D1Migration(name);
				fragment.append(element);
				this.#migrations[name] = element;
			}
			const tagMigration = (name,location) => {
				console.log(name,location);
				this.#migrations[name].markApplied(location);
			};
			const tagAll = (detail,location) => {
				/*const data = detail.data[location];
				if (typeof data == 'string') {
					IO.log('danger','Migration list unavailable: '+location);
					IO.log('normal',data);
					IO.log('line');
				} else {
					const method = name => tagMigration(name,location);
					detail.data.files.map(method);
				}*/

				const data = detail.data[location];
				if (data.length > 0) {
					const method = entry => tagMigration(entry.name,location);
					data[0].results.map(method);
				}
			}
			if (detail.value == 'added') {
				addMigration(detail.data);
				Index.elements.editor.migrations.append(fragment);
				tagMigration(detail.data,'local');
			} else {
				detail.data.files.map(addMigration);
				Index.update(Index.elements.editor.migrations,fragment);
				tagAll(detail,'local');
				tagAll(detail,'remote');
				tagAll(detail,'preview');
			}
		}
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
	#makeTable(data) {

		const table = document.createElement('table');
		const thead = document.createElement('thead');
		const tbody = document.createElement('tbody');
		const headerRow = document.createElement('tr');
		const keys = Object.keys(data[0]);

		for (const key of keys) {
			const th = document.createElement('th');
			th.textContent = key;
			headerRow.append(th);
		}
		thead.append(headerRow);

		for (const row of data) {
			const tr = document.createElement('tr');
			const method = event => {
				const object = {
					type: 'row',
					name: JSON.stringify(row,null,'\t'),
					element: tr
				};
				IO.sendSignal(true,'d1_editor','ui','select',object);
			};
			tr.addEventListener('click',method,false);
			for (const key of keys) {
				const td = document.createElement('td');
				td.textContent = row[key];
				tr.append(td);
			}
			tbody.append(tr);
		}

		table.append(thead,tbody);

		return table;

	}
	#queryResult(value,data) {
		switch (value) {
			case 'database':
				const schema = data[0];
				this.#listDatabase(schema);
		}

		const fragment = document.createDocumentFragment();
		const meta = this.#makeTable([data.meta]);
		fragment.append(meta);

		if (data.results.length > 0) {
			const results = this.#makeTable(data.results);
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

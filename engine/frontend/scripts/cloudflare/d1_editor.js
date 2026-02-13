
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
					signal = () => {
						document.body.dataset.editor = true;
						IO.sendSignal(false,'d1','editor','setup');
					}
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
				/*case 'migration list':

					break;*/
				case 'template '+event.detail.value:
					signal = object => this.#appendQueryField(object.value,object.data);
					IO.sendSignal(false,'d1','load','template',event.detail.value,signal);
					break;
				case 'io import':
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
	#listDatabase(schema) {

		const fragment = document.createDocumentFragment();

		if (Object.keys(schema.tables).length === 0) {

			const div = document.createElement('div');
			const small = document.createElement('small');
			small.textContent = 'This database is empty.';
			div.className = 'empty';
			div.append(small);
			fragment.append(div);

			document.forms.d1_form.dataset.empty = true;

		} else {

			console.log(schema);

		}

		Index.update(Index.elements.editor.database,fragment);

		/*this.#tables = [];

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
console.log(data);
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

		Index.update(Index.elements.editor.database,dl);*/




		/*const container = Index.elements.editor.database; // Your target container
    container.innerHTML = ''; // Clear "Loading..."

    const list = document.createElement('ul');
    list.className = 'schema-list';

    // schema is { tableName: [columns...] }
    for (const [tableName, columns] of Object.entries(schema)) {

        // 1. Table Item
        const tableItem = document.createElement('li');
        const title = document.createElement('div');
        title.className = 'table-name';
        title.textContent = tableName;

        // Click to SELECT * FROM table
        title.onclick = () => {
            IO.sendSignal(false, 'd1', 'editor', 'query', { query: `SELECT * FROM ${tableName} LIMIT 100` });
        };

        tableItem.append(title);

        // 2. Columns List (Nested)
        const colList = document.createElement('ul');
        colList.className = 'column-list';

        for (const col of columns) {
            const colItem = document.createElement('li');
            colItem.textContent = `${col.name} (${col.type})`;
            // Optional: Click to add column name to query editor
            colList.append(colItem);
        }

        tableItem.append(colList);
		list.append(tableItem);
    }

	container.append(list);*/

	}
	#appendQueryField(value,data) {
		/*const form = document.forms.d1_form;
		switch (value) {
			case 'table':
				data = data.replaceAll('?table_name',form.elements.name.value);
				break;
			case 'row':
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
				detail.data = detail.data.replaceAll('?column_values',values);
		}*/
		const element = Index.elements.editor.query;
		const comment = value.replace('_',' ');
		element.value = [element.value,'','-- '+comment+' --','',data].join('\n');
	}
	#importFile() {
		const form = document.forms.d1_form;
		const event = new MouseEvent('click');
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
		form.elements.import.dispatchEvent(event);
	}
}

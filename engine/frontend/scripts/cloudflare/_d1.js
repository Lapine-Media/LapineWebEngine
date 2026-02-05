
import { Settings,Index,IO,Overlay,Tools,D1Item,D1Migration,Bindings } from '../frontend.js';

const methods = {
	selected: null,
	migrations: {},
	tables: [],
	editor: {},
	listD1Databases: function(data) {
		const fragment = document.createDocumentFragment();
		const bindings = Object.values(Settings.bindings);
		for (const item of data) {
			item.type = 'd1_databases';
			item.binding = bindings.find(values => values[values.item] == item.name);
			const element = new D1Item(item);
			fragment.append(element);
		}
		Index.update(Index.elements.subpage.d1_items,fragment);
	},
	response: function(detail) {
		const form = document.forms.d1_form;
		switch (form.elements.type.value) {
			case 'table':
				detail.data = detail.data.replaceAll('?table_name',form.elements.name.value);
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
		}
		Index.elements.editor.query.value = detail.data;
	},
	listDatabase: function(data) {

		methods.tables = [];

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
				IO.signal('d1','ui','select',object);
			};
			const element = document.createElement('dd');
			element.addEventListener('click',method,false);
			element.classList.add(type);
			element.textContent = name;
			dl.append(element);
		}
		const location = methods.editor.remote ? 'Remote' : 'Local';
		const name = methods.editor.binding+' ('+location+')';

		makeDT(name);
		makeDD('database',methods.editor.database_name);

		for (const item of data.results) {
			if (item.type != type) {
				makeDT(item.type+'s');
				type = item.type;
			}
			if (item.type == 'table') {
				methods.tables.push(item.name);
			}
			makeDD(item.type,item.name);
		}

		Index.update(Index.elements.editor.database,dl);

	},
	makeTable: function(data) {

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
				IO.signal('d1','ui','select',object);
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

	},
	result: function(detail) {

		switch (detail.value) {
			case 'database':
				const first = detail.data[0];
				return methods.listDatabase(first);
		}

		const fragment = document.createDocumentFragment();
		const meta = methods.makeTable([detail.data.meta]);
		fragment.append(meta);

		if (detail.data.results.length > 0) {
			const results = methods.makeTable(detail.data.results);
			fragment.append(results);
		} else {
			const text = document.createTextNode('(Empty result)');
			fragment.append(text);
		}

		Index.update(Index.elements.editor.results,fragment);

	},
	updateMigrations: function(detail) {
		console.log(detail);
		const fragment = document.createDocumentFragment();
		const methods = {
			add: name => {
				const element = new D1Migration(name);
				fragment.append(element);
				this.migrations[name] = element;
			},
			tag: (name,location) => methods.migrations[name].markApplied(location),
			tagAll: function(detail,location) {
				const data = detail.data[location];
				if (typeof data == 'string') {
					IO.log('danger','Migration list unavailable: '+location);
					IO.log('normal',data);
					IO.log('line');
				} else {
					const method = name => methods.tag(name,location);
					data.map(method);
				}
			}
		}
		if (detail.value == 'added') {
			methods.add(detail.data);
			Index.elements.editor.migrations.append(fragment);
			methods.tag(detail.data,'local');
		} else {
			detail.data.files.map(methods.add);
			Index.update(Index.elements.editor.migrations,fragment);
			methods.tagAll(detail,'local');
			methods.tagAll(detail,'remote');
			methods.tagAll(detail,'preview');
		}
	}
}

export const D1 = new class {
	constructor() {
		window.addEventListener('d1',this,false);
	}
	async handleEvent(event) {
		try {
			switch (event.detail.name+' '+event.detail.value) {
				case 'menu visible':
					if (Settings.d1list) {
						methods.listD1Databases(Settings.d1list);
					} else {
						IO.sendSignal(false,'d1','database','list',null);
					}
					break;
				case 'list loaded':
					Settings.d1list = event.detail.data;
					methods.listD1Databases(event.detail.data);
					break;
				case 'database create options':
					Overlay.open('Create D1 database','/markup/cloudflare/d1_create.html');
					break;
				case 'database create confirm': {
					const exist = Settings.d1list.find(item => item.name == event.detail.data.name);
					if (exist) {
						const message = IO.getMessage('reject','Database already exist','The database needs another name.');
						message.display();
					} else {
						IO.send('d1','database','create',event.detail.data);
						Overlay.close();
					}
				} break;
				case 'database created': {
					const message = IO.getMessage('accept','Database created','Create a binding in order to open the database in the D1 editor.');
					message.display(true);
					IO.send('d1','database','list',null);
				} break;
				case 'database remove options':
					Overlay.open('Create D1 database','/markup/cloudflare/d1_remove.html');
					break;
				case 'database remove confirm': {
					const database = Settings.d1list.find(item => item.name == event.detail.data.name);
					if (!database) {
						const message = IO.getMessage('reject','Error','Database "'+event.detail.data.name+'" does not exist.');
						message.display();
					} else {
						IO.send('d1','database','remove',database);
						Overlay.close();
					}
				} break;
				case 'database removed': {
					Bindings.remove('d1_databases',event.detail.data);
					const message = IO.getMessage('accept','Database removed','Any bindings have also been removed.');
					message.display(true);
					IO.send('d1','database','list',null);
				} break;
				case 'editor start options':
					Overlay.data = event.detail.data;
					Overlay.open('Start D1 editor','/markup/cloudflare/d1_start.html');
					break;
				case 'editor start confirm': {
					const data = {
						...Overlay.data,
						target: event.detail.data.target,
						context: 'd1'
					};
					Overlay.close();
					IO.send('cloudflare','editor','start',data);
				} break;
				case 'editor started':
					methods.editor = event.detail.data;
					await Index.openLink('/markup/cloudflare/d1_editor.html','editor');
					IO.send('d1','editor','list',null);
					document.body.dataset.editor = true;
					break;
				case 'editor stop':
					IO.send('cloudflare','editor','stop',null);
					break;
				case 'editor stopped':
					document.body.dataset.editor = false;
					break;
				case 'ui execute':
					IO.send('d1','editor','query',event.detail.data.query);
					break;
				case 'ui size':
					Index.elements.editor.center.dataset.size = {
						same: 'results',
						results: 'query',
						query: 'same'
					}[Index.elements.editor.center.dataset.size];
					break;
				case 'ui reload':
					IO.send('d1','database','list',null);
					break;
				case 'ui select': {
					if (methods.selected != null) {
						methods.selected.classList.remove('selected');
					}
					event.detail.data.element.classList.add('selected');
					methods.selected = event.detail.data.element;
					Index.elements.editor.selected.textContent = event.detail.data.type;
					const form = document.forms.d1_form;
					form.dataset.selected = event.detail.data.type;
					form.elements.name.value = event.detail.data.name;
					form.elements.type.value = event.detail.data.type;
				} break;
				case 'ui deselect': {
					methods.selected.classList.remove('selected');
					methods.selected == null;
					Index.elements.editor.selected.textContent = 'Selected';
					const form = document.forms.d1_form;
					form.dataset.selected = 'none';
					form.elements.name.value = '';
					form.elements.type.value = '';
				} break;
				case 'io import': {
					const form = document.forms.d1_form;
					const event = new MouseEvent('click');
					const options = {once: true};
					const change = event => {
						const formData = new FormData(event.target.form);
						const file = formData.get('import');
						const reader = new FileReader();
						reader.onload = () => {
							form.elements.query.value = reader.result;
							IO.log('accept','Imported file');
							IO.log('normal',file.name);
							IO.log('line');
						};
						reader.onerror = () => {
							IO.log('reject','Error reading the file');
							IO.log('line');
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
				} break;
				case 'io export options': {
					const signal = IO.getSignal('d1','io','tables',null);
					Index.openOverlay('Export database','/markup/cloudflare/d1_export.html',signal,'Cancel');
				} break;
				case 'io tables':
					const fragment = document.createDocumentFragment();
					for (const name of methods.tables) {
						const option = document.createElement('option');
						option.name = name;
						option.textContent = name;
						fragment.append(option);
					}
					Index.elements.overlay.tables.append(fragment);
					break;
				case 'io export': {
					Index.closeOverlay(null);
					IO.send('d1','editor','export',event.detail.data);
				} break;
				case 'io exported': {
					const message = IO.getMessage('accept','Success!','The export has completed.');
					const signal = IO.getSignal('d1','io','download',event.detail.data);
					message.addButton('accept','Download file',signal);
					message.display();
				} break;
				case 'io download': {
					const link = document.createElement('a');
					const event = new MouseEvent('click');
					link.href = event.detail.data.href;
					link.download = event.detail.data.name;
					link.dispatchEvent(event);
				} break;
				case 'migration added':
				case 'migration list':
					methods.updateMigrations(event.detail);
					break;
				case 'migration remove options': {
					const signal = IO.getSignal('d1','migration','remove',event.detail.data);
					const message = IO.getMessage('danger','Are you sure?','This can not be undone.');
					message.addButton('accept','Yes',signal);
					message.addButton('accept','Cancel',null);
					message.display();
				} break;
				case 'migration load':
				case 'migration remove': {
					const name = document.forms.d1_form.elements.name.value;
					IO.send('d1','migrations',event.detail.value,name);
				} break;
				case 'migration removed':
					methods.migrations[event.detail.data].remove();
					delete methods.migrations[event.detail.data];
					IO.signal('d1','ui','deselect',null);
					break;
				case 'migration apply options':
					Overlay.open('Apply migrations','/markup/cloudflare/d1_migrations.html',null,'Cancel');
					break;
				case 'migration apply':
					Overlay.close(null);
					IO.send('d1','migrations','apply',event.detail.data.target);
					break;
				case 'result database':
					methods.listDatabase(event.detail.data);
					break;
				case 'result query':
					methods.result(event.detail);
					break;
				case 'result help':
					methods.response(event.detail);
					break;
				default:
					if (event.detail.name == 'help') {
						IO.send('d1','editor','help',event.detail.value);
					} else {
						console.log('???',event.detail);
					}
			}
		} catch (error) {
			console.log(event.detail);
			console.log(error);
		}
	}
}

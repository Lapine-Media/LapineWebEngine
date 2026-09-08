
import { Site,Settings,IO,Output,Overlay,LapineMessage } from '../frontend.js';

export const D1Editor = new class {
	#data;
	#loaded = {};
	#fkeys = {};
	#totalRows = {};
	#limit = 100;
	#history = [];
	constructor() {
		window.addEventListener('d1_editor',this,false);
	}
	async handleEvent(event) {
		switch (event.type) {
			case 'd1_editor':
				const {name,value,data,id,button} = event.detail;
				this.action(name,value,data,id,button);
				break;
			case 'change':
				this.action('menu','page',event.target.value);
				break;
		}
	}
	async action(name,value,data,id,button) {
		try {
			let signal,message,submitter;
			switch (name+' '+value) {
				case 'editor started':
					signal = () => Output.log('inform','Migration table is active.');
					IO.sendSignal(false,'d1','create','migration_table',false,signal);
				case 'editor reloaded':
					this.#data = data;
					Site.elements.editor.database_name.textContent = this.#data.database_name;
					Site.elements.editor.binding_name.textContent = this.#data.binding;
					Site.elements.editor.binding_environment.textContent = this.#data.binding_environment;
					Site.elements.editor.database_uuid.textContent = this.#data.database_id;
					Site.elements.editor.database_preview.textContent = this.#data.preview_database_id;
					Site.elements.editor.pages.addEventListener('change',this,false);
					IO.sendSignal(false,'d1','load','database');
					break;
				case 'menu reload':
					IO.sendSignal(false,'d1','load','database');
					break;
				case 'close editor':
					IO.sendSignal(false,'cloudflare','stop','editor',this.#data);
					break;
				case 'database loaded':
					this.#fkeys = data.fkeys;
					this.#totalRows = {};
					this.listDatabase(data.tables);
					break;
				case 'row loaded':
				case 'table loaded':
					this.#loaded = data;
					this.listTable(data.entries,data.details,name == 'row');
					Site.elements.editor.selected.value = data.sql.results[0].sql;
					Site.elements.editor.entries.dataset.count = data.entries.results.length;
					Site.elements.editor.indices.dataset.count = data.indices.results.length;
					Site.elements.editor.triggers.dataset.count = data.triggers.results.length;
					break;
				case 'index loaded':
				case 'trigger loaded':
					Site.elements.editor.selected.value = data.results[0].sql;
					break;
				case 'menu columns':
					Site.elements.editor.d1_editor.dataset.columns = {
						same: 'query',
						query: 'inspector',
						inspector: 'same'
					}[Site.elements.editor.d1_editor.dataset.columns];
					break;
				case 'menu rows':
					Site.elements.editor.d1_editor.dataset.rows = {
						same: 'results',
						results: 'editor',
						editor: 'same'
					}[Site.elements.editor.d1_editor.dataset.rows];
					break;
				case 'execute query':
					this.sendQuery(data.query);
					break;
				case 'query executed':
					if (data.error) {
						message = new LapineMessage('reject','Oh noes!',data.error);
						//D1_ERROR: near "blergh": syntax error at offset 0: SQLITE_ERROR
						//D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_FOREIGNKEY)
						message.display(false);
					} else {
						this.#loaded = data;
						const count = data.entries.results.length;
						this.listTable(data.entries,data.details,count == 1);
						this.saveQuery(data.query);
					}
					break;
				case 'menu entries':
				case 'menu indices':
				case 'menu triggers':
					this.showDetails(value);
					break;
				case 'menu page':
					this.#loaded.details.offset = parseInt(data,10);
					IO.sendSignal(false,'d1','load','table',this.#loaded.details);
					break;
				case 'menu migrations':
					button.disabled = true;
					signal = response => {
						const open = () => {
							this.listMigrations(response.data);
							button.disabled = false;
						}
						Overlay.open('Migration status','/markup/cloudflare/d1/migrations.html',open);
					}
					IO.sendSignal(false,'d1','list','migrations',null,signal);
					break;
				case 'menu migrate':
					const option = data.get('option');
					message = new LapineMessage('danger','Are you sure?','If applying a migration results in an error, this migration will be rolled back, and the previous successful migration will remain applied.');
					signal = proceed => {
						Overlay.close();
						if (proceed) {
							IO.sendSignal(false,'d1','apply','migration',option);
						}
					};
					message.addButton('accept','Proceed',signal,true);
					message.addButton('reject','Cancel',signal,false);
					message.display(false);
					break;
				case 'migration applied':
					message = new LapineMessage('success','Migration complete!','Blergh blargh');
					message.display(true);
					break;
				case 'menu import':
					Overlay.open('Export database','/markup/cloudflare/d1/import.html');
					break;
				case 'menu export':
					Overlay.open('Export database','/markup/cloudflare/d1/export.html');
					break;
				default:
					console.log(name+' '+value,data);
			}
		} catch (error) {
			console.log(error);
		}
	}
	listMigrations(data) {
		try {
			const {local,preview,remote} = data;
			const combined = [...local,...preview,...remote];
			const set = new Set(combined);
			const list = [...set].sort();
			const fragment = document.createDocumentFragment();
			const td = (array,name) => {
				const status = array.includes(name) ? 'active' : 'missing';
				const element = document.createElement('td');
				element.textContent = status;
				element.classList.add(status);
				return element;
			}

			for (let i = 0; i < list.length; i += 1) {
				const name = list[i];
				const row = document.createElement('tr');
				const n = document.createElement('td');
				const l = td(local,name);
				const p = td(preview,name);
				const r = td(remote,name);
				n.textContent = name;
				row.append(n,l,p,r);
				fragment.append(row);
			}

			Site.clearElement(Site.elements.overlay.list,fragment);

		} catch (error) {
			console.log(error);
		}
	}
	sendQuery(query) {

		query = query
			.replace(/\/\*[\s\S]*?\*\//g, '') 	// Remove block comments
			.replace(/--.*$/gm, '')				// Remove line comments
			.replace(/^\s*[\r\n]/gm, '')		// Remove empty lines
			.trim();							// Trim leading/trailing whitespace

		let message;
		const proceed = () => {
			const data = {query};
			IO.sendSignal(false,'d1','execute','query',data);
		}
		switch (true) {
			case query.length == 0:
				break;
			case query.length > 100000:
				const difference = query.length-100000;
				const percent = Math.round(100*(query.length/100000));
				message = new LapineMessage('reject','Maximum query length exceeded','Queries need to be 100,000 bytes or less. Your query is '+difference+' bytes too long ('+percent+'%).');
				message.display(false);
				break;
			case new RegExp('\\b(DROP|DELETE|TRUNCATE|ALTER)\\b','i').test(query):
				message = new LapineMessage('danger','Are you sure?','This will remove or change things in the database.');
				message.addButton('accept','Proceed',proceed);
				message.addButton('reject','Cancel',null);
				message.display(false);
				break;
			default:
				proceed();
		}
	}
	saveQuery(query) {
		const max = 60;
		const trimmed = query.replace(/\s+/g,' ').trim();
		const element = document.createElement('option');
		element.textContent = trimmed.length > max ? trimmed.slice(0, max) + '…' : trimmed;
		element.value = Site.elements.editor.history.childNodes.length;
		Site.elements.editor.history.append(element);
		this.#history.push(query);
	}
	loadQuery() {
		const index = parseInt(Site.elements.editor.history.value,10);
		const query = this.#history[index];
		console.log(query);
	}
	tableLink(table) {
		const element = document.createElement('span');
		const action = () => {
			const data = {
				table: table,
				limit: this.#limit,
				offset: 0
			};
			IO.sendSignal(false,'d1','load','table',data);
		};
		element.textContent = table;
		element.classList.add('title');
		element.addEventListener('click',action,false);
		return element;
	}
	listDatabase(tables) {
		const dl = document.createElement('dl');
		const dt = title => {
			const element = document.createElement('dt');
			element.textContent = title;
			dl.append(element);
		}
		const contexts = {
			table: {
				count: 0,
				fragment: document.createDocumentFragment()
			},
			view: {
				count: 0,
				fragment: document.createDocumentFragment()
			}
		}
		const getIcon = (key,value) => {
			const element = document.createElement('span');
			element.textContent = value;
			element.classList.add('icon',key);
			return element;
		}
		for (const entry of tables) {
			const element = document.createElement('dd');
			const title = this.tableLink(entry.name);
			const count = getIcon('rows',entry.rows);
			element.append(title,count);
			if (entry.type == 'table') {
				if (entry.indicies > 0) {
					const indicies = getIcon('indicies',entry.indicies);
					element.append(indicies);
				}
				if (entry.triggers > 0) {
					const triggers = getIcon('triggers',entry.triggers);
					element.append(triggers);
				}
			}
			contexts[entry.type].fragment.append(element);
			contexts[entry.type].count += 1;
			this.#totalRows[entry.name] = entry.rows;
		}
		dt('Tables ('+contexts.table.count+')');
		dl.append(contexts.table.fragment);
		dt('Views ('+contexts.view.count+')');
		dl.append(contexts.view.fragment);
		Site.clearElement(Site.elements.editor.database,dl);
	}
	listTable(entries,details,isRow) {

		if (entries.results.length > 0) {
			const method = isRow ? this.makeRow : this.makeTable;
			const table = method.call(this,entries,details.table);
			Site.clearElement(Site.elements.editor.table,table);
		} else {
			Site.elements.editor.table.textContent = '(Empty table)';
		}

		if (isRow) {
			Site.elements.editor.from.textContent = 1;
			Site.elements.editor.to.textContent = 1;
			Site.elements.editor.total.textContent = this.#totalRows[details.table] || 1;
			Site.clearElement(Site.elements.editor.pages);
		} else {
			const total = this.#totalRows[details.table] ?? details.limit;
			const pages = Math.ceil(total/details.limit);
			const page = Math.floor(pages*details.offset/total) || 0;
			const fragment = document.createDocumentFragment();

			for (let i = 0; i < pages; i += 1) {
				const element = document.createElement('option');
				element.value = i*details.limit;
				element.textContent = 'Page '+(i+1);
				fragment.append(element);
			}

			Site.clearElement(Site.elements.editor.pages,fragment);

			Site.elements.editor.from.textContent = entries.results.length ? details.offset+1 : 0;
			Site.elements.editor.to.textContent = details.offset+entries.results.length;
			Site.elements.editor.total.textContent = total;
			Site.elements.editor.pages.value = page*details.limit;

		}
	}
	showDetails(context) {
		const details = {offset: 0};
		switch (context) {
			case 'entries':
				if (this.#loaded.entries) {
					this.listTable(this.#loaded.entries,this.#loaded.details);
				}
				break;
			case 'indices':
				if (this.#loaded.indices) {
					details.table = 'Indices';
					details.limit = this.#loaded.indices.results.length;
					this.listTable(this.#loaded.indices,details);
				}
				break;
			case 'triggers':
				if (this.#loaded.triggers) {
					details.table = 'Triggers';
					details.limit = this.#loaded.triggers.results.length;
					this.listTable(this.#loaded.triggers,details);
				}
				break;
		}
		if (this.#loaded.sql) {
			Site.elements.editor.selected.value = this.#loaded.sql.results[0].sql;
		}
	}
	/* DISPLAY TABLE /////////////////////////////////////////////////////// */
	setValue(isRow,column,value,td) {
		const maxLenght = 40;
		switch (typeof value) {
			case 'string':
				if (value.length > maxLenght && !isRow) {
					value = value.slice(0,maxLenght) + '…';
				}
				break;
			case 'number':
				td.classList.add('number');
				break;
			case 'object':
				value = value === null ? 'NULL' : '[object]';
				break;
		}
		const fkey = this.#fkeys[column];
		if (fkey && fkey[0] != column && value != 'NULL') {
			const redirect = event => {
				event.stopPropagation();
				const data = {
					table: fkey[0],
					column: fkey[1],
					value: value,
					limit: 1,
					offset: 0
				};
				IO.sendSignal(false,'d1','load','row',data);
			}
			td.addEventListener('click',redirect,false);
			td.classList.add('fkey');
			td.title = fkey.join('.');
		}
		td.textContent = value;
	}
	makeRow(entries,name) {

		const table = document.createElement('table');
		const caption = document.createElement('caption');
		const tbody = document.createElement('tbody');
		const text = document.createTextNode('Entry in ');
		const span = this.tableLink(name);
		const rows = Object.entries(entries.results[0]);

		for (const [column,value] of rows) {
			const tr = document.createElement('tr');
			const th = document.createElement('th');
			const td = document.createElement('td');
			th.textContent = column;
			this.setValue(true,column,value,td);
			tr.append(th,td);
			tbody.append(tr);
		}

		caption.append(text,span);
		table.append(caption,tbody);
		table.classList.add('row');

		return table;

	}
	makeTable(entries,name) {

		const table = document.createElement('table');
		const caption = document.createElement('caption');
		const thead = document.createElement('thead');
		const tbody = document.createElement('tbody');
		const header = document.createElement('tr');
		const columns = Object.keys(entries.results[0]);
		let activeColumn = null;
		let ascending = true;

		const sort = column => {
			const arrange = (a, b) => {
		        const valA = a[column];
		        const valB = b[column];
				if (valA === null || valA === undefined) return 1;
		        if (valB === null || valB === undefined) return -1;
		        const result = typeof valA === 'string' ? valA.localeCompare(valB) : valA - valB;
		        return ascending ? result : -result;
		    }
			ascending = column == activeColumn ? !ascending : true;
			activeColumn = column;
			entries.results.sort(arrange);
		};

		const build = () => {
			while (tbody.lastChild) {
				tbody.removeChild(tbody.lastChild);
			}
			for (const row of entries.results) {
				const open = () => {
					if (name == 'Indices') {
						IO.sendSignal(false,'d1','load','index',row);
					} else if (name == 'Triggers') {
						IO.sendSignal(false,'d1','load','trigger',row);
					} else {
						Site.elements.editor.selected.value = JSON.stringify(row,null,'\t');
					}
				}
				const tr = document.createElement('tr');
				tr.addEventListener('click',open,false);
				for (const column of columns) {
					const td = document.createElement('td');
					this.setValue(false,column,row[column],td);
					tr.append(td);
				}
				tbody.append(tr);
			}
		}

		caption.textContent = name;

		for (const column of columns) {
			const th = document.createElement('th');
			const update = () => {
				sort(column);
				build();
			}
			th.textContent = column;
			th.addEventListener('click',update,false);
			header.append(th);
		}

		thead.append(header);
		table.append(caption,thead,tbody);
		table.classList.add('table');

		build();

		return table;

	}
}

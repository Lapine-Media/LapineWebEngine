
import { Site,IO,Overlay,LapineMessage,Project,D1Item } from '../frontend.js';

export const D1Databases = new class {
	#loaded = false;
	#list = Promise.withResolvers();
	constructor() {
		window.addEventListener('d1_databases',this,false);
	}
	async handleEvent(event) {
		try {
			let signal,message;
			const {name,value,data} = event.detail;
			switch (name+' '+value) {
				case 'page visible':
					break;
				case 'inspect database':
					this.inspectDatabase(data.data);
					break;
				/*
				case 'list loaded':
					this.#cached = event.detail.data;
					if (Index.elements.subpage.d1_items) {
						this.#listD1Databases(event.detail.data);
					}
					break;
				case 'info database':
					signal = response => event.detail.data.info = response.data;
					IO.sendSignal(false,'d1','database','info',event.detail.data.data,signal);
					break;
				case 'reload cache':
					if (this.#waiting == false) {
						IO.sendSignal(false,'d1','list','databases');
					} else {
						message = new LapineMessage('inform','Please wait','A new database is being created. The list will update shortly.');
						message.display(false);
					}
					break;
				case 'create database':
					if (this.#waiting == false) {
						Overlay.open('Create new D1 database','/markup/cloudflare/d1/create_database.html');
					} else {
						message = new LapineMessage('inform','Please wait','A new database is already being created. Please wait a moment before creating one more.');
						message.display(false);
					}
					break;
				case 'confirm create':
					this.#waiting = true;
					Overlay.close();
					IO.sendSignal(false,'d1','create','database',event.detail.data);
					message = new LapineMessage('inform','Please wait','This may take a moment.');
					message.display(false);
					break;
				case 'database created':
					this.#waiting = false;
					message = new LapineMessage('accept','Database created!','Your wrangler file has been updated.');
					message.display(true);
					IO.sendSignal(false,'d1','list','databases');
					break;
				case 'remove database':
					const signal2 = () => {
						event.detail.data.remove();
						IO.sendSignal(false,'d1','remove','database',event.detail.data.data);
					}
					const signal1 = () => {
						message = new LapineMessage('danger','Really?','This is the last warning. Please be careful.');
						message.addButton('accept','Remove this database',signal2);
						message.addButton('reject','Cancel',null);
						message.display(false);
					}
					message = new LapineMessage('danger','Are you sure?','This will remove the database and can not be undone.');
					message.addButton('accept','Yes, I\'m sure',signal1);
					message.addButton('reject','Cancel',null);
					message.display(false);
					break;
				case 'database removed':
					message = new LapineMessage('accept','Database removed!','Your wrangler file has been updated.');
					message.display(true);
					if (event.detail.data) {
						message = new LapineMessage('inform','Bindings removed','All associated bindings have also been removed. Make sure to update your code.');
						message.display(false);
					}
					break;*/
				default:
					console.log('???',event.detail);
			}
		} catch (error) {
			console.log(event.detail);
			console.log(error);
		}
	}
	getList(force = false) {
		if (this.#loaded == false || force) {
			this.#loaded = true;
			const order = (a,b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
			const signal = response => {
				response.data.sort(order);
				this.#list.resolve(response.data);
			};
			IO.sendSignal(false,'d1','list','databases',null,signal);
		}
		return this.#list.promise;
	}
	async viewList() {
		const list = await this.getList();
		const bindings = this.getBindings();
		const fragment = document.createDocumentFragment();
		for (const item of list) {
			const bound = bindings.includes(item.name);
			const element = new D1Item(item,bound);
			fragment.append(element);
		}
		Site.clearElement(Site.elements.subpage.d1_items,fragment);
	}
	getBindings() {
		const list = [];
		const environments = Project.getEnvironments();
		const add = environment => {
			const scope = environments.scope(environment);
			if (scope && scope.d1_databases) {
				for (const item of scope.d1_databases) {
					list.push(item.database_id,item.preview_database_id);
				}
			}
		}
		environments.list.forEach(add);
		return list;
	}
	inspectDatabase(data) {
		const fill = response => {
			const entries = [
				...Object.entries(data),
				...Object.entries(response.data)
			];
			for (const [key,value] of entries) {
				const element = Site.elements.overlay[key];
				if (element !== undefined) {
					if (key == 'read_replication') {
						element.textContent = value.mode;
					} else {
						element.textContent = value ?? '-';
					}
				}
			}
		}
		const signal = () => IO.sendSignal(false,'d1','database','info',data,fill);
		Overlay.open('Edit database','/markup/cloudflare/d1/database_edit.html',signal);
	}
}

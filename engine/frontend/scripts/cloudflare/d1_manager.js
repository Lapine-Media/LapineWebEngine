
import { Index,Settings,IO,Overlay,LapineMessage,D1Item } from '../frontend.js';

export const D1Manager = new class {
	#cached = null;
	#waiting = false;
	constructor() {
		window.addEventListener('d1_manager',this,false);
	}
	async handleEvent(event) {
		try {
			let signal,message;
			switch (event.detail.name+' '+event.detail.value) {
				case 'menu visible':
					if (this.#cached != null) {
						this.#listD1Databases(this.#cached);
					} else {
						IO.sendSignal(false,'d1','list','databases');
					}
					break;
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
					break;
				default:
					console.log('???',event.detail);
			}
		} catch (error) {
			console.log(event.detail);
			console.log(error);
		}
	}
	#listD1Databases(data) {
		const bindings = this.#getBindings();
		const fragment = document.createDocumentFragment();
		for (const item of data) {
			const bound = bindings.includes(item.name);
			const element = new D1Item(item,bound);
			fragment.append(element);
		}
		Index.update(Index.elements.subpage.d1_items,fragment);
	}
	#getBindings() {
		const wrangler = Settings.wrangler;
		const environments = [
			'top',
			...(wrangler.env ? Object.keys(wrangler.env) : [])
		];
		const list = [];
		for (const environment of environments) {
			const scope = environment === 'top' ? wrangler : wrangler.env[environment];
			if (!scope) continue;
			if (scope.d1_databases) {
				for (const item of scope.d1_databases) {
					list.push(item.database_name);
				}
			}
		}
		return list;
	}
}

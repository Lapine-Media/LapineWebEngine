
import { Tools } from './tools.js';
import url from 'url';
import path from 'path';
import JSONC from 'jsonc-simple-parser';

export default new class {
	#data = {
		wrangler: null,
		package: null,
		devVars: null
	}
	paths;
	constructor() {

		const file = url.fileURLToPath(import.meta.url);
		const dir = path.join(file,'../');

		this.paths = {
			project: process.env.PWD,
			app: process.env.PWD+'/app',
			lapine: path.dirname(dir)
		}

	}
	async loadWrangler() {
		if (this.#data.wrangler == null) {
			const jsonc = await Tools.fileExist(this.paths.project+'/wrangler.jsonc');
			if (jsonc) {
				const wrangler = await Tools.readFile(this.paths.project+'/wrangler.jsonc',false,false);
				this.#data.wrangler = JSONC.parse(wrangler);
			} else {
				this.#data.wrangler = await Tools.readFile(this.paths.project+'/wrangler.json',true,false);
			}
		}
		return Promise.resolve(this.#data.wrangler);
	}
	async saveWrangler(data) {
		this.#data.wrangler = data;
		const content = JSON.stringify(data,null,'\t');
		return Tools.writeFile(this.paths.project+'/wrangler.json',content);
	}
	async loadPackage() {
		if (this.#data.package == null) {
			this.#data.package = await Tools.readFile(this.paths.project+'/package.json',true,false);
		}
		return Promise.resolve(this.#data.package);
	}
	async loadManifest() {
		if (this.#data.manifest == null) {
			const file = this.paths.project+'/manifest.webmanifest';
			const exist = await Tools.fileExist(file);
			if (exist) {
				this.#data.manifest = await Tools.readFile(file,true,false);
			} else {
				this.#data.manifest = {};
			}
		}
		return Promise.resolve(this.#data.manifest);
	}
	async loadDevVars() {
		if (this.#data.devVars == null) {
			this.#data.devVars = {};
			const content = await Tools.readFile(this.paths.project+'/.dev.vars',false,false);
			const lines = content.split('\n');
			const regex = /^([^=#\s]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#]*))/;
			const method = line => {
				line = line.trim();
				if (!line || line.startsWith('#')) return; // Skip empty lines and comments
				const match = line.match(regex);
				if (match) {
					const key = match[1];
					const value = match[2] || match[3] || match[4] || '';
					this.#data.devVars[key] = value;
				}
			};
			lines.forEach(method);
		}
		return Promise.resolve(this.#data.devVars);
	}
	async saveWranger() {

	}
	async savePackage() {

	}
	async saveDevVars() {

	}
}


import IO from './io.js';
import fs from 'fs/promises';
import { default as Path } from 'path';

import { minify } from 'terser';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';

import { exec } from 'child_process';

export const Cleanup = {
	plugins: [autoprefixer],
	options: {from: undefined},
	css: function(css,minify = true) {
		const promise = async (resolve,reject) => {
			try {
				const result = await postcss(this.plugins).process(css,this.options);
				result.warnings().forEach(warn => IO.log('reject',warn));
				css = minify == false ? result.css : result.css
					.replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
					.replace(/\s*([{}:;,])\s*/g, '$1') // Remove spaces around symbols
					.replace(/\s+/g, ' ') // Replace multiple spaces with single space
					.replace(/;}/g, '}') // Remove unnecessary semicolons before a closing brace
					.trim(); // Remove leading/trailing whitespace
				resolve(css);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	},
	html: function(markup) {
		markup = markup
			.replace(/>\s+</g, '><') // Remove whitespace between tags
			.replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
			.replace(/<!--[\s\S]*?-->/g, '') // Remove comments
			.trim(); // Remove leading/trailing whitespace
		return Promise.resolve(markup);
	},
	js: function(contents) {
		const promise = async (resolve,reject) => {
			try {
				const minified = await minify(contents,{});
				resolve(minified.code);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	}
}

export const Tools = {
	mimes: {
		'.txt': 'text/plain',
		'.html': 'text/html',
		'.js': 'text/javascript',
		'.css': 'text/css',
		'.json': 'application/json',
		'.png': 'image/x-png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.gif': 'image/gif',
		'.svg': 'image/svg+xml'
	},
	asPromise: function(method) {
		return (...args) => {
			const promise = async (resolve,reject) => {
				try {
					const result = await method(...args);
					resolve(result);
				} catch (error) {
					reject(error);
				}
			}
			return new Promise(promise);
		};
	},
	fileData: function(path) {
		const promise = async (resolve,reject) => {
			try {
				const name = Path.basename(path);
				const type = Path.extname(name);
				const stat = await fs.stat(path);
				const data = {
					path: path,
					name: name.replace(type,''),
					type: type,
					mime: this.mimes[type],
					size: stat.size
				}
				resolve(data);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	},
	readFile: function(path,json = false,decompress = false,missing = null) {
		IO.log('normal','Reading: '+path,true);
		let content;
		const promise = async (resolve,reject) => {
			try {
				if (decompress) {
					content = await fs.readFile(path);
					content = await this.decompress(content);
				} else {
					const options = {encoding: 'utf8'};
					content = await fs.readFile(path,options);
				}
				content = json ? JSON.parse(content): content;
				resolve(content);
			} catch (error) {
				if (missing == null) {
					reject(error);
				} else {
					resolve(missing);
				}
			}
		}
		return new Promise(promise);
	},
	writeFile: function(path,content,compress = false,append = false) {
		IO.log('normal','Writing: '+path,true);
		const promise = async (resolve,reject) => {
			try {
				if (compress) {
					content = await this.compress(content);
				}
				if (append) {
					await fs.appendFile(path,content);
				} else {
					await fs.writeFile(path,content);
				}
				const stats = await fs.stat(path);
				const size = this.formatFileSize(stats.size);
				IO.log('inform','Size: '+size);
				resolve(stats.size);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	},
	ensureDirectory: async function(path) {
		try {
			const options = {recursive: true};
			await fs.mkdir(path,options);
		} catch (error) {
			IO.log('reject','Failed to create directory: '+path);
			IO.log('reject',error);
			throw error;
		}
	},
	readDirectory: function(path,withFileTypes = false,recursive = false) {
		try {
			IO.log('normal','Reading directory: '+path,true);
			const options = {withFileTypes,recursive}
			return fs.readdir(path,options);
		} catch (error) {
			throw error;
		}
	},
	removeFile: function(path) {
		try {
			IO.log('normal','Removing: '+path,true);
			return fs.unlink(path);
		} catch (error) {
			throw error;
		}
	},
	compress: function(string) {
		const promise = async (resolve,reject) => {
			try {
				const byteArray = new TextEncoder().encode(string);
				const cs = new CompressionStream('gzip');
				const writer = cs.writable.getWriter();
				writer.write(byteArray);
				writer.close();
				const arrayBuffer = await new Response(cs.readable).arrayBuffer();
				const data = Buffer.from(arrayBuffer);
				resolve(data);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	},
	decompress: function(data) {
		const promise = async (resolve,reject) => {
			try {
				const ds = new DecompressionStream('gzip');
				const writer = ds.writable.getWriter();
				writer.write(data);
				writer.close();
				const arrayBuffer = await new Response(ds.readable).arrayBuffer();
				const string = new TextDecoder().decode(arrayBuffer);
				resolve(string);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	},
	formatFileSize: function(sizeInBytes) {
		const units = ['B','KB','MB','GB'];
		let index = 0;
		while (sizeInBytes >= 1024 && index < units.length - 1) {
			sizeInBytes /= 1024;
			index++;
		}
		const bytes = sizeInBytes.toFixed(2);
		return bytes+' '+units[index];
	},
	compareFileSize: function(from,to) {
		const reduction = (from-to)/from;
		const percent = (reduction*100)+Number.EPSILON;
		return Math.round(percent*100)/100;
	},
	fileExist: function(path) {
		const promise = async (resolve,reject) => {
			try {
				await fs.access(path, fs.constants.R_OK | fs.constants.W_OK);
				resolve(true);
			} catch {
				resolve(false);
			}
		}
		return new Promise(promise);
	},
	getTimestamp: function(date = true,time = true,seconds = true,timeZone = 'Europe/Paris') {
		const now = new Date();
		const timeOptions = {
			year: date ? 'numeric' : undefined,
			month: date ? '2-digit' : undefined,
			day: date ? '2-digit' : undefined,
			hour: time ? '2-digit' : undefined,
			minute: time ? '2-digit' : undefined,
			second: time && seconds ? '2-digit' : undefined,
			timeZone: timeZone,
			hour12: false
		}
		return new Intl.DateTimeFormat('en-CA',timeOptions).format(now).replace(',','');
	}
}

export const Scripts = {
	files: {},
	imports: [],
	expressions: {
		named: /^import \{([\w\d-_, ']+)\} from '(.*)';$/,
		default: /^import ([\w\d-_]+) from '(.*)';$/,
		defaultNamed: /^import ([\w\d-_]+), \{([\w\d-_, ]+)\} from '(.*)';$/,
		defaultNameSpace: /^import ([\w\d-_]+, [^ ]+ as [\w\d-_]+) from '(.*)';$/,
		nameSpace: /^import ([^ ]+ as [\w\d-_]+) from '(.*)';$/,
		sideEffect: /^import '(.*)';$/
	},
	separate: function(statement) {
		if (statement.includes('\'./')) {
			return null;
		}
		for (const [type, regex] of Object.entries(this.expressions)) {
			const match = statement.match(regex);
			if (match) {
				const data = { type };
				switch (type) {
					case 'named':
						[, data.list, data.file] = match;
						data.list = data.list.split(',');
						break;
					case 'default':
					case 'nameSpace':
						[, data.main, data.file] = match;
						break;
					case 'defaultNamed':
						[, data.main, data.list, data.file] = match;
						data.list = data.list.split(',');
						break;
					case 'defaultNameSpace':
						[, data.main, data.file] = match;
						data.main = data.main.split(',');
						break;
					case 'sideEffect':
						[, data.file] = match;
						break;
				}
				return data;
			}
		}
		IO.log('reject','Bad format: '+statement);
		return null;
	},
	organise: function(entry) {
		this.files[entry.file] ??= { main: [], list: [] };
		const fileEntry = this.files[entry.file];
		fileEntry.main.push(entry.main);
		fileEntry.list.push(entry.list);
	},
	simplify: function(array) {
		array = array.flat(Infinity);
		array = array.filter(value => value != null);
		array = array.map(value => value.trim());
		return [...new Set(array)];
	},
	flatten: function(entry) {
		const [key,value] = entry;
		this.files[key].main = this.simplify(value.main);
		this.files[key].list = this.simplify(value.list);
	},
	combine: function(entry) {
		const [key,value] = entry;
		const main = value.main.join(', ');
		const list = value.list.join(', ');
		if (value.main.length && value.list.length) {
			if (value.main.length>1) {
				this.imports.push('import '+main+' from \''+key+'\';');
				this.imports.push('import { '+list+' } from \''+key+'\';');
			} else {
				this.imports.push('import '+main+', { '+list+' } from \''+key+'\';');
			}
		} else if (value.main.length) {
			this.imports.push('import '+main+' from \''+key+'\';');
		} else if (value.list.length) {
			this.imports.push('import { '+list+' } from \''+key+'\';');
		} else {
			this.imports.push('import \''+key+'\';');
		}
	},
	consolidateImports: function(statements) {
		this.files = {};
		this.imports = [];
		const list = statements.map(this.separate,this).filter(Boolean);
		list.forEach(this.organise,this);
		Object.entries(this.files).forEach(this.flatten,this);
		Object.entries(this.files).forEach(this.combine,this);
		return this.imports;
	},
	mergeScripts: function(files) {
		const promise = async (resolve,reject) => {
			try {
				const importRegex = /^(?:import\s.+?;|const\s.+?=\srequire\(.+?\);)$/gm;
				let dependencies = [];
				const scripts = [];
				const elements = [];
				for (const file of files) {
					let content = await Tools.readFile(file,false,false);
					const imports = content.match(importRegex) || [];
					content = content.replace(importRegex, '').trim();
					content = content.replace(/export\s+default\s+class/,'export class');// remove default keyword
					dependencies.push(...imports);
					scripts.push(content);
					if (file.includes('-') == true) {
						const name = file.match(/(?:\/|^)([\w-]+)\./)[1];
						const construct = content.match(/export\s+class\s+(\w+)\s+extends\s+HTMLElement/)[1];
						elements.push("Site.define('"+name+"',"+construct+");");
					}
				}
				const merged = [
					...this.consolidateImports(dependencies),
					...scripts,
					...elements
				].join('\n');
				resolve(merged);
			} catch (error) {
				reject(error);
			}
		}
		return new Promise(promise);
	}
}

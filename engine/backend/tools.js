
import IO from './io.js';
import fs from 'fs/promises';
import { default as Path } from 'path';
import sharp from 'sharp';
import { minify } from 'terser';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import { exec } from 'child_process';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export const Cleanup = {
	plugins: [autoprefixer],
	options: {from: undefined},
	css: async function(css,minify = true) {
		try {
			const result = await postcss(this.plugins).process(css,this.options);
			result.warnings().forEach(warn => IO.log('reject',warn));
			css = minify == false ? result.css : result.css
				.replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
				.replace(/\s*([{}:;,])\s*/g, '$1') // Remove spaces around symbols
				.replace(/\s+/g, ' ') // Replace multiple spaces with single space
				.replace(/;}/g, '}') // Remove unnecessary semicolons before a closing brace
				.trim(); // Remove leading/trailing whitespace
			return css;
		} catch (error) {
			throw error;
		}
	},
	html: function(markup) {
		return markup
			.replace(/>\s+</g, '><') // Remove whitespace between tags
			.replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
			.replace(/<!--[\s\S]*?-->/g, '') // Remove comments
			.trim(); // Remove leading/trailing whitespace
	},
	js: async function(contents) {
		try {
			const minified = await minify(contents,{});
			return minified.code;
		} catch (error) {
			throw error;
		}
	}
}

export const Tools = {
	mimes: {
		'.txt': 'text/plain',
		'.html': 'text/html',
		'.js': 'text/javascript',
		'.css': 'text/css',
		'.json': 'application/json',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.gif': 'image/gif',
		'.webp': 'image/webp',
		'.svg': 'image/svg+xml'
	},
	fileData: async function(path) {
		const name = Path.basename(path);
        const type = Path.extname(name);
        const stat = await fs.stat(path);
		const safeName = Path.parse(path).name;
        return {
            path: path,
            name: safeName,
            type: type,
            mime: this.mimes[type] || 'application/octet-stream',
            size: stat.size
        };
	},
	readFile: async function(path,json = false,decompress = false,missing = null) {
		//const { json = false, decompress = false, missing = null } = options;
		try {
			let content;
			if (decompress) {
				const buffer = await fs.readFile(path);
                content = await this.decompress(buffer);
			} else {
				const options = {encoding: 'utf8'};
				content = await fs.readFile(path,options);
			}
			if (json) {
                content = JSON.parse(content);
            }
			IO.log('normal','Reading: '+path,true);
			return content;
		} catch (error) {
			if (missing == null) {
				throw error;
			}
			return missing;
		}
	},
	writeFile: async function(path,content,compress = false,append = false) {
		if (typeof content !== 'string') {
			content = JSON.stringify(content,null,'\t') ?? '';
		}
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
		IO.log('normal','Writing: '+path,true);
		IO.log('inform','Size: '+size);
		return stats.size;
	},
	cloneFile: async function(source,destination) {
		await fs.copyFile(source,destination);
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
	readDirectory: async function(path,withFileTypes = false,recursive = false,quiet = true) {
		try {
	        const options = { withFileTypes, recursive };
	        const files = await fs.readdir(path, options);
	        IO.log('normal', 'Reading directory: ' + path, true);
	        return files;
	    } catch (error) {
	        if (quiet) return [];
	        throw error;
	    }
	},
	cloneDirectory: async function(source,destination) {
		IO.log('normal','Cloning directory: '+source,true);
		const options = {
			recursive: true,
			force: false
		};
		await fs.cp(source,destination,options);
	},
	removeFile: async function(path,quiet = true) {
		try {
			IO.log('normal', 'Removing: ' + path, true);
			return await fs.unlink(path);
		} catch (error) {
			if (quiet && error.code === 'ENOENT') return;
			throw error;
		}
	},
	compress: async function(string) {
		return await gzipAsync(string);
	},
	decompress: async function(data) {
		const buffer = await gunzipAsync(data);
		return buffer.toString('utf8');
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
	fileExist: async function(path) {
		try {
			await fs.access(path, fs.constants.R_OK | fs.constants.W_OK);
			return true;
		} catch {
			return false;
		}
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
	},
	loadImage: async function(path) {
		const content = await fs.readFile(path);
		const filename = Path.basename(path);
		const extension = Path.extname(filename).toLowerCase();
		const type = this.mimes[extension] || 'application/octet-stream';
		const b64 = content.toString('base64');
		IO.log('normal', 'Reading: ' + path, true);
		return {
			type: type,
			src: 'data:'+type+';base64,'+b64,
			name: filename,
			path: path
		};
	},
	saveImage: async function(buffer, path, type, width, height, background = false) {
		try {
			let options = {
				width: width,
				height: height,
				fit: 'contain',
				background: background || { r: 0, g: 0, b: 0, alpha: 0 }
			};

			let pipeline = sharp(buffer).resize(options);

			if (background) {
				options = { background: background };
				pipeline = pipeline.flatten(options);
			}

			if (type === 'image/webp') {
				options = { lossless: true };
				pipeline = pipeline.webp(options);
			} else {
				pipeline = pipeline.png();
			}

			await pipeline.toFile(path);

			const stats = await fs.stat(path);
			const size = this.formatFileSize(stats.size);

			IO.log('normal', 'Writing: ' + path, true);
			IO.log('inform', 'Size: ' + size);

			return stats.size;

		} catch (error) {
			IO.log('reject', 'Failed to save image: ' + path);
			throw error;
		}
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
	mergeScripts: async function(files) {
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
		return merged;
	}
}


import IO from './io.js';
import fs from 'fs/promises';
import { default as Path } from 'path';
import sharp from 'sharp';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export default {
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
	cloneDirectory: async function(source,destination,replace = true) {
		IO.log('normal','Cloning directory: '+source+' to '+destination,replace);
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
		//size reduced to x%
		if (from === 0) return 0;
		return Math.round((to / from) * 10000) / 100;
	},
	fileExist: async function(path) {
		try {
			await fs.stat(path);
			return true;
		} catch {
			return true;
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

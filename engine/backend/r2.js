
import IO from './io.js';
import Settings from './settings.js';
import Worker from './worker.js';
import Cloudflare from './cloudflare.js';

const commands = {
	getPaths: function() {
		return [
			'--cwd',
			Settings.paths.project,
			'--config',
			Settings.paths.project+'/wrangler.json'
		];
	}
}

const methods = {
	list: async function() {
		try {
			IO.log('accept','Getting list of R2 buckets...');
			const request = {
				method: 'GET',
				href: 'accounts/$ACCOUNT_ID/r2/buckets'
			}
			const response = await IO.api(request);
			IO.signal('r2','buckets','loaded',response);
			IO.log('accept','Done!');
		} catch {
			IO.log('reject','R2 connection failed.');
		}
		IO.log('line');
	},
	create: async function(data) {
		try {
			IO.log('accept','Creating R2 bucket...');
			IO.log('normal',data.name);
			const request = {
				api: 'aws',
				href: data.name,
				method: 'put',
				headers: data.jurisdiction ? {
					'cf-r2-jurisdiction': data.jurisdiction
				} : null
			}
			const response = await IO.api(request);
			IO.signal('r2','buckets','created',response);
			IO.log('accept','Done!');
			IO.log('line');
		} catch (error) {
			console.log(error);
			IO.log('line');
		}
	},
	remove: async function(data) {
		try {
			IO.log('accept','Removing R2 bucket...');
			IO.log('normal',data.name);
			const request = {
				api: 'aws',
				href: data.name,
				method: 'delete',
				headers: data.jurisdiction ? {
					'cf-r2-jurisdiction': data.jurisdiction
				} : null
			}
			const response = await IO.api(request);
			IO.signal('r2','buckets','removed',response);
			if (data.binding) {
				Cloudflare('bindings','remove',data.binding);
			} else {
				IO.log('accept','Done!');
				IO.log('line');
			}
		} catch (error) {
			console.log(error);
			IO.log('line');
		}
	}
}

const objects = {
	list: async function(data) {
		try {
			IO.log('accept','Getting list of objects in bucket...');
			IO.log('normal',data.bucket_name);
			const formData = new FormData();
			//data.append('cursor',data.cursor);
			const object = {
				href: 'accounts/$ACCOUNT_ID/r2/buckets/'+data.bucket_name+'/objects',
				params: {
					per_page: 25
				}
			}
			const promises = [
				Worker.request('local','list',formData),
				Worker.request('remote','list',formData)
				//IO.api(object)
			];
			const [local,remote] = await Promise.all(promises);
			const response = {local,remote};
			IO.signal('r2','objects','list',response);
			IO.log('accept','Done!');
			IO.log('line');
		} catch (error) {
			console.log(error);
			IO.log('line');
		}
	},
	upload: async function(data) {
		try {
			IO.log('accept','Uploading file to bucket...');
			IO.log('normal',data.name);

			/*
			cacheControl: ""
			cacheExpiry: ""
			contentDisposition: "inline"
			contentEncoding: ""
			contentLanguage: ""
			contentType: ""
			customMetadata: ""
			file: File {
				lastModified: 1747265895673
				lastModifiedDate: Thu May 15 2025 01:38:15 GMT+0200 (Central European Summer Time) {}
				name: "177965751-origpic-1a26ad.jpg"
				size: 804040
				type: "image/jpeg"
				webkitRelativePath: ""
			}
			jurisdiction: "default"
			name: ""
			storageClass: "Standard"
			target: "local"
			*/

			/*const command = [
				'wrangler r2 object put',
				Worker.data.bucket_name+'/'+data.name,
				'--file',
				data.file,

				'--content-type',
				'--content-disposition',
				'--content-encoding',
				'--content-language',
				'--cache-control',
				'--expires',
				'--local',
				'--remote',
				'--jurisdiction',
				'--storage-class'


				'--output',
				file,
				all ? null : '--table '+data.table,
				'--'+data.target,
				data.output.includes('schema') ? null : '--no-schema',
				data.output.includes('data') ? null : '--no-data',

				'--env',
				Worker.data.environment,
				...commands.getPaths()
			].filter(Boolean).join(' ');

			console.log(command);
			*/

			console.log(0,data.file instanceof File);
			console.log(1,data.file);

			const formData = new FormData();
			const entries = Object.entries(data);
			for (const [key,value] of entries) {
				formData.append(key,value);
			}
			const response = await Worker.request('upload',formData);
			console.log('response',response);
			IO.signal('r2','objects','upload complete',response);
			IO.log('accept','Done!');
			IO.log('line');
		} catch (error) {
			console.log(error);
			IO.log('line');
		}
	}
}

export default async function(name,value,data) {
	try {
		switch (name+' '+value) {
			case 'buckets list':
				methods.list();
				break;
			case 'buckets create':
				methods.create(data);
				break;
			case 'buckets remove':
				methods.remove(data);
				break;
			case 'objects list':
				objects.list(data);
				break;
			case 'objects upload':
				objects.upload(data);
				break;
			default:
				console.log('r2',name,value,data);
		}
	} catch (error) {
		console.log(error);
	}
}

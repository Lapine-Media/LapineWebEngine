
import IO from './io.js';
import Paths from './paths.js';

export default async function(name,value,data,id) {
	try {
		let result,response;
		switch (name+' '+value) {
			case 'page visible':
				break;
			case 'list namespaces':
				IO.log('accept','Getting list of Durable Objects namespaces...');
				result = await listNamespaces();
				IO.signal(id,'list','loaded',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			case 'list objects':
				IO.log('accept','Getting list of Durable Objects...');
				result = await listObjects(data);
				IO.signal(id,'list','loaded',result);
				IO.log('accept','Done!');
				IO.log('line');
				break;
			default:
				console.log('durable_objects',name,value,data);
		}
	} catch (error) {
		console.log(error);
	}
}

// SETTINGS ///////////////////////////////////////////////////////////////////

const predefined = {
	href: 'accounts/$ACCOUNT_ID/workers/durable_objects/namespaces',
	paths: [
		'--cwd',
		Paths.folders.project.working,
		'--config',
		Paths.files.wrangler.working
	]
}

async function listNamespaces() {
	const request = {
		href: predefined.href,
		method: 'GET'
	}
	const response = await IO.api(request);
	return response.result;
}

async function listObjects(data) {
	const request = {
		href: predefined.href+'/'+data.id+'/objects',
		method: 'GET'
	}
	const response = await IO.api(request);
	return response.result;
}


import D1Editor from './d1.js';
import R2Editor from './r2.js';

export default {
	async fetch(request,env) {
		try {
			console.log('editor env: ',env);
			const url = new URL(request.url);
			const method = url.pathname.split('/')[1];
			const binding = env[BINDING];
			const type = request.headers.get('Content-Type');
			let data = {};
			switch (true) {
				case type == null:
					break;
				case type.includes('multipart/form-data'):
					data = await request.formData();
					break;
				case type.includes('application/json'):
					data = await request.json();
					break;
			}
			let result = null;
			switch (env.context) {
				case 'd1_databases':
					result = await D1Editor[method](binding,data);
					break;
				case 'r2_buckets':
					result = await R2Editor[method](binding,data);
					break;
			}
			const options = {
				status: 200,
				statusText: 'OK',
				headers: {
					'Access-Control-Allow-Origin': 'http://127.0.0.1:3000'
				}
			};
			return Response.json(result,options);
		} catch (error) {
			console.log('editor error: ',error);
			const options = {
				status: 500,
				statusText: 'Editor error'
			};
			const body = {
				error: error.toString()
			}
			return Response.json(body,options);
		}
	}
}

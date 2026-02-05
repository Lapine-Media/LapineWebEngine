
import D1Editor from './d1.js';
import R2Editor from './r2.js';

export default {
	async fetch(request,env) {
		try {

			const url = new URL(request.url);
            const method = url.pathname.split('/')[1];

            // --- DEBUGGING BLOCK ---
            // This will print to your Lapine Output panel
            if (method === 'debug' || method === 'list') {
                console.log(`[Proxy] Context: ${env.context}`);
				try {
					console.log(`[Proxy] Target Binding Name: "${BINDING}"`);
				} catch (error) {
					console.log('NO BINDING: ',error);
				}

                console.log(`[Proxy] Available Env Keys: ${Object.keys(env).join(', ')}`);
            }
            // -----------------------

            const binding = env[BINDING];
            if (!binding) {
                throw new Error(`Binding "${BINDING}" not found in environment. Available: ${Object.keys(env).join(', ')}`);
            }

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

            // Ensure data.type from frontend matches these cases exactly
            switch (env.context) {
                case 'd1_databases':
                    result = await D1Editor[method](binding, data);
                    break;
                case 'r2_buckets':
                    result = await R2Editor[method](binding, data);
                    break;
                default:
					throw new Error('Unknown Context: "'+env.context+'"');
            }

            const options = {
                status: 200,
                headers: { 'Access-Control-Allow-Origin': '*' }
            };
            return Response.json(result, options);

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

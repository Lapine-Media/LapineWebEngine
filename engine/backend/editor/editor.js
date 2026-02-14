
export default class Editor {
    constructor() {}
	async fetch(request,env) {
		try {
			const url = new URL(request.url);
            const method = url.pathname.split('/')[1];
			const type = request.headers.get('Content-Type');
            const binding = env[BINDING];
			let data = new FormData();
			switch (true) {
				case !binding:
					const bindings = Object.keys(env).join(', ');
					throw new Error('Binding "'+BINDING+'" not found in environment. Available: '+bindings);
				case type == null:
					break;
				case type.includes('multipart/form-data'):
					data = await request.formData();
					break;
				case type.includes('application/json'):
					data = await request.json();
					break;
			}
			const result = await this[method](binding, data);
			const options = {
                status: 200,
				statusText: 'Editor ok'
            };
            return Response.json(result, options);
		} catch (error) {
			const options = {
				status: 500,
				statusText: 'Editor error'
			};
			return new Response(error.message,options);
		}
	}
}

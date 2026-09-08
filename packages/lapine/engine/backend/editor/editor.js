
export default class Editor {
	binding;
    constructor() {}
    respond(body = null, status = 200, statusText = 'OK', json = true) {
        const options = { status, statusText };
        return json ? Response.json(body, options) : new Response(body, options);
    }
    async fetch(request, env) {
        try {

			switch(true) {
				case !env.binding:
					throw new Error('env.binding is not defined.');
				case !env[env.binding]:
					const available = Object.keys(env).join(', ');
	                throw new Error('Binding "' + env.binding + '" not found. Available: ' + available);
			}

			this.binding = env[env.binding];

            const url = new URL(request.url);
            const method = url.pathname.split('/')[1];
			const type = request.headers.get('Content-Type') ?? '';
			let input = {};

			switch(true) {
				case typeof this[method] !== 'function':
					throw new Error('Unknown method: ' + method);
				case type.includes('multipart/form-data'):
					const values = key => {
						const multiple = data.getAll(key).length > 1;
						const value = multiple ? data.getAll(key) : data.get(key);
						return [key,value];
					};
					const data = await request.formData();
					const keys = data.keys();
					const entries = [...keys].map(values);
					input = Object.fromEntries(entries);
					break;
				case type.includes('application/json'):
					input = await request.json();
			}

			const result = await this[method](input);

			if (result.error) {
				return this.respond(result, 400, 'Editor error', true);
			} else {
				return this.respond(result, 200, 'Editor ok', true);
			}

        } catch (error) {
            console.error('[Editor error]', error);
			return this.respond(error.message, 500, 'Editor error', false);
        }
    }
}

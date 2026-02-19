
export default class Editor {
    constructor() {}
	respond(body = null,status = 200,statusText = 'OK',json = true) {
		const options = {status,statusText};
		if (json) {
			return Response.json(body,options);
		}
		return new Response(body,options);
	}
	async fetch(request,env) {
		try {
			const url = new URL(request.url);
            const method = url.pathname.split('/')[1];
			const type = request.headers.get('Content-Type');
			let data = new FormData();
			switch (true) {
				case !env.binding:
					throw new Error('The env.binding variable is not defined.');
				case !env[env.binding]:
					const bindings = Object.keys(env).join(', ');
					throw new Error('Binding "'+env.binding+'" not found in environment. Available: '+bindings);
				case type == null:
					break;
				case type.includes('multipart/form-data'):
					data = await request.formData();
					break;
				case type.includes('application/json'):
					data = await request.json();
					break;
			}
			const binding = env[env.binding];
			const result = await this[method](binding, data);
			return this.respond(result,200,'Editor ok',true);
		} catch (error) {
			console.log(env);
			console.error(error);
			return this.respond(error.message,500,'Editor error',false);
		}
	}
}

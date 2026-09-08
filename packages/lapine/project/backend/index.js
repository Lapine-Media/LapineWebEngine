
// HELPERS ////////////////////////////////////////////////////////////////////

class ResponseError extends Error {
	constructor(code = 500, ...params) {
		super(...params);
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this,ResponseError);
		}
		this.name = 'ResponseError';
		this.code = code;
	}
}
class ResponseSuccess extends Response {
	constructor(body, status = 200, statusText = 'OK', headers = {}, settings = {}) {
		body = typeof body === 'object' && body !== null ? JSON.stringify(body) : body;
		super(body, {status, statusText, headers, ...settings});
	}
}

// FETCH //////////////////////////////////////////////////////////////////////

export default {
	async fetch(request, env, ctx) {
		try {
			const url = new URL(request.url);
			switch (true) {
				case url.pathname.startsWith('/api/'):
					return new ResponseSuccess(null);
				default:
					throw new ResponseError(404,'File not found: '+url.pathname);
					//return env.ASSETS.fetch(request);
			}
		} catch (error) {
			console.log(error);
			const options = { status: 500 };
			switch (error.name) {
				case 'ResponseError':
					options.status = error.code;
					return new Response(error.message,options);
				default:
					console.log(error);
					return new Response('Server error',options);
			}
		}
	}
};


import Routing from './routing.js';

/*
rewrite
content
api
*/

export const Site = {
	request: null,
	env: null,
	ctx: null,
	url: null,
	isolate: function(request,env,ctx) {
		this.request = request;
		this.env = env;
		this.ctx = ctx;
		this.url = new URL(request.url);
	},
	loadAsset: async function(href,type) {
		if (href === undefined) {
			return this.env.ASSETS.fetch(this.request);
		}
		const url = new URL(href,this.url.origin);
		const response = await this.env.ASSETS.fetch(url.href);
		switch (type) {
			case 'text':
				return await response.text();
			case 'gzip':
				const ds = new DecompressionStream('gzip');
				const stream = response.body.pipeThrough(ds);
				return await new Response(stream).text();
			case 'json':
				return await response.json();
			case 'formData':
				return await response.formData();
			case 'arrayBuffer':
				return await response.arrayBuffer();
			case 'bytes':
				return await response.bytes();
			case 'blob':
				return await response.blob();
			case 'clone':
				return await response.clone();
			default:
				return response;
		}
	},
	loadContent: async function() {

		const accept = this.request.headers.get('Accept') || '';
		const requestedBy = this.request.headers.get('X-Requested-By') || '';

		switch (true) {
			case accept.includes('text/html'):

				await Routing.loadSitemap();
				const uni = Routing.getUniFromHREF(this.url.href);
				const node = Routing.getNode(uni);

				if (requestedBy === 'Lapine') {
					console.log('get page');
					return await this.loadAsset('/markup/pages/'+node.file+'.html',null);
				} else {
					console.log('get frame');
					return await this.loadAsset('/markup/frames/'+node.frame+'.html',null);
				}

			default:
				console.log('get asset',this.url.pathname);
				return await this.loadAsset();
		}

	},
	loadAPI: async function() {
		return await this.loadAsset();
	}
}

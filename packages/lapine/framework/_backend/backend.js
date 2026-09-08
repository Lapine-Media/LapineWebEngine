
const Rewrite = {
	data: {
		head: '',
		templates: '',
		content: '',
		values: ''
	},
	nonce: Math.random().toString(16).slice(2),
	element: function(element) {
		switch (element.tagName) {
			case 'meta':
			case 'link':
				const attribute = element.tagName == 'meta' ? 'content' : 'href';
				const key = element.getAttribute(attribute);
				if (key && this.data.values[key] != undefined) {
					const value = this.data.values[key];
					element.setAttribute(attribute,value);
				}
				break;
			case 'title':
				element.setInnerContent(this.data.values.title);
				break;
			case 'head':
				element.append(this.data.head,{html:true});
				break;
			case 'body':
				element.prepend(this.data.templates,{html:true});
				break;
			case 'lapine-frame':
				element.setInnerContent(this.data.content,{html:true});
				break;
			case 'script':
				element.setAttribute('nonce',this.nonce);
				break;
			default:
				const string = element.getAttribute('condition');
				if (Session.conditions(string) != 'continue') {
					element.remove();
				}
				break;
		}
	}
};

const Content = {
	getHTML: async function(request,env) {
		try {
			await Sitemap.loadMap(env);
			await Session.getCookie(request,env,Sitemap.data.site.location);

			const uni = Sitemap.getUniFromURL(Site.url);

			let page = Sitemap.getNode(uni);

			if (page.file == '') {
				page = Sitemap.getFirstChild(page);
			}

			const result = Session.conditions(page.conditions);

			switch (result) {
				case 'continue':
					break;
				case 'break':
					page = Sitemap.getNode('denied');
					break;
				default:
					page = Sitemap.getNode(result);
			}

			let rewriter = new HTMLRewriter();
			let response = await Site.getAsset(env,'/markup/pages/'+page.file+'.html');

			if (request.headers.get('X-Requested-With') == 'LAPINE') {
				rewriter.on('*[condition]',Rewrite);
				response = rewriter.transform(response);
				response = await Session.refresh(response);
				return response;
			}

			const remover = {element: (element) => element.remove()};

			rewriter.on('script',remover);
			rewriter.on('lapine-kit',remover);
			rewriter.on('lapine-svg',remover);

			response = rewriter.transform(response);
			rewriter = new HTMLRewriter();

			const frame = Sitemap.getNode(page.frame);
			let csp = await Site.getAsset(env,'/data/'+frame.csp+'.csp.txt','text');

			Rewrite.data.content = await response.text();
			Rewrite.data.head = await Site.getAsset(env,'/markup/frames/head.html','text');
			Rewrite.data.templates = await Site.getAsset(env,'/markup/frames/templates.html','text');
			Rewrite.data.values = Sitemap.data.site;
			Rewrite.data.values.title = page.seo_title || frame.seo_title;
			Rewrite.data.values.description = page.seo_description || frame.seo_description;
			Rewrite.data.values.keywords = page.seo_keywords || frame.seo_keywords;
			Rewrite.data.values.base_url = Site.url.origin;

			rewriter.on('title',Rewrite);
			rewriter.on('head',Rewrite);
			rewriter.on('meta',Rewrite);
			rewriter.on('link',Rewrite);
			rewriter.on('body',Rewrite);
			rewriter.on('lapine-frame',Rewrite);
			rewriter.on('*[condition]',Rewrite);
			rewriter.on('script',Rewrite);

			response = await Site.getAsset(env,'/markup/frames/'+frame.file+'.html');
			response = rewriter.transform(response);
			csp = csp.replaceAll('nonce','nonce-'+Rewrite.nonce);

			response.headers.set('Content-Type','text/html; charset=utf-8');
			response.headers.set('X-Responded-With','LAPINE');
			response.headers.set('Content-Security-Policy',csp);

			return response;
		} catch (error) {
			if (error.name == 'AssetError') {
				return new Response(error.message);
			}
			console.log(error);
			return new Response('Error');
			//throw new Error(error);
		}
	},
	getAPI: async function(request,env) {

		await Sitemap.loadMap(env);
		await Session.getCookie(request,env,Sitemap.data.site.location);

		const [module,method,context] = Site.url.pathname.split('/').slice(2);
		const input = (request.method == 'GET') ? Site.url.searchParams: await request.json();
		let response;

		try {

			const modules = await import('./api.js');
			const responder = modules[module][method];

			response = await responder(request,env,input,context);

		} catch (error) {
			if (error.name == 'invalid') {
				Signals.signal('invalid',error.detail);
				response = Signals.response(400,'Form error');
			} else {
				console.log(error);
				const message = Signals.message('reject','Error','Server error');
				message.addButton('Ok');
				response = Signals.response(500,'Form error');
			}
		}

		await Session.refresh(response);

		return response;

	}
}

export const Backend = {
	fetch: function fetch(request,env) { //context
		try {
			Site.url = new URL(request.url);
			switch (true) {
				case Site.url.pathname == '/favicon.ico':
				case Site.url.pathname == '/robots.txt':
					return Site.getAsset(env,Site.url.pathname);
				case Site.url.pathname.startsWith('/frontend/'):
					const path = Site.url.pathname.replace('/frontend/','/');
					return Site.getAsset(env,path);
				case Site.url.pathname.startsWith('/api/'):
					return Content.getAPI(request,env);
				default:
					return Content.getHTML(request,env);
			}
		} catch (error) {
			throw new Error(error);
		}
	}
}

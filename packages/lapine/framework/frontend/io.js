
export const IO = new class {
	constructor() {
		window.addEventListener('error',this,false);
		window.addEventListener('unhandledrejection',this,false);
	}
	async handleEvent(event) {
		event.preventDefault();
		switch (event.type) {
			case 'error':
				console.log(event);
				break;
			case 'unhandledrejection':
				console.log(event.reason);
				break;
			default:
				console.log(event);//PromiseRejectionEvent
		}
	}
	/*
	openLink
	loadPage
	postForm
	request
	*/
	async loadAsset(href,type = 'text',options = {}) {
		const url = new URL(href,document.baseURI);
		return await this.makeRequest(url,type,options);
	}
	async postForm(api,method,form) {
		//formData, files
		//api,method,data,callback
		const url = new URL(path,document.baseURI);
		const options = {
			method: 'POST',
			body: JSON.stringify(data),
			headers: {
				'Content-Type': 'application/json'
			}
		}
		const send = signal => callback(signal);
		const signals = await this.makeRequest(url,'json',options);
		signals.forEach(send);
	}
	async makeRequest(url,type,overrides) {
		const {
			method = 'GET',
			body = null,
			headers = {}
		} = overrides;
		/*
		'X-CSRF-Token' if session
		*/
		const options = { method,body,headers };
		const request = new Request(url,options);
		const response = await fetch(request);

		if (response.ok) {

			//await Session.update(response);
			try {
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
			} catch (error) {
				throw error;
			}

		}

	}
}

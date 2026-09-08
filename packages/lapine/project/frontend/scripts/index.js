
const Index = new class {
	#templates = {};
	#clickLocked = false;
	#signalBuffer = {};
	elements = {};
	constructor() {
		window.addEventListener('index',this,false);
		window.addEventListener('error',this,false);
		window.addEventListener('unhandledrejection',this,false);
		window.addEventListener('pushstate',this,false);
		window.addEventListener('popstate',this,false);
		window.addEventListener('load',this,false);
	}
	async handleEvent(event) {
		event.preventDefault();
		let start, end;
		const style = 'display:block;color:white;background:Red;font-weight:bold;';
		const background = 'background:#660000;';
		switch (event.type) {
			case 'load':
				this.elements.index = this.getElements(document.body);
				this.elements.index.year.textContent = new Date().getFullYear().toString();
				this.elements.index.left.addEventListener('click',this,false);
				this.elements.index.right.addEventListener('click',this,false);
				const url = new URL(document.location.href);
				const href = url.pathname.substring(1) || 'welcome';
				this.openLink(href,'main');
				break;
			case 'click':
				if (event.target == this.elements.index.left) {
					document.body.dataset.focus = 'left';
					document.body.dataset.hint = 'false';
				} else if (event.target == this.elements.index.right) {
					document.body.dataset.focus = 'right';
				} else if (this.#clickLocked == true) {
					return;
				} else {
					this.#clickLocked = true;
					setTimeout(() => this.#clickLocked = false,500);
					if (event.target.tagName == 'A') {
						const url = new URL(event.target.href);
						if (event.target.target == 'signal') {
							const [,context,name,value] = url.pathname.split('/');
							const search = url.searchParams.entries();
							const data = Object.fromEntries(search);
							this.sendSignal(context,name,value,data);
						} else {
							const href = event.target.getAttribute('href');
							this.openLink(href,event.target.target);
						}
					} else {
						this.buttonHandler(event.target);
					}
				}
				break;
			case 'submit':
				const context = event.target.getAttribute('action');
				let data = new FormData(event.target);
				if (event.target.enctype != 'multipart/form-data') {
					const entries = data.entries();
					data = Object.fromEntries(entries);
				}
				this.sendSignal(context,event.submitter.name,event.submitter.value,data);
				break;
			case 'pushstate':
				console.log('pushstate',event.state);
				break;
			case 'popstate':
				this.openLink(event.state.href,event.state.target,event.state.signal,false);
				break;
			case 'error':
				start = ('--- '+event.error.name+' ---').toUpperCase();
				end = '-'.repeat(start.length);
				console.log('%c '+start+' ',style+'border-radius:8px 0 0 0;');
				console.log('%c '+event.error.message,background);
				console.log('%c '+event.filename+' @ '+event.lineno+':'+event.colno,background);
				console.log('%c '+end+' ',style+'border-radius:0 0 0 8px;');
				break;
			case 'unhandledrejection':
				start = ('--- '+event.type+' ---').toUpperCase();
				end = '-'.repeat(start.length);
				console.log('%c '+start+' ',style+'border-radius:8px 0 0 0;');
				console.log('%c '+event.reason.stack,background);
				console.log('%c '+end+' ',style+'border-radius:0 0 0 8px;');
				break;
			default:
				this.buttonHandler(event.detail);
		}
	}
	async buttonHandler(object) {
		switch (object.name+' '+object.value) {
			case 'open menu':

				break;
			case 'close menu':

				break;
			default:
				console.log(detail);
		}
	}
	getSignal(context,name,value,data = null,signal = null) {
		return {context,name,value,data,signal};
	}
	receiveSignal(signal,argument = null) {
		switch (true) {
			case !signal:
				break;
			case signal instanceof Function:
				signal(argument);
				break;
			default:
				const {front,context,name,value,data} = signal;
				this.sendSignal(context,name,value,data);
		}
	}
	sendSignal(context,name,value,data = null,signal = null) {
		const id = 'signal_'+crypto.randomUUID();
		if (signal) {
			this.#signalBuffer[id] = signal;
		}
		const options = {
			detail: {name,value,data,id}
		};
		const event = new CustomEvent(context,options);
		window.dispatchEvent(event);
	}
	async openLink(href,target,signal = false,push = true) {
		if (!target || target == '_blank') {
			window.open(href,target);
			return true;
		}
		try {
			document.body.dataset.focus = 'right';
			const template = document.createElement('template');
			const frame = document.getElementById(target);
			const options = {top: 0, behavior: 'smooth'};
			template.innerHTML = await this.loadAsset('markup/'+href+'.html','text');
			this.updateElement(frame,template.content);
			frame.scrollTo(options);
			this.elements[target] = this.getElements(frame);
			this.receiveSignal(signal,href);

			if (push) {
				const state = {href,target,signal};
				history.pushState(state,'',href);
			}

			return this.elements[target];
		} catch (error) {
			console.error(error);
		}
	}
	async loadAsset(href,type,decompress = false) {
		try {
			const mime = {
				text: 'text/plain',
				html: 'text/html',
				json: 'application/json'
			}[type];
			const url = new URL(href,document.location.href);
			const options = {
				method: 'GET',
				headers: {
					'Document-Type': mime
				}
			}
			const response = await fetch(url,options);
			let content;
			switch (type) {
				case 'json':
					content = await response.json();
				default:
					content = await response.text();
					if (content.startsWith('<!DOCTYPE html>') == true) {
						content = await this.loadAsset('markup/404.html','text');
					}
			}
			return content;
		} catch(error) {
			console.error(error);
			return null;
		}
	}
	getElements(target) {
		const elements = target.querySelectorAll('a,button,form,*[id]');
		const collection = {};
		for (const element of elements) {
			switch (element.tagName) {
				case 'A':
					if (element.id) {
						collection[element.id] = element;
					}
				case 'BUTTON':
					if (element.form == null && element.target != '_blank') {
						element.addEventListener('click',this,false);
						if (element.id) {
							collection[element.id] = element;
						}
					}
					break;
				case 'FORM':
					element.addEventListener('submit',this,false);
					break;
				default:
					collection[element.id] = element;
			}
		}
		return collection;
	}
	updateElement(element,fragment = null) {
		while (element.lastChild) {
			element.removeChild(element.lastChild);
		}
		if (fragment) {
			element.append(fragment);
		}
		element.classList.remove('loading');
	}
	fillForm(form,data) {
		for (const input of form.elements) {
			const value = data[input.name];
			if (value !== undefined && value !== null) {
				switch (true) {
					case input.type == 'checkbox':
						input.checked = true;
						break;
					case Array.isArray(value):
						input.value = value.join(', ');
						break;
					default:
						input.value = value;
				}
			}
		}
	}
}

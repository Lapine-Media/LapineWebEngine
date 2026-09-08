
//import Site from './site.js';

export class Mail {
	constructor(env) {
		this.data = {
			api_key: env.MAIL_API_KEY,
			custom_headers: [],
			sender: null,
			subject: null,
			to: []
		};
	}
	from(name,mail) {
		const reply_to = {
			header: 'Reply-To',
			value: name+' <'+mail+'>'
		};
		this.data.sender = name+' <'+mail+'>';
		this.data.custom_headers.push(reply_to);
	}
	to(name,mail) {
		this.data.to.push(name+' <'+mail+'>');
	}
	text(content) {
		this.data.text_body = content;
	}
	async markup(env,file,replacements) {
		let template = await Site.getAsset(env,'/markup/mail/'+file+'.html','text');
		const words = Object.entries(replacements);
		for (let [key,value] of words) {
			key = key.toUpperCase();
			template = template.replaceAll('{'+key+'}',value);
		}
		this.data.html_body = template;
	}
	async send(subject) {
		this.data.subject = subject;
		const options = {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(this.data)
		};
		const request = new Request('https://api.smtp2go.com/v3/email/send',options);
		return await fetch(request);
	}
}

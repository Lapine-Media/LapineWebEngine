
import {Sitemap,Signals,Validation,Mail} from '../backend.js';

export default {
	send: function(request,env,input) {

		const validation = new Validation(input);

		validation.string('name',true);
		validation.mail('mail',true);
		validation.string('subject',true);
		validation.string('message',true);

		/*const response = await Site.getAsset(env,url,'markup/mail/apply.txt');
		const text = await response.text();
		const replace = {
			name: input.from_name,
			character: input.character
		};
		const mail = new Mail(env.MAIL_API_KEY);
		const content = mail.replace(text,replace);*/

		const mail = new Mail(env.MAIL_API_KEY);
		mail.from(input.name,input.mail);
		mail.to(Sitemap.data.site.mail_name,Sitemap.data.site.mail_address);
		mail.content(input.subject,input.message,true);

		/*const response = await mail.send();
		const data = await response.json();

		console.log(data);*/

		//if (response.ok) {

		console.log(mail.data);
		const test = true;
		if (test) {

			Signals.signal('success');

			return Signals.response(200,'OK');

		}

		Signals.signal('error');

		return Signals.response(400,'Error');

	}
}


import {Sitemap,Signals,Validation,Session,Mail} from '../backend.js';
import bcrypt from 'bcryptjs';

export default {
	register: async function(request,env,input) {

		const validation = new Validation(input);

		validation.mail('mail',true);
		validation.token('token',true);

		const query = 'SELECT user_name FROM user WHERE mail = ?1 LIMIT 1';
		const statement = env.USERS.prepare(query).bind(input.mail);
		const result = await statement.first();

		if (result != null) {

			Signals.signal('existing');

		} else {

			Signals.signal('success');

			const data = {
				mail: input.mail,
				context: input.token.context
			};
			const mail = new Mail(env);
			const words = {
				user_name: input.mail.split('@')[0],
				token_url: await Session.getToken(data,'register')
			}

			mail.from(Sitemap.data.site.mail_name,Sitemap.data.site.mail_address2);
			mail.to(words.user_name,input.mail);
			await mail.markup(env,'register',words);

			const response = await mail.send('Welcome to Kotteriet');

			if (response.ok != true) {

				const error = await response.json();

				console.log(error);

				Signals.signal('error');

				return Signals.response(500,'Mail error');

			}

		}

		return Signals.response(200,'OK');

	},
	confirm: async function(request,env,input) {

		const validation = new Validation(input);

		validation.string('token',true);
		validation.string('country',true);
		validation.string('ssn',true);
		validation.string('password',true);

		// verify token
		// log in

	},
	login: async function(request,env,input) {

		const validation = new Validation(input);

		validation.mail('mail',true);
		validation.string('password',true);

		const query = 'SELECT user.id, user_name, password, group_concat(tag.name) AS tags FROM user JOIN x_tag_and_user ON x_tag_and_user.user_id = user.id JOIN tag ON tag.id = x_tag_and_user.tag_id WHERE mail = ?1 LIMIT 1';
		const statement = env.USERS.prepare(query).bind(input.mail);
		const result = await statement.first();

		if (result.user_name != null) {
			const match = await bcrypt.compare(input.password,result.password);
			if (match) {

				Session.cookie = {
					user_name: result.user_name,
					user_id: result.id,
					tags: result.tags
				}

				Signals.signal('success',Session.cookie.user_name);

				return Signals.response(200,'OK');
			}
		}

		Signals.signal('denied');

		return Signals.response(401,'Unauthorized');

	},
	logout: function() {

		Signals.signal('success',Session.cookie.user_name);

		Session.cookie = null;

		return Signals.response(200,'OK');

	},
	extend: function() {

		const result = Session.conditions('session continue break');

		if (result == 'continue') {

			Signals.signal('success',Sitemap.data.site.session_timeout);

			return Signals.response(200,'OK');

		}

		Signals.signal('denied','session_expired');

		return Signals.response(401,'Unauthorized');

	},
	forgot: async function(request,env,input) {

		const validation = new Validation(input);

		validation.mail('mail',true);

		const query = 'SELECT user_name FROM user WHERE mail = ?1 LIMIT 1';
		const statement = env.USERS.prepare(query).bind(input.mail);
		const result = await statement.first();

		if (result != null) {

			const data = {mail: input.mail};
			const mail = new Mail(env);
			const words = {
				user_name: result.user_name,
				token_url: await Session.getToken(data,'reset')
			}

			mail.from(Sitemap.data.site.mail_name,Sitemap.data.site.mail_address2);
			mail.to(result.user_name,input.mail);
			await mail.markup(env,'forgot',words);

			const response = await mail.send('Forgot password');

			if (response.ok != true) {

				const error = await response.json();

				console.log(error);

				Signals.signal('error');

				return Signals.response(500,'Mail error');

			}

		}

		Signals.signal('success');

		return Signals.response(200,'Ok');

	},
	verify: async function(request,env,input) {

		const validation = new Validation(input);

		validation.string('token',true);

		const object = Session.verifyToken(input.token);

		if (object.error == false) {

			const query = 'UPDATE user SET verified_mail = 1 WHERE mail = ?1';
			const statement = env.USERS.prepare(query).bind(object.mail);

			await statement.exec(statement);

			Signals.signal('success',object);

			return Signals.response(200,'Ok');

		}

		Signals.signal(object.error);

		return Signals.response(400,'Bad data');

	},
	reset: async function(request,env,input) {

		const validation = new Validation(input);

		validation.mail('mail',true);
		validation.passwords('password','repeat');

		const password = await bcrypt.hash(input.password,10);
		const query = 'INSERT INTO user SET password = ?1 WHERE mail = ?2';
		const statement = env.USERS.prepare(query).bind(password,input.mail);

		await statement.exec(statement);

		Signals.signal('success');

		return Signals.response(200,'Ok');

	},
	profile: async function(request,env) {

		const result = Session.conditions('session continue break');

		if (result == 'continue') {

			const query = 'SELECT user_name,first_name,last_name,birthday,sign_up FROM user WHERE id = ?1';
			const statement = env.USERS.prepare(query).bind(Session.cookie.user_id);
			const result = await statement.first(statement);

			Signals.signal('success',result);

			return Signals.response(200,'Ok');

		}

		Signals.signal('denied',result);

		return Signals.response(401,'Unauthorized');

	},
	profile_settings: function() {

	},
	statistics_settings: function() {

	}
}

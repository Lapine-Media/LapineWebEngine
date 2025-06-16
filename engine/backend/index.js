#!/usr/bin/env node

import IO from './io.js';
import Server from './server.js';
import Policy from './policy.js';
import Project from './project.js';
import Sitemap from './sitemap.js';
import Cloudflare from './cloudflare.js';
import D1 from './d1.js';
import R2 from './r2.js';

const API = {
	policy: Policy,
	project: Project,
	sitemap: Sitemap,
	cloudflare: Cloudflare,
	d1: D1,
	r2: R2
}

export default new class {
	#server;
	constructor() {

		const args = process.argv.slice(3);
		const context = process.argv[2];

		if (context == 'ui') {
			this.runServer(...args);
		} else if (API[context] != undefined) {
			this.runAction(context,...args);
		} else {
			IO.console('error','Unknown command');
		}

	}
	runServer(port) {
		port = parseInt(port,10);
		this.#server = new Server(port);
	}
	runAction(context,name,value,data) {
		try {
			API[context](name,value,data);
		} catch (error) {
			IO.console('error',error);
			console.log(context,name,value,data);
		}
	}
}

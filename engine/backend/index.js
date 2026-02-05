#!/usr/bin/env node

import IO from './io.js';
import Server from './server.js';
import Policy from './policy.js';
import Project from './project.js';
import Manifest from './manifest.js';
import Sitemap from './sitemap.js';
import Cloudflare from './cloudflare.js';
import D1 from './d1.js';
import R2 from './r2.js';

const API = {
	policy: Policy,
	project: Project,
	manifest: Manifest,
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

		if (context == 'setup') {
			this.runAction('project','cli','setup');
		} else if (context == 'start') {
			this.runServer(...args);
		} else if (API[context] != undefined) {
			this.runAction(context,...args);
		} else {
			IO.console('begin');
			IO.console('reject','Unknown command: '+context);
			IO.console('normal','Use either "setup" or "start"');
			IO.console('end');
		}

	}
	runServer(port = '8789') {
		port = parseInt(port,10);
		this.#server = new Server(port);
	}
	runAction(context,name,value,data,id) {
		try {
			API[context](name,value,data,id);
		} catch (error) {
			IO.console('reject',error);
			console.log(context,name,value,data,id);
		}
	}
}

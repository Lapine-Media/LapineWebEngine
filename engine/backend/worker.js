
import IO from './io.js';
import Server from './server.js';
import Settings from './settings.js';
import { spawn } from 'child_process';

export default {
	data: null,
	instances: null,
	ports: {
		local: [3002,3003],
		remote: [3004,3005]
	},
	spawn: async function(location,data) {
		try {
			const ports = this.ports[location];
			const command = [
				'wrangler dev',
				Settings.paths.lapine+'/bin/editor.js',
				/*...{
					d1_databases: [
						data.remote ? '--remote' : '--local',
						data.preview ? '--preview' : null
					],
					r2_buckets: []
				}[data.type],*/

				'--'+location,
				'--ip 127.0.0.1',
				'--port '+ports[0],
				'--inspector-port '+ports[1],
				'--var context:'+data.type,
				'--define BINDING:"'+data.binding+'"',
				'--env',
				data.environment,
				'--cwd',
				Settings.paths.project,
				'--config',
				Settings.paths.project+'/wrangler.json'
			].filter(Boolean).join(' ');
			const parameters = command.split(' ');
			const options = {stdio: 'inherit'};
			const methods = {
				error: error => {
					IO.console('error',location+' error');
					const text = error.toString();
					console.log(text);
				},
				close: code => {
					IO.console('data',location+' closed');
					IO.signal('cloudflare','editor','stopped');
					console.log(code);
				}
			}
			IO.log('normal',command);
			const instance = spawn('npx',parameters,options);

			instance.on('error',methods.error);
			instance.on('close',methods.close);

			this.instances[location] = instance;

			const wrangler = await Settings.loadWrangler();
			const sp = {
				theme: 'systemPreferred',
				ws: '127.0.0.1:'+ports[1]+'/ws',
				domain: wrangler.name+'-'+data.environment,
				debugger: true
			}
			const url_params = new URLSearchParams(sp);

			return new URL('https://devtools.devprod.cloudflare.dev/js_app?'+url_params);
		} catch(error) {
			IO.log('reject',error);
			console.error(error);
			return {};
		}
	},
	start: async function(data) {
		this.data = data;
		this.instances = {};
		switch (data.type) {
			case 'd1_databases':
				this.data.local = await this.spawn('local',data);
				break;
			case 'r2_buckets':
				this.data.local = await this.spawn('local',data);
				this.data.remote = await this.spawn('remote',data);
				break;
		}
		return this.data;
	},
	stop: function() {
		if (this.instances) {
			const method = instance => {
				IO.console('log','Worker ('+instance.pid+') stopped.');
				instance.kill('SIGTERM');
			}
			Object.values(this.instances).forEach(method);
			this.instances = null;
			this.data = null;
		}
	},
	request: async function(location,href,body = null,attempt = 3) {
		const port = this.ports[location][0];
		const url = new URL(href,'http://127.0.0.1:'+port+'/');
		const options = {
			method: 'POST',
			body: body
		}
		switch (true) {
			case body === null:
			case body === undefined:
			case body instanceof FormData:
				break;
			default:
				options.body = JSON.stringify(body);
		}
		console.log('instanceof',options.body instanceof FormData);
		try {
			IO.log('normal',url.href);
			const response = await fetch(url,options);
			const json = await response.json();
			if (response.ok) {
				return json;
			}
			throw new Error(json.error);
		} catch (error) {
			if (error?.cause?.code == 'ECONNREFUSED') {
				if (attempt > 0) {
					IO.log('danger',location+' server busy, trying again...');
					await new Promise(resolve => setTimeout(resolve,1000));
					return await this.request(location,href,body,attempt-1);
				} else {
					IO.log('reject',location+' server not started.');
				}
			}
			throw error;
		}
	}
}

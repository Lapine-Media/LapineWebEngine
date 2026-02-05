
import IO from './io.js';
import Settings from './settings.js';
import { spawn } from 'node:child_process';
import path from 'node:path';
import Convert from 'ansi-to-html';

export default {
    data: null,
    instances: {},
	ports: {
        local: [3002, 3003],  // [HTTP, Inspector]
        remote: [3004, 3005]
    },
    spawn: async function(location, data) {
        try {
			const convert = new Convert();
            const ports = this.ports[location];
			const editorPath = path.join(Settings.paths.lapine, 'engine', 'backend', 'editor', 'index.js');
            const projectPath = Settings.paths.project;
            const configPath = path.join(projectPath, 'wrangler.json');
			const args = [
                'wrangler', 'dev',
                editorPath,
                '--ip', '127.0.0.1',
                '--port', String(ports[0]),
                '--inspector-port', String(ports[1]),
                '--cwd', projectPath,
                '--config', configPath,
                '--define', 'BINDING:"'+data.binding+'"',
                ...(location === 'remote' ? ['--remote'] : []),
                ...(data.preview ? ['--preview'] : [])
            ];
            const env = {
                ...process.env,
                CLOUDFLARE_API_TOKEN: await Settings.getAPIToken(),
                CI: 'true'
            };
			const command = args.join(' ');

			IO.log('normal', 'Starting '+location+' worker...');
			IO.log('inform', command);

            const spawnOptions = {
                env,
                stdio: ['ignore', 'pipe', 'pipe']
			};
            const instance = spawn('npx', args, spawnOptions);
			const stdout = chunk => {
                const string = chunk.toString();
				IO.log('normal',string);
			};
			const stderr = chunk => {
				const string = chunk.toString();
                if (string.includes('Error') || string.includes('error')) {
					const html = convert.toHtml(string);
					IO.log('danger',html);
                }
			};
			const close = code => {
				IO.log('normal', location+' worker stopped (Code '+code+')');
				if (this.instances && this.instances[location] === instance) {
                    delete this.instances[location];
                    if (Object.keys(this.instances).length === 0) {
                        IO.signal('cloudflare', 'editor', 'stopped');
                    }
                }
            }

            instance.stdout.on('data',stdout);
            instance.stderr.on('data', stderr);
            instance.on('close', close);
            this.instances[location] = instance;

            return {
				url: 'http://127.0.0.1:'+ports[0],
				inspector: '127.0.0.1:'+ports[1]
            };

        } catch (error) {
			IO.log('reject', 'Failed to spawn '+location+' editor: '+error.message);
            return null;
        }
    },
    start: async function(data) {
        this.data = data;
        this.instances = {};
        const results = {};
		switch (data.binding_path) {
            case 'd1_databases':
				results.local = await this.spawn('local', data);
                break;
            case 'r2_buckets':
                results.local = await this.spawn('local', data);
                results.remote = await this.spawn('remote', data);
                break;
        }
        return results;
    },
    stop: function() {
        if (!this.instances) return;
		const method = ([location, instance]) => {
            if (instance && !instance.killed) {
				IO.log('normal', 'Stopping '+location+' worker...');
				instance.kill('SIGTERM');
            }
        }
        Object.entries(this.instances).forEach(method);
        this.instances = {};
        this.data = null;
    },
    request: async function(location, href, body = null, attempt = 1) {
		if (!this.ports[location]) throw new Error('Invalid location: '+location);

        const port = this.ports[location][0];
		const url = new URL(href, 'http://127.0.0.1:'+port+'/');

        const options = {
            method: 'POST',
            headers: {}
        };

		if (body !== null && body !== undefined) {
            if (body instanceof FormData) {
                options.body = body;
            } else {
                options.body = JSON.stringify(body);
                options.headers['Content-Type'] = 'application/json';
            }
        }

        try {
            const response = await fetch(url, options);
			const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const json = await response.json();
                if (!response.ok) throw new Error(json.error || 'Worker Error');
                return json;
            } else {
                const text = await response.text();
                if (!response.ok) throw new Error(text);
                return { result: text };
            }

        } catch (error) {
            if (error.cause?.code === 'ECONNREFUSED' && attempt <= 5) {
				if (attempt === 1) IO.log('normal', 'Waiting for '+location+' worker...');
				const promise = resolve => setTimeout(resolve, 1000);
				await new Promise(promise);
                return this.request(location, href, body, attempt + 1);
            }

            throw error;
        }
    }
}

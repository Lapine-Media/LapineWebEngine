
import IO from './io.js';
import Settings from './settings.js';
import Paths from './paths.js';
import { spawn } from 'node:child_process';
import Convert from 'ansi-to-html';

export default {
    data: null,
    instances: {},
    ports: {
        local:  [3002, 3003],
        remote: [3004, 3005]
    },

    worker: async function(location, data) {

		const convert = new Convert();
        const ports = this.ports[location];
        const binding = data.binding || data.name;
        const command = [
            'npx', 'wrangler', 'dev',
            Paths.join(Paths.folders.engine.editor, data.binding_path + '.js'),
            '--ip', '127.0.0.1',
            '--port', ports[0],
            '--inspector-port', ports[1],
            '--cwd', Paths.folders.project.working,
            '--config', Paths.files.wrangler.working,
            '--var', 'context:' + data.binding_path,
            '--var', 'binding:' + binding,
            ...(data.binding_environment !== 'top' ? ['--env', data.binding_environment] : []),
            ...(location === 'remote' ? ['--remote'] : []),
            ...(data.preview ? ['--preview'] : [])
        ].join(' ');

		const options = {
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                CLOUDFLARE_API_TOKEN: await Settings.getAPIToken(),
                CI: 'true'
            }
        };
		const worker = (resolve, reject) => {
            IO.log('normal', 'Starting ' + location + ' worker...');
            IO.log('inform', command);

			const instance = spawn(command, options);
			let resolved = false;

            const stdout = chunk => {
                const string = chunk.toString();
				if (string.includes('Ready on') && !resolved) {
                    resolved = true;
					const object = {
                        url: 'http://127.0.0.1:' + ports[0],
                        inspector: '127.0.0.1:' + ports[1],
                        instance
					};
                    resolve(object);
                }
				IO.sideLog('normal', string, false);
            };

			// Known wrangler startup noise that should not be logged as errors
			const isWranglerInfo = string => {
				const check = p => p.test(string);
				return [
				    /Starting inspector server/,
				    /Starting local server/,
				    /Ready on/,
					/Waiting for/,
					/\[wrangler\]/,
				    /Using vars/,
				].some(check);
			};

            const stderr = chunk => {
                const string = chunk.toString();
                const html = convert.toHtml(string);
				//const info = isWranglerInfo(string);
				IO.sideLog('normal', html, false);
				/*if (info) {
                    IO.log('normal', html);
                } else {
                    IO.log('reject', html);
				}*/
            };

            const close = code => {
                IO.log('normal',location+' worker stopped (Code '+code+')');
                if (!resolved) {
                    const error = new Error(location + ' worker exited before becoming ready (Code '+code+')');
                    reject(error);
                }
                if (this.instances?.[location] === instance) {
                    delete this.instances[location];
                    if (Object.keys(this.instances).length === 0) {
                        IO.signal('environments', 'editor', 'closed');
                    }
                }
            };

			const error = error => {
                IO.log('reject', 'Spawn error: ' + error.message);
                if (!resolved) reject(error);
            };

            instance.stdout.on('data', stdout);
            instance.stderr.on('data', stderr);
            instance.on('close', close);
            instance.on('error', error);

            this.instances[location] = instance;
        }

        return new Promise(worker);

    },
    start: async function(data) {
        this.data = data;
        this.instances = {};
        const results = {};
        try {
            switch (data.binding_path) {
                case 'd1_databases':
                    results.local = await this.worker('local', data);
                    break;
                case 'r2_buckets':
                    results.local = await this.worker('local', data);
                    results.remote = await this.worker('remote', data);
                    break;
                default:
                    throw new Error('Unknown binding path: ' + data.binding_path);
            }
        } catch (error) {
            IO.log('reject', 'Failed to start worker: ' + error.message);
            this.stop();
            throw error;
        }
        return results;
    },

    stop: function() {
        if (!this.instances) return;
		const entries = Object.entries(this.instances);
        for (const [location, instance] of entries) {
            if (instance && !instance.killed) {
                IO.log('normal', 'Stopping ' + location + ' worker...');
                instance.kill('SIGTERM');
            }
        }
        this.instances = {};
        this.data = null;
    },

    request: async function(location, href, body = null, attempt = 1) {

		if (!this.ports[location]) {
			throw new Error('Invalid location: ' + location);
		}

        const port = this.ports[location][0];
        const url = new URL(href, 'http://127.0.0.1:' + port + '/');

		if (attempt === 1) {
			IO.log('normal', 'Requesting ' + url);
		}

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

			switch (response.status) {
				case 200:
					return await response.json();
				case 400:
					const data = await response.json();
					IO.log('reject',data.error);
					return data;
			}

			const message = await response.text();
			const error = new Error(message);
			error.origin = 'worker';
			error.name = response.statusText;
			error.status = response.status;

			throw error;

        } catch (error) {
            if (error.cause?.code === 'ECONNREFUSED') {
				if (attempt === 1) {
					IO.log('normal', 'Waiting for ' + location + ' worker...');
				} else if (attempt >= 6) {
                    IO.log('reject', 'Connection failed after ' + attempt + ' attempts.');
                    throw error;
                }
                IO.log('normal', 'Attempt ' + attempt);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.request(location, href, body, attempt + 1);
            }
            if (!error.origin) {
				error.origin = 'fetch';
			}
            throw error;
        }
    }
}


import Index from './index.js';
import IO from './io.js';
import Worker from './worker.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { WebSocketServer } from 'ws';
import open from 'open';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assets = {
	paths: {
		'/': 'markup/index.html',
		'/favicon.ico': 'graphics/bunny.svg'
	},
	types: {
		'.html': 'text/html',
		'.js': 'application/javascript',
		'.css': 'text/css',
		'.svg': 'image/svg+xml'
	}
}

export default class Server {
	#host;
	#port;
	#methods;
	#server;
	#wss;
	constructor(port) {

		this.#host = '127.0.0.1';
		this.#port = port || 3000;
		this.#methods = {
			fetch: this.fetch.bind(this),
			start: this.start.bind(this),
			stop: this.stop.bind(this),
			connection: this.connection.bind(this),
			close: this.close.bind(this),
			error: this.error.bind(this)
		}

		const settings = {
			host: this.#host,
			port: this.#port+1
		};

		this.#server = http.createServer(this.#methods.fetch);
		this.#wss = new WebSocketServer(settings);

		this.#server.listen(this.#port,this.#host,this.#methods.start);
		this.#wss.on('connection',this.#methods.connection);

	}
	path(url) {
		const urlPath = assets.paths[url] || url;
		return path.join(__dirname,'../frontend/'+urlPath);
	}
	fetch(request,response) {

		try {

			const filePath = this.path(request.url);
			const parsed = path.parse(filePath);
			const stream = fs.createReadStream(filePath);

			stream.on('error', console.log);

			const stat = fs.statSync(filePath);
			const options = {
				'Content-Type': assets.types[parsed.ext],
				'Content-Length': stat.size
			}

			response.writeHead(200,options);

			stream.pipe(response);

		} catch (error) {
			response.writeHead(404, {'Content-Type': 'text/plain'});
			response.write('Missing: '+request.url);
			response.end();
		}

	}
	async start() {
		const url = 'http://'+this.#host+':'+this.#port;
		IO.console('log','////////// LAPINE WEB ENGINE //////////',true);
		IO.console('log','Server started at '+url);
		await open(url);
	}
	stop() {
		Worker.stop();
		IO.console('log','Server on port '+this.#port+' closed successfully.');
		process.exit();
	}
	close() {
		//IO.console('log','Client disconnected');
		if (this.#wss.clients.size == 0) {
			const timeout = () => {
				if (this.#wss.clients.size == 0) {
					IO.console('log','All instances closed, shutting down...');
					this.#server.close(this.#methods.stop);
				}
			}
			setTimeout(timeout,3000);
		} else if (this.#wss.clients.size == 1) {
			IO.signal('index','state','none');
		}
	}
	error(error) {
		IO.console('error',error);
	}
	getSignal(context,name,value,data = null) {
		const response = {context,name,value,data};
		return JSON.stringify(response);
	}
	connection(ws) {

		IO.clients = this.#wss.clients;
		//IO.console('log','Client connected');

		if (this.#wss.clients.size > 1) {
			IO.console('log','Multiple clients detected');
			IO.broadcast('index','state','multiple');
		}

		const message = async json => {
			try {
				const {context,name,value,data} = JSON.parse(json);
				const method = () => Index.runAction(context,name,value,data);
				const store = {
					requestId: crypto.randomUUID()
				};
				IO.store.run(store,method);
			} catch (error) {
				IO.console('error',error);
			}
		}

		ws.on('message',message);
		ws.on('close',this.#methods.close);
		ws.on('error',this.#methods.error);
	}
}

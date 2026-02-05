
import Index from './index.js';
import IO from './io.js';
import Settings from './settings.js';
import { Tools } from './tools.js';
import Worker from './worker.js';
import http from 'http';
import fs from 'fs';
import { default as Path } from 'path';
import url from 'url';
import { WebSocketServer } from 'ws';
import open from 'open';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

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
	streamFile(filePath, response) {
        const ext = Path.extname(filePath).toLowerCase();
		const contentType = Tools.mimes[ext] || 'application/octet-stream';
		const stream = fs.createReadStream(filePath);
		const open = () => {
			const headers = {'Content-Type': contentType};
            response.writeHead(200,headers);
            stream.pipe(response);
		};
		const error = e => {
			if (e.code === 'ENOENT') {
                response.writeHead(404);
				response.end('Not Found: '+filePath);
            } else {
				IO.console('reject','Stream Error: '+e);
                response.writeHead(500);
                response.end('Internal Error');
            }
		}
		stream.on('open', open);
		stream.on('error',error);
    }
	fetch(request, response) {
        const reqUrl = new URL(request.url, 'http://'+request.headers.host);
		let filePath;
		switch (reqUrl.pathname) {
			case '/':
				filePath = Path.join(__dirname, '../frontend/markup/index.html');
				break;
			case '/favicon.ico':
				filePath = Path.join(__dirname, '../frontend/graphics/bunny.svg');
				break;
			case '/local-image':
				filePath = reqUrl.searchParams.get('path');
				if (!filePath) {
	                response.writeHead(400);
	                response.end('Missing path');
	                return;
	            }
				filePath = filePath.replace('./graphics',Settings.paths.pwa+'/graphics');
				break;
			default:
				const safePath = Path.normalize(reqUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
				filePath = Path.join(__dirname, '../frontend', safePath);
		}
		this.streamFile(filePath, response);
    }
	async start() {
		const url = 'http://'+this.#host+':'+this.#port;
		IO.console('begin');
		IO.console('normal','Server started at '+url);
		await open(url);
	}
	stop() {
		Worker.stop();
		IO.console('normal','Server on port '+this.#port+' closed successfully.');
		IO.console('end');
		process.exit();
	}
	close() {
		//IO.console('normal','Client disconnected');
		if (this.#wss.clients.size == 0) {
			const timeout = () => {
				if (this.#wss.clients.size == 0) {
					IO.console('normal','All instances closed, shutting down...');
					this.#server.close(this.#methods.stop);
				}
			}
			setTimeout(timeout,3000);
		} else if (this.#wss.clients.size == 1) {
			IO.signal('index','state','none');
		}
	}
	error(error) {
		IO.console('reject',error);
	}
	connection(ws) {

		IO.clients = this.#wss.clients;
		//IO.console('normal','Client connected');

		if (this.#wss.clients.size > 1) {
			IO.console('normal','Multiple clients detected');
			IO.broadcast('index','state','multiple');
		}

		const message = json => IO.receiveMessage(json);

		ws.on('message',message);
		ws.on('close',this.#methods.close);
		ws.on('error',this.#methods.error);
	}
}

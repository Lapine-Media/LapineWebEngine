
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { WebSocketServer } from 'ws';
import open from 'open';

const host = '127.0.0.1';
const port = 3000;
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const assets = {
	'/': 'markup/index.html',
	'/favicon.ico': 'graphics/bunny.svg'
}

const types = {
	'.html': 'text/html',
	'.js': 'application/javascript',
	'.css': 'text/css',
	'.svg': 'image/svg+xml'
}

const backend = {
	fetch: function(request,response) {

		const urlPath = assets[request.url] || request.url;
		const filePath = path.join(__dirname,urlPath);
		const parsed = path.parse(filePath);
		const stream = fs.createReadStream(filePath);
		const stat = fs.statSync(filePath);
		const options = {
			'Content-Type': types[parsed.ext],
			'Content-Length': stat.size
		}

		response.writeHead(200,options);
		stream.pipe(response);

	},
	open: async function() {
		await open('http://'+host+':'+port);
	},
	close: function() {
		console.log('Server on port '+port+' closed successfully');
		process.exit();
	}
}

const settings = {
	host: host,
	port: port+1
};
const server = http.createServer(backend.fetch);
const wss = new WebSocketServer(settings);

const connection = function(ws) {

	console.log('Client connected');

	const message = function(message) {
		ws.send('Server received: '+message);
	}

	const close = function() {
		console.log('Client disconnected');
		if (wss.clients.size == 0) {
			server.close(backend.close);
		}
	}

	const error = function(error) {
		console.log(error);
	}

	ws.on('message',message);
	ws.on('close',close);
	ws.on('error',error);

}

server.listen(port,host,backend.open);
wss.on('connection',connection);

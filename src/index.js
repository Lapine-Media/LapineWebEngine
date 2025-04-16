
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

const backend = {
	fetch: function(request,response) {

		console.log(request.url);

		const filePath = path.join(__dirname, 'markup/index.html');
		const stream = fs.createReadStream(filePath);
	    const stat = fs.statSync(filePath);
		const options = {
			'Content-Type': 'text/html',
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

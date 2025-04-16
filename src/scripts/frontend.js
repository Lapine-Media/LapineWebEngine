
const ws = new WebSocket('ws://127.0.0.1:3001');

ws.onopen = () => {
	console.log('Connected to server');
};

ws.onmessage = (event) => {
	console.log('ws.onmessage',event.data);
};

ws.onclose = () => {
	console.log('Disconnected from server');
};

const method = async function() {
	console.log('Hello');
	ws.send('ws.send Hello');
	const url = new URL('/dosomething',document.location.href);
	const options = {
		method: 'GET',
		headers: {
			'document-type': 'text/html'
		}
	}
	const response = await fetch(url,options);
	console.log(response);
}

const test = document.getElementById('test');

test.addEventListener('click',method,false);

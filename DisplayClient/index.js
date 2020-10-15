var hr = document.getElementById("hr")
var isConnected = false;

function connect() {
	var socket = new WebSocket("ws://localhost:9288");

	socket.addEventListener('open', function()  {
		socket.send(JSON.stringify({type: "handshake", role: "display"}));
		isConnected = true;
	});
	socket.addEventListener('close', function()  {
		hr.innerText = "0"
		isConnected = false;
	});
	socket.addEventListener('error', function(evt)  {
		hr.innerText = "0"
		isConnected = false
	});
	socket.addEventListener('message', function (event) {
	    var message = JSON.parse(event.data)
	    hr.innerText = message.hr
	});
}

setInterval(() => {
	if (isConnected === false) {
		connect()
	}
}, 10000)
connect()
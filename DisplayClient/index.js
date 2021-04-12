const hr = document.getElementById("hr")
const heartImg = document.getElementById("pulsingheart")
let isConnected = false;

const params = new URLSearchParams(window.location.search);
const ip = params.get("ip") || "localhost";

function connect() {
	var socket = new WebSocket(`ws://${ip}:9288`);

	socket.addEventListener('open', function()  {
		socket.send(JSON.stringify({type: "handshake", role: "display"}));
		isConnected = true;
	});
	socket.addEventListener('close', resetConnection);
	socket.addEventListener('message', function (event) {
		var message = JSON.parse(event.data);
		if (message.hr) {
			hr.innerText = message.hr;
			var spb = 1/(message.hr/60)
			heartImg.style.animation = "pulse " + spb + "s infinite"
		}
	});
}

function resetConnection() {
	hr.innerText = "0";
	heartImg.style.animation = "";
	isConnected = false;
}

setInterval(() => {
	if (isConnected === false) {
		connect();
	}
}, 10000);

connect();
const hr = document.getElementById("hr")
const heartImg = document.getElementById("pulsingheart")
let isConnected = false;
let currentHR = 0;

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
			let spb = 1/(message.hr/60);
			if (currentHR == 0) heartImg.style.animation = "pulse " + spb + "s infinite";
			hr.innerText = message.hr;
			currentHR = message.hr;
		}
	});
	heartImg.addEventListener('animationiteration', () => {
		let spb = 1/(currentHR/60);
		heartImg.style.animation = "pulse " + spb + "s infinite";
	});
}

function resetConnection() {
	hr.innerText = "0";
	heartImg.style.animation = "";
	currentHR = 0
	isConnected = false;
}

setInterval(() => {
	if (isConnected === false) {
		connect();
	}
}, 10000);

connect();
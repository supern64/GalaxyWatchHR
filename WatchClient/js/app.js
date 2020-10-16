(function (t) {
	// constants
	const healthPriv = "http://tizen.org/privilege/healthinfo";
	const locPriv = "http://tizen.org/privilege/location";
	
	// declare some stuff
	var ws = null;
	var intervalID = null;
	var currentHR = 0;
	var hasHealthP = false;
	var hasLocationP = false;
	
	// helper functions
	function changePage(page) {
		window.location.href = "#" + page;
	}
	
	function exit() {
		tizen.application.getCurrentApplication().exit();
	}
	window.exit = exit;
	
	// permission handling/events
	function simplifyPerms(s) {
		switch(s) {
			case "PPM_ALLOW":
				return true;
			case "PPM_DENY":
				return "deny";
			case "PPM_ASK":
				return false;
		}
	}
	
	function simplifyWrittenPerms(s) {
		if (s === "PPM_ALLOW" || s === "PPM_ALLOW_FOREVER") {
			return true;
		} else if (s === "PPM_DENY") {
			return false;
		} else if (s === "PPM_DENY_FOREVER") {
			return "deny";
		}
	}
	
	function checkInitialPermissions() {
		var health = simplifyPerms(tizen.ppm.checkPermission(healthPriv));
		var location = simplifyPerms(tizen.ppm.checkPermission(locPriv));
		var toAsk = [];
		if (health === "deny" || location === "deny") {
			return false;
		}
		if (health === false) {
			toAsk.push("health");
		}
		if (location === false) {
			toAsk.push("location");
		}
		if (toAsk.length === 0) {
			return true;
		} else {
			return toAsk;
		}
	}
	
	function checkPermissions() {
		if (hasHealthP === "deny" || hasLocationP === "deny") {
			return "deny";
		} else {
			return hasHealthP && hasLocationP;
		}
	}
	
	function onPermissionSubmit(result, permission) {
		if (permission === healthPriv) {
			hasHealthP = simplifyWrittenPerms(result);
		} else if (permission === locPriv) {
			hasLocationP = simplifyWrittenPerms(result);
		}
		var tPerms = checkPermissions();
		if (tPerms === "deny") {
			changePage("noPermission");
			return;
		} else if (tPerms === true) {
			init();
		} else {
			t.openPopup("#notEnoughPerm");
		}
	}
	
	function onPermissionError(e) {
		changePage("generalError");
		console.log(e);
	}
	
	function requestPermissions(t) {
		if (t.includes("health")) {
			tizen.ppm.requestPermission(healthPriv, onPermissionSubmit, onPermissionError);
		}
		if (t.includes("location")) {
			tizen.ppm.requestPermission(locPriv, onPermissionSubmit, onPermissionError);
		}
	}
	
	// heart rate event
	function onHR(hr) {
		hr = hr.heartRate;
		if (hr < 0) {
			hr = 0;
		}
		currentHR = hr;
	}
	
	// button/misc. events
	window.addEventListener("tizenhwkey", function (ev) {
		var activePopup = null,
			page = null,
			pageId = "";

		if (ev.keyName === "back") {
			activePopup = document.querySelector(".ui-popup-active");
			page = document.getElementsByClassName("ui-page-active")[0];
			pageId = page ? page.id : "";

			if (pageId === "main" && !activePopup) {
				try {
					exit();
					// TODO: handle connection cases on app exit
				} catch (ignore) {}
			} else {
				window.history.back();
			}
		}
	});
	document.getElementById('notEnoughPerm-cancel').addEventListener('click', function() {
		t.closePopup();
		var toAsk = checkInitialPermissions();
		requestPermissions(toAsk);
	});
	function connect() {
		var address = document.getElementById("address").value;
		var message = document.getElementById("message");
		if (address.replace(" ", "").length > 0) {
			ws = new WebSocket("ws://" + address + ":9288");
			ws.addEventListener("open", function() {
				ws.send(JSON.stringify({type: "handshake", role: "watch"}));
				tizen.humanactivitymonitor.start("HRM", onHR);
				intervalID = setInterval(function() {
					if (ws.readyState === 1) {
						ws.send(JSON.stringify({type: "data", hr: currentHR}));
						document.getElementById("heart-rate").innerText = currentHR;
					}
				}, 1000);
				changePage("display");
			});
			ws.addEventListener("close", function() {
				message.classList.remove("cl-red");
				message.innerText = "Disconnected.";
				clearInterval(intervalID);
				tizen.humanactivitymonitor.stop("HRM");
				changePage("connect");
			});
			
		} else {
			message.classList.add('cl-red');
			message.innerText = "Please enter an address.";
		}
	}
	function disconnect() {
		ws.close();
	}
	window.connect = connect;
	window.disconnect = disconnect;
	
	// main
	function init() {
		changePage("connect");
	}
	
	const isSupported = tizen.systeminfo.getCapability("http://tizen.org/feature/sensor.heart_rate_monitor");
	if (!isSupported) {
		changePage("notCompatible");
	} else {
		var toAsk = checkInitialPermissions();
		if (toAsk === false) {
			changePage("noPermission");
		} else if (toAsk === true) {
			init();
		} else {
			requestPermissions(toAsk);
		}
	}
	
	
}(tau));
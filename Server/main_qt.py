# QtServer
from websocket_server import WebsocketServer
import pyqtgraph as pg
from pyqtgraph.Qt import QtCore
import threading
import datetime as dt
import json

app = pg.QtGui.QApplication([])

peak = 0
y_hr = []
x_time = []

pg.setConfigOptions(antialias=True) 
view = pg.GraphicsLayoutWidget(title="HR2PC QTRewrite")
p = view.addPlot(title='<h2 style="color:white;">Heart Rate Monitor</h2>')
curve = p.plot()

view.show()

app.aboutToQuit.connect(exit)

def update():
    curve.setData(y_hr)
    if len(x_time) != 0:
        curve.setPos(x_time[-1], 0)
        title = '<h3 style="color:white;">Current: {0} | Average: {1} | Peak: {2}</h3>'
        p.setTitle(title.format(y_hr[-1], round(sum(y_hr)/len(y_hr)), max(y_hr)))
    app.processEvents()


def on_join(client, server):
    print("Client @ " + client["address"][0] + " connected.")

def on_leave(client, server):
    if client["type"] == "watch":
        for client in server.clients:
                if "type" in client and client["type"] == "display":
                    server.send_message(client, json.dumps({"type": "data", "hr": 0}))
        x_time = []
        y_hr = []
    print("Client @ " + client["address"][0] + " disconnected.")

def on_message(client, server, message):
    send_res = True
    try:
        message = json.loads(message)
    except json.JSONDecodeError:
        print("Message from " + client["address"][0] + " could not be decoded.")
    res = {}
    if "type" not in message:
        res = {"type": "error", "message": "NO_MESSAGE_SPECIFIED"}
    elif message["type"] == "handshake":
        if "role" not in message:
            res = {"type": "error", "message": "NO_ROLE_SPECIFIED"}
        elif message["role"] not in ["watch", "display"]:
            res = {"type": "error", "message": "INVALID_CLIENT_TYPE"}
        else:
            client["type"] = message["role"]
            print("Client @ " + client["address"][0] + " registered as type '" + client["type"] + "'")
            res = {"type": "success"}
    elif message["type"] == "data":
        if "type" not in client:
            res = {"type": "error", "message": "UNREGISTERED_CLIENT"}
        elif client["type"] != "watch":
            res = {"type": "error", "message": "UNINTENDED_OPERATION"}
        elif "hr" not in message:
            res = {"type": "error", "message": "NO_DATA"}
        else:
            send_res = False
            hr = message["hr"]
            if hr < 0:
                hr = 0
            if hr != 0:
                y_hr.append(int(hr))
                if len(x_time) == 0:
                    x_time.append(1)
                else:
                    x_time.append(x_time[-1]+1)
            for client in server.clients:
                if "type" in client and client["type"] == "display":
                    server.send_message(client, json.dumps({"type": "data", "hr": hr}))
    else:
        res = {"type": "error", "message": "INVALID_MESSAGE_TYPE"}
    if send_res is True:
        if res["type"] == "error":
            print("Client triggered an error: " + res["message"])
            print("With message: " + json.dumps(message))
        server.send_message(client, json.dumps(res))
    else:
        send_res = True

def run_server():
    server = WebsocketServer(9288, host="0.0.0.0")
    server.set_fn_new_client(on_join)
    server.set_fn_client_left(on_leave)
    server.set_fn_message_received(on_message)
    print("Bridge server ready.")
    server.run_forever()

if __name__ == '__main__':
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    timer = QtCore.QTimer()
    timer.timeout.connect(update)
    timer.start(20)
    app.exec_()
    
    




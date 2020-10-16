from websocket_server import WebsocketServer
import matplotlib.animation as animation
import matplotlib.pyplot as plt
import threading
import datetime as dt
import json

peak = 0
y_hr = []
x_time = []

plt.style.use('dark_background')
fig = plt.figure("GalaxyWatchHR v1.0.0")
ax = fig.add_subplot(1, 1, 1)
plt.rc("axes", titlesize=16)

def on_animation(i, x_time, y_hr):
    x_time = x_time[-100:]
    y_hr = y_hr[-100:]
    real_hr = list(filter(lambda x: 10 < x < 220, y_hr))

    if len(real_hr) != 0:
        average_hr = round(sum(real_hr)/len(real_hr))
    else:
        average_hr = 0

    ax.clear()
    ax.plot(x_time, y_hr)

    try:
        hr = y_hr[-1]
    except IndexError:
        hr = 0

    plt.xticks(rotation=90, fontsize=8)
    plt.title('Heart Rate Monitor\nCurrent: ' + str(hr) + " Average: " + str(average_hr))
    plt.ylabel('Heart Rate (bpm)')


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
                y_hr.append(hr)
                x_time.append(dt.datetime.now().strftime("%H:%M:%S.%f")[:-5])
            for client in server.clients:
                if "type" in client and client["type"] == "display":
                    server.send_message(client, json.dumps({"type": "data", "hr": hr}))
    else:
        res = {"type": "error", "message": "INVALID_MESSAGE_TYPE"}
    if send_res is True:
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
    ani = animation.FuncAnimation(fig, on_animation, fargs=(x_time, y_hr), interval=1000)
    plt.show()


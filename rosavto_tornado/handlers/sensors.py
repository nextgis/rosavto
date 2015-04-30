import tornado.ioloop
import tornado.web
from threading import Timer
from tornado.websocket import WebSocketHandler


class SensorsHandler(WebSocketHandler):
    def open(self):
        Timer(60, self.on_message).start()
        print("WebSocket opened")

    def on_message(self, message):
        self.write_message(u'You said: ' + '1')

    def on_close(self):
        print("WebSocket closed")
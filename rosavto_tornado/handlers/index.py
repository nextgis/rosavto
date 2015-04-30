import tornado.ioloop
import tornado.web


class IndexHandler(tornado.web.RequestHandler):
    def get(self):
        self.write('Tornado application for rosavto. Welcome.')
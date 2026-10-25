#!/usr/bin/env python3
# Sentinel Earth local server. Always sends "no cache" so the browser never
# serves a stale app.js / events.json after you update the site.
import http.server, os, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.html': 'text/html; charset=utf-8',
        '.js':   'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
    }
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a):
        pass

print('Sentinel Earth serving on http://localhost:%d  (no-cache). Keep this window open.' % PORT)
try:
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
except KeyboardInterrupt:
    pass

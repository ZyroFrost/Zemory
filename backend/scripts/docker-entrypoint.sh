#!/bin/sh
# zemory container entry (docs/plan/30 §3h): a virtual display for the web-capture browser, a VNC view of it served as a
# web page on port 6080 (the sign-in window is opened there), then the daemon. The chat sites refuse a headless browser
# (Cloudflare "Just a moment..."), so the browser draws on Xvfb like a real window.
set -e
export DISPLAY="${DISPLAY:-:99}"
Xvfb "$DISPLAY" -screen 0 1360x1024x24 -nolisten tcp >/dev/null 2>&1 &
# the view of that display: VNC on the container's loopback, published to the browser by websockify + noVNC
x11vnc -display "$DISPLAY" -localhost -rfbport 5900 -forever -shared -nopw -quiet >/dev/null 2>&1 &
websockify --web /usr/share/novnc 0.0.0.0:6080 127.0.0.1:5900 >/dev/null 2>&1 &
exec "$@"

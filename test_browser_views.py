import subprocess
import time
import json
import base64
import os
import httpx
import websockets
import asyncio

async def capture_views():
    chrome_cmd = [
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        '--headless=new',
        '--remote-debugging-port=9223',
        '--disable-gpu',
        '--no-sandbox',
        '--window-size=1280,950',
        'http://127.0.0.1:5173'
    ]
    proc = subprocess.Popen(chrome_cmd)
    time.sleep(2)

    try:
        tabs = httpx.get('http://127.0.0.1:9223/json').json()
        target_tab = None
        for t in tabs:
            if '5173' in t.get('url', ''):
                target_tab = t
                break
        if not target_tab:
            target_tab = tabs[0]

        ws_url = target_tab['webSocketDebuggerUrl']

        async with websockets.connect(ws_url) as ws:
            msg_id = 1

            async def send_cmd(method, params=None):
                nonlocal msg_id
                cid = msg_id
                msg_id += 1
                await ws.send(json.dumps({'id': cid, 'method': method, 'params': params or {}}))
                while True:
                    resp = await ws.recv()
                    data = json.loads(resp)
                    if data.get('id') == cid:
                        return data.get('result', {})

            await send_cmd('Page.enable')
            await send_cmd('Runtime.enable')

            # Wait a moment for app to fully render
            await asyncio.sleep(1.5)

            # 1. Switch to Dashboard view
            await send_cmd('Runtime.evaluate', {
                'expression': 'document.querySelectorAll("nav button")[1].click()'
            })
            await asyncio.sleep(1)

            # Capture Dashboard screenshot
            dash_shot = await send_cmd('Page.captureScreenshot')
            if 'data' in dash_shot:
                with open('dashboard_screenshot.png', 'wb') as f:
                    f.write(base64.b64decode(dash_shot['data']))
                print('Captured dashboard_screenshot.png')

            # 2. Switch to Trip Builder view
            await send_cmd('Runtime.evaluate', {
                'expression': 'document.querySelectorAll("nav button")[2].click()'
            })
            await asyncio.sleep(1)

            # Capture Builder screenshot
            builder_shot = await send_cmd('Page.captureScreenshot')
            if 'data' in builder_shot:
                with open('builder_screenshot.png', 'wb') as f:
                    f.write(base64.b64decode(builder_shot['data']))
                print('Captured builder_screenshot.png')

            # 3. Fill destination 'Kyoto' and submit
            await send_cmd('Runtime.evaluate', {
                'expression': '''
                (function() {
                    const input = document.querySelector('input[placeholder*="Kyoto"]');
                    if (input) {
                        input.value = "Kyoto, Japan";
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                })()
                '''
            })
            await asyncio.sleep(0.5)

    finally:
        proc.terminate()

if __name__ == '__main__':
    asyncio.run(capture_views())

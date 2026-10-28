import subprocess
import time
import json
import base64
import httpx
import websockets
import asyncio

async def capture_views():
    chrome_cmd = [
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        '--headless=new',
        '--remote-debugging-port=9225',
        '--disable-gpu',
        '--no-sandbox',
        '--window-size=1280,1050',
        'http://127.0.0.1:5173'
    ]
    proc = subprocess.Popen(chrome_cmd)
    time.sleep(2.5)

    try:
        tabs = httpx.get('http://127.0.0.1:9225/json').json()
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

            # Wait for app render
            await asyncio.sleep(2)

            # Go to dashboard
            await send_cmd('Runtime.evaluate', {
                'expression': 'document.querySelectorAll("nav button")[1].click()'
            })
            await asyncio.sleep(2)

            # Dashboard screenshot
            dash_shot = await send_cmd('Page.captureScreenshot')
            if 'data' in dash_shot:
                with open('dashboard_screenshot.png', 'wb') as f:
                    f.write(base64.b64decode(dash_shot['data']))
                print('Captured dashboard_screenshot.png')

            # Click "Open Plan" or "View Itinerary" button on the first trip card
            await send_cmd('Runtime.evaluate', {
                'expression': '''
                (function() {
                    const btn = Array.from(document.querySelectorAll("button")).find(b => 
                        b.textContent.includes("Open Plan") || b.textContent.includes("View Itinerary")
                    );
                    if (btn) btn.click();
                })()
                '''
            })
            await asyncio.sleep(2)

            # Capture Itinerary page screenshot
            itin_shot = await send_cmd('Page.captureScreenshot')
            if 'data' in itin_shot:
                with open('itinerary_screenshot.png', 'wb') as f:
                    f.write(base64.b64decode(itin_shot['data']))
                print('Captured itinerary_screenshot.png')

    finally:
        proc.terminate()

if __name__ == '__main__':
    asyncio.run(capture_views())

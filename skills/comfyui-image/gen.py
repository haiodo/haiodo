#!/usr/bin/env python3
"""Generate an image with the local ComfyUI (Z-Image Turbo workflow) and save it to a file."""
import argparse
import json
import random
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent


def call(url, data=None):
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("prompt")
    p.add_argument("-o", "--out", required=True, help="output .png path")
    p.add_argument("-W", "--width", type=int, default=1024)
    p.add_argument("-H", "--height", type=int, default=1024)
    p.add_argument("--seed", type=int, default=None)
    p.add_argument("--steps", type=int, default=8)
    p.add_argument("--negative", default=None)
    p.add_argument("--host", default="http://127.0.0.1:8188")
    p.add_argument("--timeout", type=int, default=600)
    a = p.parse_args()

    wf = json.loads((HERE / "workflow.json").read_text())
    seed = a.seed if a.seed is not None else random.randint(0, 2**50)
    wf["67"]["inputs"]["text"] = a.prompt
    wf["68"]["inputs"].update(width=a.width, height=a.height)
    wf["70"]["inputs"].update(seed=seed, steps=a.steps)
    if a.negative is not None:
        wf["71"]["inputs"]["text"] = a.negative

    pid = json.loads(call(f"{a.host}/prompt", {"prompt": wf}))["prompt_id"]

    deadline = time.time() + a.timeout
    while True:
        hist = json.loads(call(f"{a.host}/history/{pid}")).get(pid)
        if hist and hist.get("status", {}).get("completed"):
            break
        if hist and hist.get("status", {}).get("status_str") == "error":
            sys.exit(f"ComfyUI error: {json.dumps(hist['status'].get('messages'))}")
        if time.time() > deadline:
            sys.exit(f"timeout waiting for prompt {pid}")
        time.sleep(1)

    img = hist["outputs"]["9"]["images"][0]
    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(call(f"{a.host}/view?{q}"))
    print(f"{out} seed={seed}")


if __name__ == "__main__":
    main()

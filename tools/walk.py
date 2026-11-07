import subprocess, time, sys
from PIL import Image
OUT = r"D:\penmods\words_penos\shots"
def sh(c): return subprocess.run(c, shell=True, capture_output=True, text=True).stdout
def tap(x, y):
    a, b = y, 935 - x
    sh(f"adb shell send_event touch press {a} {b}"); time.sleep(0.15)
    sh(f"adb shell send_event touch release {a} {b}"); time.sleep(0.9)
def cap(name):
    sh("adb shell miniapp_cli capture /data/local/tmp/cap.png")
    p = OUT + "\\" + name + ".png"
    sh(f"adb pull /data/local/tmp/cap.png {p}")
    return Image.open(p).convert("RGB")
def state(im):
    l = im.getpixel((240, 255)); r = im.getpixel((693, 257)); m = im.getpixel((467, 255))
    if m[2] > 180 and m[0] < 120: return "revealed"
    if r[1] > r[0] + 15 and l[0] > l[1] + 15: return "study"
    return "other"
steps = int(sys.argv[1]) if len(sys.argv) > 1 else 40
for i in range(steps):
    im = cap("w")
    st = state(im)
    print(i, st, flush=True)
    if st == "study": tap(693, 257)
    elif st == "revealed": tap(467, 255)
    else:
        im.save(OUT + "\\walk_end.png"); break

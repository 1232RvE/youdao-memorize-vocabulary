import subprocess, time
from PIL import Image
OUT = r"D:\penmods\words_penos\shots"
def sh(c): return subprocess.run(c, shell=True, capture_output=True, text=True).stdout
def tap(x, y):
    a, b = y, 935 - x
    sh(f"adb shell send_event touch press {a} {b}"); time.sleep(0.12)
    sh(f"adb shell send_event touch release {a} {b}"); time.sleep(0.25)
def cap(name="rr"):
    sh("adb shell miniapp_cli capture /data/local/tmp/cap.png")
    p = f"{OUT}\\{name}.png"; sh(f"adb pull /data/local/tmp/cap.png {p}")
    return Image.open(p).convert("RGB")
pts = [(240,184),(693,184),(240,245),(693,245)]
for q in range(20):
    im = cap()
    # summary detection: center top big text area white and no 4 option rows (row color dark)
    row = im.getpixel((240,184))
    if not (row[0] < 60 and row[1] < 60 and row[2] < 80):
        # not an option tile -> maybe summary
        im.save(f"{OUT}\\summary.png"); print("END q",q); break
    for (x,y) in pts:
        tap(x,y); time.sleep(0.3)
    time.sleep(0.9)
else:
    cap("summary"); print("loopdone")
print("fin")

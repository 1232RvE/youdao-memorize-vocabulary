import subprocess, time
OUT = r"D:\penmods\words_penos\shots"
def sh(c): return subprocess.run(c, shell=True, capture_output=True, text=True).stdout
def tap(x, y):
    a, b = y, 935 - x
    sh(f"adb shell send_event touch press {a} {b}"); time.sleep(0.15)
    sh(f"adb shell send_event touch release {a} {b}")
def cap(name):
    sh("adb shell miniapp_cli capture /data/local/tmp/cap.png")
    sh(f"adb pull /data/local/tmp/cap.png {OUT}\\{name}.png")
tap(240, 184); time.sleep(0.5); cap("r_wrong")
tap(693, 184); time.sleep(0.15); cap("r_right")
time.sleep(1.2); cap("r_next")
print("done")

import sys
from PIL import Image

def analyze(p):
    im = Image.open(p).convert('RGB')
    w, h = im.size
    px = im.load()
    blue = []
    for y in range(h):
        row = [x for x in range(w) if abs(px[x, y][0] - 57) < 20 and abs(px[x, y][1] - 121) < 20 and abs(px[x, y][2] - 219) < 20]
        if row:
            blue.append((y, min(row), max(row)))
    print(p, im.size)
    if blue:
        print('  blue y:', blue[0][0], '->', blue[-1][0], ' x:', min(b[1] for b in blue), '->', max(b[2] for b in blue))
    else:
        print('  no blue region')
    last = 0
    for y in range(h):
        n = 0
        for x in range(0, w, 3):
            r, g, b = px[x, y]
            if abs(r - 11) > 12 or abs(g - 17) > 12 or abs(b - 26) > 12:
                n += 1
        if n > 2:
            last = y
    print('  last non-bg row:', last, 'of', h)

for p in sys.argv[1:]:
    analyze(p)

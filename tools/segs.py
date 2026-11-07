
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w,h=im.size
px=im.load()
def segs(y):
    out=[]; start=0; prev=px[0,y]
    for x in range(1,w):
        p=px[x,y]
        if p!=prev:
            if x-start>=6: out.append((start,x-1,prev))
            prev=p; start=x
    if w-start>=6: out.append((start,w-1,prev))
    return out
for y in [160,170,180,190,225,255]:
    print(y, segs(y))

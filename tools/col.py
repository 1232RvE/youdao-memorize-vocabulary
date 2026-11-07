
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w,h=im.size
px=im.load()
x=int(sys.argv[2])
prev=None; start=0
for y in range(h):
    p=px[x,y]
    if p!=prev:
        if prev is not None and y-start>=3: print(start,y-1,prev)
        prev=p; start=y
print(start,h-1,prev)

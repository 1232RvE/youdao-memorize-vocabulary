
import sys
from PIL import Image
import collections
im = Image.open(sys.argv[1]).convert('RGB')
w,h=im.size
px=im.load()
for y in range(0,h):
    c=collections.Counter()
    for x in range(0,w,2):
        c[px[x,y]]+=1
    top=c.most_common(2)
    print(y, top)

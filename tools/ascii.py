
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w,h = im.size
px = im.load()
x0,y0,x1,y1 = [int(v) for v in sys.argv[2:6]]
for y in range(y0,min(y1,h)):
    row = []
    for x in range(x0,min(x1,w)):
        p = px[x,y]
        row.append('#' if sum(p)>200 else ('.' if p==(10,15,23) else '-'))
    print(y, ''.join(row))


import sys
from PIL import Image
import collections
p = sys.argv[1]
im = Image.open(p).convert('RGB')
w,h = im.size
px = im.load()
print('size', w, h)
# 统计每行非背景色像素数，识别卡片带
bg = (10,15,23)
for y in range(0,h,3):
    n = sum(1 for x in range(0,w,3) if px[x,y] != bg)
    print(y, n)

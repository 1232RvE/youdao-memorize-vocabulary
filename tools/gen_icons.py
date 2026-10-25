# -*- coding: utf-8 -*-
import os
from PIL import Image, ImageDraw

out = os.path.join(r"D:\penmods\words_penos", "src", "assets", "icons")
os.makedirs(out, exist_ok=True)

S = 96
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
# 左侧尖角 chevron，白色，线宽按 96 画布比例
w = 10
cx, cy = 62, 48
half = 26
d.line([(cx, cy - half), (cx - half + 6, cy)], fill=(255, 255, 255, 255), width=w, joint="curve")
d.line([(cx - half + 6, cy), (cx, cy + half)], fill=(255, 255, 255, 255), width=w, joint="curve")
# 圆头端点
d.ellipse([cx - w/2, cy - half - w/2, cx + w/2, cy - half + w/2], fill=(255, 255, 255, 255))
d.ellipse([cx - w/2, cy + half - w/2, cx + w/2, cy + half + w/2], fill=(255, 255, 255, 255))
img.save(os.path.join(out, "back.png"))
print("back.png", img.size, os.path.getsize(os.path.join(out, "back.png")))

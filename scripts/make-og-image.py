"""SNS 공유 미리보기 이미지(1200x630) 만들기 — 2026-10-20
첫 화면과 같은 캠퍼스 항공 사진(출처 경기대학교) + 경기대 UI 로고 + 'UNOFFICIAL FAN SITE'.
실행: python3 scripts/make-og-image.py  (Pillow 필요, npm ci 뒤에 Anton 글꼴 사용)
"""
from PIL import Image, ImageEnhance, ImageDraw, ImageFont

W, H = 1200, 630
src = Image.open('public/images/campus-aerial-2000.jpg').convert('RGB')
s = max(W / src.width, H / src.height)
im = src.resize((round(src.width * s), round(src.height * s)), Image.LANCZOS)
y = int((im.height - H) * 0.55)  # 축구장이 가운데 오도록 (배경과 같은 55%)
x = (im.width - W) // 2
im = ImageEnhance.Color(im.crop((x, y, x + W, y + H))).enhance(0.4)

# 위 30%·아래 40%만 어둡게 (첫 화면과 같은 방식)
mask = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(mask)
for yy in range(H):
    t = 0.0
    if yy < H * 0.3:
        t = (1 - yy / (H * 0.3)) * 0.4
    if yy > H * 0.6:
        t = (yy - H * 0.6) / (H * 0.4) * 0.55
    d.line([(0, yy), (W, yy)], fill=int(255 * t))
im = Image.composite(Image.new('RGB', (W, H), (0, 0, 0)), im, mask)

logo = Image.open('public/images/kgu-logo-1947-light.png').convert('RGBA')
lw = 420
logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
im.paste(logo, (64, H - logo.height - 56), logo)

font = ImageFont.truetype('node_modules/@fontsource/anton/files/anton-latin-400-normal.woff', 34)
d = ImageDraw.Draw(im)
text, gap = 'UNOFFICIAL FAN SITE', 4
widths = [d.textlength(c, font=font) for c in text]
cx = W - 64 - (sum(widths) + gap * (len(text) - 1))
for c, w in zip(text, widths):
    d.text((cx + 2, 50), c, font=font, fill=(0, 0, 0))
    d.text((cx, 48), c, font=font, fill=(225, 224, 204))  # cream
    cx += w + gap

im.save('public/images/og-image.jpg', quality=85, optimize=True, progressive=True)
print('public/images/og-image.jpg', im.size)

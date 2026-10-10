"""Builds the README demo (GIF + animated WebP) from the four screenshots in this folder.
The screenshots show a local Twenty with made-up data (Jane Example, 555-01xx numbers) after a fictional
Retell webhook. Run: python design/demo/build.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
OUT = HERE.parent.parent / '.github' / 'assets'
W = 1200
BAR = 64
FONT = ImageFont.truetype('C:/Windows/Fonts/seguisb.ttf', 24)
SMALL = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 18)
CYAN, BLUE, VIOLET = (46, 230, 255), (47, 107, 255), (138, 92, 255)

# (file, step label, caption, highlight boxes in screenshot pixels 1462x812, hold ms)
STEPS = [
    ('frame-1.jpg', '1', 'Jane is a lead in Twenty. No calls yet.', [(205, 495, 490, 515)], 2200),
    ('frame-2.jpg', '2', 'A Retell call ends: the signed webhook lands in seconds', [(205, 495, 490, 515), (205, 640, 490, 660), (560, 160, 930, 262)], 2800),
    ('frame-3.jpg', '3', 'The call record, linked to Jane and her opportunity', [(930, 433, 1440, 515), (930, 722, 1440, 772)], 2800),
    ('frame-4.jpg', '4', 'Summary tab: summary, recording player, transcript', [(938, 92, 1446, 488)], 3600),
]


def gradient(width, height):
    g = Image.new('RGB', (width, height))
    px = g.load()
    for x in range(width):
        t = x / max(1, width - 1)
        a, b, u = (CYAN, BLUE, t * 2) if t < 0.5 else (BLUE, VIOLET, (t - 0.5) * 2)
        c = tuple(int(a[i] + (b[i] - a[i]) * u) for i in range(3))
        for y in range(height):
            px[x, y] = c
    return g


def frame(file, step, caption, boxes):
    shot = Image.open(HERE / file).convert('RGB')
    scale = W / shot.width
    shot = shot.resize((W, round(shot.height * scale)), Image.LANCZOS)
    canvas = Image.new('RGB', (W, BAR + shot.height), (10, 11, 18))
    canvas.paste(shot, (0, BAR))
    d = ImageDraw.Draw(canvas)
    # step badge with brand gradient
    badge = gradient(40, 40)
    mask = Image.new('L', (40, 40), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, 39, 39), fill=255)
    canvas.paste(badge, (20, 12), mask)
    d.text((40, 32), step, font=FONT, fill='white', anchor='mm')
    d.text((74, 32), caption, font=FONT, fill=(244, 246, 255), anchor='lm')
    d.text((W - 20, 32), 'Retell Sync for Twenty', font=SMALL, fill=(140, 146, 170), anchor='rm')
    d.rectangle((0, BAR - 2, W, BAR - 1), fill=BLUE)
    for x0, y0, x1, y1 in boxes:
        box = [round(v * scale) for v in (x0, y0, x1, y1)]
        box[1] += BAR
        box[3] += BAR
        d.rounded_rectangle(box, radius=8, outline=CYAN, width=3)
    return canvas


frames, durations = [], []
built = [frame(f, s, c, b) for f, s, c, b, _ in STEPS]
for i, img in enumerate(built):
    frames.append(img)
    durations.append(STEPS[i][4])
    nxt = built[(i + 1) % len(built)]
    for k in range(1, 6):
        frames.append(Image.blend(img, nxt, k / 6))
        durations.append(70)

OUT.mkdir(parents=True, exist_ok=True)
frames[0].save(OUT / 'demo.webp', save_all=True, append_images=frames[1:], duration=durations, loop=0, quality=82, method=6)


print('ok', len(frames), 'frames')

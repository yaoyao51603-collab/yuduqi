"""Generate app icons with Pillow.

Style: paper background, ink book-spine mark, ochre accent dot.
Run: python3 scripts/gen-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"
PAPER = (251, 249, 243, 255)
INK = (33, 30, 25, 255)
ACCENT = (140, 74, 47, 255)


def draw_icon(size: int, *, maskable: bool = False) -> Image.Image:
    image = Image.new("RGBA", (size, size), PAPER)
    draw = ImageDraw.Draw(image)

    # Safe zone: maskable icons keep the mark inside the central 80%.
    scale = 0.62 if maskable else 0.72
    mark = size * scale
    left = (size - mark) / 2
    top = (size - mark) / 2
    radius = mark * 0.12

    # Open book: two rounded panels with a center gutter.
    gutter = mark * 0.055
    panel_w = (mark - gutter) / 2
    line_w = max(2, round(size * 0.012))

    draw.rounded_rectangle(
        (left, top, left + panel_w, top + mark),
        radius=radius,
        fill=INK,
    )
    draw.rounded_rectangle(
        (left + panel_w + gutter, top, left + mark, top + mark),
        radius=radius,
        fill=INK,
    )

    # Paper lines on the left page, slightly inset.
    inset = panel_w * 0.2
    for index in range(4):
        y = top + mark * (0.26 + index * 0.14)
        draw.rounded_rectangle(
            (left + inset, y, left + panel_w - inset * 0.8, y + line_w),
            radius=line_w / 2,
            fill=PAPER,
        )

    # Ochre bookmark on the right page.
    bookmark_w = panel_w * 0.2
    bookmark_x = left + panel_w + gutter + (panel_w - bookmark_w) / 2
    draw.rectangle(
        (bookmark_x, top, bookmark_x + bookmark_w, top + mark * 0.52),
        fill=ACCENT,
    )
    draw.polygon(
        [
            (bookmark_x, top + mark * 0.52),
            (bookmark_x + bookmark_w / 2, top + mark * 0.44),
            (bookmark_x + bookmark_w, top + mark * 0.52),
        ],
        fill=ACCENT,
    )
    return image


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, False),
        ("favicon-32.png", 32, False),
    ]
    for name, size, maskable in jobs:
        image = draw_icon(size, maskable=maskable)
        image.save(OUT / name)
        print(f"wrote {OUT / name}")


if __name__ == "__main__":
    main()

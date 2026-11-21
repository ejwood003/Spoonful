"""Strip white margin from Spoonful icon and write Next.js app icons."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(
    r"C:\Users\William\.cursor\projects\c-Users-William-Documents-Personal-Documents-FALL-2026-IS-551-Spoonful-New-Repo-Spoonful\assets\Dynamic_Coral_Spoon_Icon-f5106fd4-6cd9-411c-a856-9fd36d3414cf.jpg"
)
PUBLIC = ROOT / "public"
APP = ROOT / "src" / "app"


def is_bg(r: int, g: int, b: int) -> bool:
    return r >= 245 and g >= 245 and b >= 245


def main() -> None:
    PUBLIC.mkdir(exist_ok=True)
    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    px = img.load()
    assert px is not None

    visited = [[False] * h for _ in range(w)]
    q: deque[tuple[int, int]] = deque()

    def try_push(x: int, y: int) -> None:
        if 0 <= x < w and 0 <= y < h and not visited[x][y]:
            r, g, b, _a = px[x, y]
            if is_bg(r, g, b):
                visited[x][y] = True
                q.append((x, y))

    for x in range(w):
        try_push(x, 0)
        try_push(x, h - 1)
    for y in range(h):
        try_push(0, y)
        try_push(w - 1, y)

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            try_push(nx, ny)

    bbox = img.getbbox()
    if bbox:
        left, top, right, bottom = bbox
        left = max(0, left - 2)
        top = max(0, top - 2)
        right = min(w, right + 2)
        bottom = min(h, bottom + 2)
        img = img.crop((left, top, right, bottom))

    master = PUBLIC / "spoonful-icon.png"
    icon = APP / "icon.png"
    apple = APP / "apple-icon.png"
    favicon = APP / "favicon.ico"

    img.save(master, "PNG")

    for path, size in ((icon, 512), (apple, 180)):
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        fitted = img.copy()
        fitted.thumbnail((size, size), Image.Resampling.LANCZOS)
        ox = (size - fitted.width) // 2
        oy = (size - fitted.height) // 2
        canvas.paste(fitted, (ox, oy), fitted)
        canvas.save(path, "PNG")

    # Multi-size ICO for older browsers
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_images = []
    for size in ico_sizes:
        canvas = Image.new("RGBA", size, (0, 0, 0, 0))
        fitted = img.copy()
        fitted.thumbnail(size, Image.Resampling.LANCZOS)
        ox = (size[0] - fitted.width) // 2
        oy = (size[1] - fitted.height) // 2
        canvas.paste(fitted, (ox, oy), fitted)
        ico_images.append(canvas)
    ico_images[0].save(
        favicon,
        format="ICO",
        sizes=ico_sizes,
        append_images=ico_images[1:],
    )

    sample = Image.open(icon)
    opaque = sum(1 for p in sample.getdata() if p[3] > 0)
    transparent = sum(1 for p in sample.getdata() if p[3] == 0)
    print(f"source={w}x{h} cropped={img.size[0]}x{img.size[1]}")
    print(f"wrote {master}")
    print(f"wrote {icon}")
    print(f"wrote {apple}")
    print(f"wrote {favicon}")
    print(f"icon opaque={opaque} transparent={transparent}")


if __name__ == "__main__":
    main()

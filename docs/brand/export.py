#!/usr/bin/env python3
"""Exports zaku's approved brand images from source/ into export/.

Run from anywhere: python3 docs/brand/export.py. It needs only the standard library and macOS's sips.

The image model leaves specks of colour in the transparent area around a character. The cleanup keeps
the largest connected shape (the character and its soft shadow) and clears every other pixel's alpha.
Resizing goes through sips; the ICO packs PNG images, which every current browser reads.
"""

import struct
import subprocess
import sys
import tempfile
import zlib
from collections import deque
from pathlib import Path

BRAND = Path(__file__).resolve().parent
SOURCE = BRAND / 'source'
EXPORT = BRAND / 'export'
PLUGIN_FAVICON = BRAND.parent.parent / 'apps' / 'zaku-figma-plugin' / 'public' / 'favicon.ico'

MASCOT = SOURCE / 'zaku-mascot_v001.png'
LOGO = SOURCE / 'zaku-logo-head_v001.png'
BANNER = SOURCE / 'zaku-banner_v003.png'

# Alpha at or above this joins a pixel to its neighbours; the soft shadow fades to about this.
CONNECT_ALPHA = 4
FAVICON_SIZES = (16, 32, 48)


def read_png(path: Path) -> tuple[int, int, bytearray]:
    data = path.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', f'{path} is not a PNG'
    pos, idat, width = 8, b'', 0
    while pos < len(data):
        length, kind = struct.unpack('>I4s', data[pos : pos + 8])
        body = data[pos + 8 : pos + 8 + length]
        if kind == b'IHDR':
            width, height, depth, colour, _, _, interlace = struct.unpack('>IIBBBBB', body)
            assert (depth, colour, interlace) == (8, 6, 0), f'{path}: expected 8-bit RGBA, not interlaced'
        elif kind == b'IDAT':
            idat += body
        pos += 12 + length
    raw, stride = zlib.decompress(idat), width * 4
    pixels, previous = bytearray(), bytearray(stride)
    for row in range(height):
        start = row * (stride + 1)
        kind, line = raw[start], bytearray(raw[start + 1 : start + 1 + stride])
        for i in range(stride):
            left = line[i - 4] if i >= 4 else 0
            up, corner = previous[i], previous[i - 4] if i >= 4 else 0
            if kind == 1:
                line[i] = (line[i] + left) & 0xFF
            elif kind == 2:
                line[i] = (line[i] + up) & 0xFF
            elif kind == 3:
                line[i] = (line[i] + (left + up) // 2) & 0xFF
            elif kind == 4:
                p = left + up - corner
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - corner)
                line[i] = (line[i] + (left if pa <= pb and pa <= pc else up if pb <= pc else corner)) & 0xFF
        pixels += line
        previous = line
    return width, height, pixels


def write_png(path: Path, width: int, height: int, pixels: bytearray) -> None:
    stride = width * 4
    raw = b''.join(b'\x00' + bytes(pixels[r * stride : (r + 1) * stride]) for r in range(height))

    def chunk(kind: bytes, body: bytes) -> bytes:
        return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body))

    path.write_bytes(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )


def clear_specks(width: int, height: int, pixels: bytearray) -> int:
    """Keeps the largest 8-connected shape; returns how many stray pixels were cleared."""
    seen = bytearray(width * height)
    largest: list[int] = []
    for start in range(width * height):
        if seen[start] or pixels[start * 4 + 3] < CONNECT_ALPHA:
            continue
        shape, queue = [], deque([start])
        seen[start] = 1
        while queue:
            at = queue.popleft()
            shape.append(at)
            x, y = at % width, at // width
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < width and 0 <= ny < height:
                        n = ny * width + nx
                        if not seen[n] and pixels[n * 4 + 3] >= CONNECT_ALPHA:
                            seen[n] = 1
                            queue.append(n)
        if len(shape) > len(largest):
            largest = shape
    keep = bytearray(width * height)
    for at in largest:
        keep[at] = 1
    cleared = 0
    for at in range(width * height):
        if not keep[at] and pixels[at * 4 + 3]:
            pixels[at * 4 : at * 4 + 4] = b'\x00\x00\x00\x00'
            cleared += 1
    return cleared


def sips_resize(source: Path, out: Path, width: int, height: int) -> None:
    subprocess.run(['sips', '-z', str(height), str(width), str(source), '--out', str(out)], check=True,
                   capture_output=True)


def write_ico(path: Path, pngs: list[tuple[int, bytes]]) -> None:
    header = struct.pack('<HHH', 0, 1, len(pngs))
    offset, entries, bodies = 6 + 16 * len(pngs), b'', b''
    for size, body in pngs:
        entries += struct.pack('<BBBBHHII', size % 256, size % 256, 0, 0, 1, 32, len(body), offset)
        bodies += body
        offset += len(body)
    path.write_bytes(header + entries + bodies)


def cleaned(source: Path, out: Path) -> None:
    width, height, pixels = read_png(source)
    print(f'{source.name}: cleared {clear_specks(width, height, pixels)} stray pixels')
    write_png(out, width, height, pixels)


def main() -> None:
    EXPORT.mkdir(exist_ok=True)
    cleaned(MASCOT, EXPORT / 'zaku-mascot.png')
    cleaned(LOGO, EXPORT / 'zaku-logo.png')
    sips_resize(EXPORT / 'zaku-logo.png', EXPORT / 'zaku-logo-128.png', 128, 128)
    sips_resize(BANNER, EXPORT / 'zaku-banner.png', 1920, 1080)
    with tempfile.TemporaryDirectory() as scratch:
        pngs = []
        for size in FAVICON_SIZES:
            out = Path(scratch) / f'{size}.png'
            sips_resize(EXPORT / 'zaku-logo.png', out, size, size)
            pngs.append((size, out.read_bytes()))
        write_ico(EXPORT / 'favicon.ico', pngs)
    PLUGIN_FAVICON.write_bytes((EXPORT / 'favicon.ico').read_bytes())
    for f in sorted(EXPORT.iterdir()):
        print(f'{f.relative_to(BRAND)}  {f.stat().st_size} bytes')


if __name__ == '__main__':
    sys.exit(main())

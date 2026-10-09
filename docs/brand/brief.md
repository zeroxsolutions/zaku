Generate the brand images for "zaku", using your image generation tool. Do not edit, delete or commit any other file in this repository.

What zaku is: a design-discipline plugin for Claude Code and Figma. An AI agent draws screens in Figma through it, and zaku checks every change against the design system's rules (bound colour variables, component overrides, layer naming), rolling back what breaks them. The name nods to the Zaku mobile suit, but the mark must be ORIGINAL: no copy of any Gundam or Zaku design, no robot head, no copyrighted likeness. Take only an abstract cue: a single round "mono-eye" light on a horizontal visor slit, as a geometric, flat, modern mark.

Style: Microsoft Fluent 2, as its product (app) icons draw. Soft rounded geometry, two or three layered shapes that overlap with slight translucency, smooth gentle gradients inside each shape (lighter at the top-left, where the light comes from), a soft contact shadow under the mark, no hard outlines, no photo-realism, no clutter. Palette: a deep-to-fresh green gradient (#1F5F3F to #3FA36B) for the squircle body, a near-black glassy visor slit (#111 to #2A2A2A), one magenta/pink eye (#FF3D7F) with a soft glow. It must read on both light and dark Figma UI.
The favicon follows Fluent's system-icon rule instead: solid colours only, no gradient, no glow, so it stays crisp at 16 px.
The banner takes Fluent's surfaces: a dark Mica-like background (#0E1411-ish) with a soft blurred colour field behind the mark, one acrylic (frosted, translucent) panel carrying a faint design-tool grid.

Files to write (create the folder `docs/brand/`):

1. `docs/brand/zaku-logo.png` - 1024x1024, the mark alone on a transparent background: a rounded square (squircle) in the deep green, a dark horizontal visor slit across its middle, a single glowing pink round eye in the slit, slightly off-centre. No text.
2. `docs/brand/zaku-logo-128.png` - the same mark resized to 128x128 (the Figma plugin icon size). Resize the 1024 file; do not regenerate.
3. `docs/brand/zaku-banner.png` - 1920x1080 (the Figma Community cover). Dark background (#0E1411-ish) with a faint design-tool grid; the mark on the left third; on the right the wordmark "zaku" in a clean geometric sans, and under it the line "Design rules your agent can't skip". Check the text in the result letter by letter; regenerate until both strings are spelled exactly, with no extra text anywhere.
4. `docs/brand/favicon.ico` - a multi-size ICO (16, 32, 48) made from the logo. At 16 px keep only the squircle, slit and eye. Use whatever is on this machine (sips, python3); if no tool can write a multi-size ICO, write a 32x32 ICO.
5. Copy `docs/brand/favicon.ico` over `apps/zaku-figma-plugin/public/favicon.ico` (it holds the Nx generator's placeholder today).

Check each file's pixel size with `sips -g pixelWidth -g pixelHeight` and view each image before you finish. End with a short list of the files written, their sizes, and the exact prompt you gave the image tool for the logo and the banner.

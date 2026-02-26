# PWA Icons

This directory should contain the app icons for the Progressive Web App.

## Required Icon Sizes

You need to create the following icon sizes:

- `icon-72x72.png` - 72x72 pixels
- `icon-96x96.png` - 96x96 pixels
- `icon-128x128.png` - 128x128 pixels
- `icon-144x144.png` - 144x144 pixels
- `icon-152x152.png` - 152x152 pixels
- `icon-192x192.png` - 192x192 pixels
- `icon-384x384.png` - 384x384 pixels
- `icon-512x512.png` - 512x512 pixels

## Design Guidelines

- Use a simple, recognizable design (torch, Survivor logo, or SFL letters)
- Ensure good contrast for visibility on any background
- Use the brand color: #20B2AA (aqua/teal)
- Make icons work well when masked (safe area in center)

## Quick Generation Options

### Option 1: Online Tool (Easiest)
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload a 512x512 source image
3. Download the generated icon pack
4. Replace the files in this directory

### Option 2: Using ImageMagick (Command Line)
```bash
# Create a simple colored square as placeholder
convert -size 512x512 xc:#20B2AA -gravity center -pointsize 200 -fill white -annotate +0+0 "SFL" icon-512x512.png

# Then resize for other sizes
for size in 72 96 128 144 152 192 384; do
  convert icon-512x512.png -resize ${size}x${size} icon-${size}x${size}.png
done
```

### Option 3: Using Figma/Canva
1. Create a 512x512 design
2. Export at different sizes
3. Save to this directory

## Apple Touch Icon

Also create `apple-touch-icon.png` (180x180) for iOS devices.

## Current Status

⚠️ **Placeholder icons needed** - The app will work but won't look professional until you add real icons.

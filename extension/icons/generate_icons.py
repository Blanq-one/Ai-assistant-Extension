"""
Icon Generator Script
Run this to generate proper PNG icons for the extension.
Requires: pip install Pillow
"""

from PIL import Image, ImageDraw
import os

def create_icon(size):
    """Create a gradient icon with a sparkle emoji aesthetic."""
    # Create image with gradient background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw circular gradient background
    center = size // 2
    for r in range(center, 0, -1):
        # Gradient from purple to blue
        ratio = r / center
        red = int(88 + (163 - 88) * (1 - ratio))
        green = int(166 + (113 - 166) * (1 - ratio))
        blue = int(255 + (247 - 255) * (1 - ratio))
        
        draw.ellipse(
            [center - r, center - r, center + r, center + r],
            fill=(red, green, blue, 255)
        )
    
    # Draw a simple sparkle/star shape
    star_size = size * 0.35
    cx, cy = center, center
    
    # Draw 4-point star
    points = [
        (cx, cy - star_size),      # Top
        (cx + star_size * 0.2, cy - star_size * 0.2),
        (cx + star_size, cy),      # Right
        (cx + star_size * 0.2, cy + star_size * 0.2),
        (cx, cy + star_size),      # Bottom
        (cx - star_size * 0.2, cy + star_size * 0.2),
        (cx - star_size, cy),      # Left
        (cx - star_size * 0.2, cy - star_size * 0.2),
    ]
    draw.polygon(points, fill=(255, 255, 255, 230))
    
    return img

def main():
    sizes = [16, 32, 48, 128]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    for size in sizes:
        icon = create_icon(size)
        filename = os.path.join(script_dir, f'icon{size}.png')
        icon.save(filename, 'PNG')
        print(f'Created {filename}')
    
    print('\\nAll icons generated successfully!')
    print('You can now load the extension in Chrome.')

if __name__ == '__main__':
    main()



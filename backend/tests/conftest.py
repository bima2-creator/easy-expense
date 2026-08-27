import os
import io
import base64
import pytest
import requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/") or \
           os.environ.get("EXPO_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback: read frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass


@pytest.fixture(scope="session")
def base_url():
    assert BASE_URL, "BASE_URL not configured"
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    return s


@pytest.fixture(scope="session")
def receipt_jpeg_bytes():
    """Generate a realistic-looking receipt JPEG with readable text."""
    W, H = 480, 720
    img = Image.new("RGB", (W, H), color=(250, 248, 240))
    draw = ImageDraw.Draw(img)
    try:
        font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
        font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except Exception:
        font_big = ImageFont.load_default()
        font = ImageFont.load_default()
        font_sm = font
    # header (Indonesian receipt)
    draw.text((130, 30), "WARUNG SEDERHANA", fill=(30, 30, 30), font=font_big)
    draw.text((150, 70), "Jl. Sudirman No. 12", fill=(60, 60, 60), font=font_sm)
    draw.text((150, 90), "Jakarta Pusat", fill=(60, 60, 60), font=font_sm)
    draw.line([(30, 130), (W-30, 130)], fill=(120, 120, 120), width=2)
    # meta
    draw.text((40, 145), "Date: 2026-01-10", fill=(30, 30, 30), font=font)
    draw.text((40, 175), "Order #: 4821", fill=(30, 30, 30), font=font)
    draw.line([(30, 210), (W-30, 210)], fill=(120, 120, 120), width=1)
    # items
    items = [
        ("Nasi Goreng Spesial", "35.000"),
        ("Es Teh Manis", "8.000"),
        ("Ayam Bakar", "45.000"),
    ]
    y = 230
    for name, price in items:
        draw.text((40, y), name, fill=(30, 30, 30), font=font)
        draw.text((W-140, y), f"Rp {price}", fill=(30, 30, 30), font=font)
        y += 32
    draw.line([(30, y+10), (W-30, y+10)], fill=(120, 120, 120), width=1)
    y += 30
    draw.text((40, y), "Subtotal", fill=(30, 30, 30), font=font); draw.text((W-140, y), "Rp 88.000", fill=(30, 30, 30), font=font); y += 30
    draw.text((40, y), "TOTAL", fill=(0, 0, 0), font=font_big); draw.text((W-180, y), "Rp 88.000", fill=(0, 0, 0), font=font_big); y += 50
    draw.line([(30, y), (W-30, y)], fill=(120, 120, 120), width=2); y += 20
    draw.text((100, y), "Thank you for your visit!", fill=(60, 60, 60), font=font_sm)
    # add some texture noise blocks
    for i, x in enumerate([50, 150, 250, 350]):
        draw.rectangle([x, H-60, x+40, H-30], fill=(220-i*10, 220-i*10, 220-i*10))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return buf.getvalue()


@pytest.fixture(scope="session")
def receipt_jpeg_b64(receipt_jpeg_bytes):
    return base64.b64encode(receipt_jpeg_bytes).decode()

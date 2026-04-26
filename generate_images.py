#!/usr/bin/env python3
import base64
import os
import re
import sys
import time
from pathlib import Path


OUTPUT_DIR = Path("/Users/riki/moneymap/images")
MODEL = "gpt-image-1"


def load_openai_key_from_shell_files() -> None:
    if os.environ.get("OPENAI_API_KEY"):
        return

    shell_files = [
        Path.home() / ".zshrc",
        Path.home() / ".zprofile",
        Path.home() / ".bashrc",
        Path.home() / ".bash_profile",
        Path.home() / ".profile",
    ]
    pattern = re.compile(
        r"""(?:export\s+)?OPENAI_API_KEY\s*=\s*(['"]?)([^'"\n#]+)\1"""
    )

    for shell_file in shell_files:
        if not shell_file.exists():
            continue
        match = pattern.search(shell_file.read_text(errors="ignore"))
        if match:
            os.environ["OPENAI_API_KEY"] = match.group(2).strip()
            return


IMAGE_SPECS = [
    {
        "filename": "hero-bg.png",
        "size": "1536x1024",
        "prompt": (
            "Hero background for a Japanese financial literacy website named MoneyMap "
            "for 18 to 25 year olds. Modern abstract financial visualization, dark navy "
            "gradient background using #0b1f3a, glowing golden graph lines using #c9a227, "
            "floating realistic credit cards, coins, data points, subtle city-finance depth, "
            "cinematic premium lighting, clean contemporary composition, wide hero crop friendly, "
            "no text, no letters, no numbers, no logos."
        ),
    },
    {
        "filename": "thumb-credit-card.png",
        "size": "1024x1024",
        "prompt": (
            "Article thumbnail for a first credit card guide on a Japanese financial literacy site. "
            "A sleek premium credit card floating on a dark navy background, soft golden rim light, "
            "minimal modern composition, subtle reflections, clean aspirational mood, "
            "no text, no logos, no numbers."
        ),
    },
    {
        "filename": "thumb-points.png",
        "size": "1024x1024",
        "prompt": (
            "Article thumbnail for a point rewards system. Abstract visualization of points and "
            "rewards accumulating, golden coins, small sparkles, connected data dots, dark blue "
            "background, modern clean Japanese fintech style, premium but youthful, "
            "no text, no logos, no numbers."
        ),
    },
    {
        "filename": "thumb-money-basics.png",
        "size": "1024x1024",
        "prompt": (
            "Article thumbnail for basic money management. A stylish young Japanese professional "
            "age 20s holding a smartphone showing simple financial chart shapes, modern city cafe "
            "or co-working background, navy and gold color palette, aspirational and clean, "
            "photorealistic editorial style, no readable text, no logos."
        ),
    },
    {
        "filename": "thumb-insurance.png",
        "size": "1024x1024",
        "prompt": (
            "Article thumbnail for life insurance. A clean shield icon-like object with warm golden "
            "glow on a deep navy background, subtle protective light aura, security and protection "
            "theme, premium minimal 3D render, no text, no logos."
        ),
    },
    {
        "filename": "thumb-investment.png",
        "size": "1024x1024",
        "prompt": (
            "Article thumbnail for investment types and index funds. Upward trending golden chart "
            "line over a dark navy financial dashboard background, glowing data points, abstract "
            "candles and grid, growth and prosperity, modern clean fintech aesthetic, "
            "no text, no logos, no numbers."
        ),
    },
    {
        "filename": "thumb-nisa.png",
        "size": "1024x1024",
        "prompt": (
            "Article thumbnail for NISA and tax-free investment. A healthy green plant growing from "
            "a transparent coin jar with gold coins, dark navy background with soft golden light, "
            "growth and wealth building concept, modern premium composition, no text, no logos."
        ),
    },
    {
        "filename": "thumb-tax.png",
        "size": "1024x1024",
        "prompt": (
            "Article thumbnail for tax savings and furusato nozei. Beautiful Japanese countryside "
            "landscape with golden rice fields, gentle hills, warm sunlight, tasteful dark navy "
            "foreground accents, hometown and regional support concept, modern editorial image, "
            "no text, no logos."
        ),
    },
    {
        "filename": "thumb-salary.png",
        "size": "1024x1024",
        "prompt": (
            "Article thumbnail for reading a salary slip. Clean professional document or receipt "
            "on a dark navy desk, abstract golden numbers and yen-like financial symbols floating "
            "as light shapes, organized business mood, modern Japanese fintech style, "
            "no readable text, no logos."
        ),
    },
    {
        "filename": "thumb-housing.png",
        "size": "1024x1024",
        "prompt": (
            "Article thumbnail for moving out and first apartment. Modern compact apartment interior "
            "or exterior for a young adult lifestyle in Japan, warm welcoming light, navy and gold "
            "accents, clean contemporary design, aspirational but realistic, no text, no logos."
        ),
    },
]


def create_image(client, spec: dict) -> bytes:
    request = {
        "model": MODEL,
        "prompt": spec["prompt"],
        "size": spec["size"],
        "quality": "high",
        "output_format": "png",
        "n": 1,
        "response_format": "b64_json",
    }

    try:
        response = client.images.generate(**request)
    except TypeError as exc:
        if "response_format" not in str(exc):
            raise
        request.pop("response_format")
        response = client.images.generate(**request)
    except Exception as exc:
        if "response_format" not in str(exc):
            raise
        request.pop("response_format")
        response = client.images.generate(**request)

    b64_json = response.data[0].b64_json
    if not b64_json:
        raise RuntimeError("Image response did not include b64_json data.")
    return base64.b64decode(b64_json)


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    load_openai_key_from_shell_files()

    if not os.environ.get("OPENAI_API_KEY"):
        print(
            "OPENAI_API_KEY is not set in the environment or common shell startup files.",
            file=sys.stderr,
        )
        return 2

    try:
        from openai import OpenAI
    except ModuleNotFoundError:
        print(
            "The openai Python package is not installed. Install it with: "
            "python3 -m pip install --user openai",
            file=sys.stderr,
        )
        return 3

    client = OpenAI()
    saved = []
    failed = []

    for index, spec in enumerate(IMAGE_SPECS, start=1):
        output_path = OUTPUT_DIR / spec["filename"]
        print(f"[{index}/{len(IMAGE_SPECS)}] Generating {spec['filename']}...")
        try:
            png_bytes = create_image(client, spec)
            output_path.write_bytes(png_bytes)
            saved.append(output_path)
            print(f"  saved: {output_path}")
        except Exception as exc:
            failed.append((spec["filename"], exc))
            print(f"  failed: {spec['filename']}: {exc}", file=sys.stderr)
        time.sleep(1)

    print("\nSaved images:")
    for path in saved:
        print(f"- {path}")

    if failed:
        print("\nFailed images:", file=sys.stderr)
        for filename, exc in failed:
            print(f"- {filename}: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""
assign_thumbs.py
----------------
assets/thumbnails/ に画像を入れてから実行すると、
ファイル名のタイムスタンプ順に記事へ1対1で割り当て、
articles/index.html の data-thumb 属性を書き換えます。

APIキー不要・無料で動作します。

使い方:
  python3 assign_thumbs.py
"""
import re
from pathlib import Path

THUMBS_DIR = Path(__file__).parent / "assets" / "thumbnails"
INDEX_HTML  = Path(__file__).parent / "articles" / "index.html"

ARTICLES = [
    "tax-savings.html",
    "student-card.html",
    "smartphone-pay.html",
    "salary-payslip.html",
    "point-basics.html",
    "nisa-card.html",
    "money-basics.html",
    "life-insurance.html",
    "investment-types.html",
    "index-fund.html",
    "ideco.html",
    "housing-costs.html",
    "health-insurance.html",
    "first-card-guide.html",
    "emergency-fund.html",
    "cashless-guide.html",
    "card-screening.html",
    "student-loan.html",
    "smartphone-cost.html",
    "saving-tips.html",
    "ribo-danger.html",
    "online-broker.html",
    "online-bank.html",
    "nenkin-basics.html",
    "kakeibo-app.html",
    "freelance-tax.html",
    "fixed-costs.html",
]

EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

# thumbnails/ 直下に置いても構わないファイル（除外）
EXCLUDE_PREFIXES = ("article-", "thumb-")


def load_user_images():
    """ユーザーが追加した画像をファイル名順で返す（既存のthumb-*/article-*は除外）"""
    images = []
    for p in sorted(THUMBS_DIR.iterdir()):
        if p.suffix.lower() not in EXTENSIONS:
            continue
        if any(p.name.startswith(prefix) for prefix in EXCLUDE_PREFIXES):
            continue
        images.append(p)
    return images


def update_html(mapping: dict[str, str]):
    html = INDEX_HTML.read_text(encoding="utf-8")

    for href, img_filename in mapping.items():
        thumb_path = f"thumbnails/{img_filename}"
        pattern = (
            rf'(<a class="article-list-item" href="{re.escape(href)}"[^>]*>'
            rf'[\s\S]*?)<div class="article-list-thumb"[^>]*data-thumb="[^"]*"'
        )
        replacement = rf'\1<div class="article-list-thumb" data-thumb="{thumb_path}"'
        html, n = re.subn(pattern, replacement, html)
        status = "✓" if n else "⚠ not found"
        print(f"  [{status}] {href}  ←  {img_filename}")

    INDEX_HTML.write_text(html, encoding="utf-8")


def main():
    images = load_user_images()

    if not images:
        print(f"画像が見つかりません: {THUMBS_DIR}")
        print("assets/thumbnails/ にChatGPTなどで用意した画像を入れてから再実行してください。")
        print("（article-* / thumb-* で始まるファイルは自動で除外されます）")
        return

    print(f"ユーザー画像 {len(images)} 枚を検出（ファイル名順）:")
    for p in images:
        print(f"  {p.name}")

    if len(images) < len(ARTICLES):
        print(f"\n⚠ 画像が {len(ARTICLES)} 枚に満たないため、後半の記事は割り当てられません。")

    # タイムスタンプ順に記事へ1対1で割り当て
    mapping = {}
    for i, href in enumerate(ARTICLES):
        img = images[i % len(images)]  # 画像が足りない場合は循環
        mapping[href] = img.name

    print(f"\n記事 {len(ARTICLES)} 件を割り当て中:")
    update_html(mapping)

    print("\n完了！ articles/index.html を確認してください。")


if __name__ == "__main__":
    main()

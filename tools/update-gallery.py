"""Aggiorna l'elenco offline e il fallback HTML leggendo assets/gallery."""

import json
import re
from html import escape
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parent.parent
GALLERY = ROOT / "assets" / "gallery"
EXTENSIONS = {".avif", ".webp", ".jpg", ".jpeg", ".png", ".gif"}


def natural_key(value):
    return [
        (0, int(part)) if part.isdigit() else (1, part.casefold())
        for part in re.split(r"(\d+)", value)
    ]


def preference(path):
    return (path.stem.lower().endswith("-bw"), path.suffix.lower() == ".webp")


def main():
    unique = {}
    for path in sorted(GALLERY.iterdir(), key=lambda item: natural_key(item.name)):
        if not path.is_file() or path.name.startswith("."):
            continue
        if path.suffix.lower() not in EXTENSIONS:
            continue
        key = re.sub(r"-bw$", "", path.stem, flags=re.IGNORECASE).casefold()
        if key not in unique or preference(path) > preference(unique[key]):
            unique[key] = path

    files = sorted((path.name for path in unique.values()), key=natural_key)
    data = json.dumps(files, ensure_ascii=False, indent=2)
    (ROOT / "js" / "gallery-data.js").write_text(
        "/* Generato da tools/update-gallery.py. */\n"
        f"window.ORESTE_GALLERY = {data};\n",
        encoding="utf-8",
    )

    figures = []
    center = min(2, (len(files) - 1) // 2)
    for index, filename in enumerate(files):
        position = index - center if index < 5 else 3
        active = " is-active" if position == 0 else ""
        spare = " is-spare" if index >= 5 else ""
        label = re.sub(r"-bw$", "", Path(filename).stem, flags=re.IGNORECASE)
        label = re.sub(r"^tattoo[-_]?\d+[-_]?", "", label, flags=re.IGNORECASE)
        label = re.sub(r"[-_]+", " ", label)
        figures.extend([
            f'            <figure class="gallery-card{active}{spare}" data-position="{position}"',
            '              role="group" aria-roledescription="diapositiva"',
            f'              aria-label="{index + 1} di {len(files)}: {escape(label, quote=True)}">',
            f'              <img src="assets/gallery/{quote(filename)}"',
            f'                alt="Tatuaggio di Oreste Coscia: {escape(label, quote=True)}"',
            '                width="600" height="800" loading="lazy">',
            '            </figure>',
        ])

    html_path = ROOT / "index.html"
    html = html_path.read_text(encoding="utf-8")
    html = re.sub(
        r'(<div class="carousel-stage" id="gallery-stage">)\n.*?(\n          </div>)',
        lambda match: match[1] + "\n" + "\n".join(figures) + match[2],
        html,
        count=1,
        flags=re.DOTALL,
    )
    html_path.write_text(html, encoding="utf-8")
    print(f"Galleria aggiornata: {len(files)} foto.")


if __name__ == "__main__":
    main()

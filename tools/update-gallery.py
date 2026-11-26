"""Aggiorna l'elenco offline e le due gallerie HTML leggendo assets/gallery.

Includere la parola "piercing" nel nome delle relative foto, per esempio
"piercing-naso.webp". Gli altri file vengono assegnati ai tatuaggi.
"""

import json
import re
from html import escape
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parent.parent
GALLERY = ROOT / "assets" / "gallery"
EXTENSIONS = {".avif", ".webp", ".jpg", ".jpeg", ".png", ".gif"}
PIERCING_NAME = re.compile(r"(?:^|[-_\s])piercing(?:$|[-_\s])", re.IGNORECASE)


def natural_key(value):
    return [
        (0, int(part)) if part.isdigit() else (1, part.casefold())
        for part in re.split(r"(\d+)", value)
    ]


def preference(path):
    return (path.stem.lower().endswith("-bw"), path.suffix.lower() == ".webp")


def static_figures(files):
    figures = []
    center = max(0, min(2, (len(files) - 1) // 2))
    for index, filename in enumerate(files):
        position = index - center if index < 5 else 3
        active = " is-active" if position == 0 else ""
        spare = " is-spare" if index >= 5 else ""
        label = re.sub(r"-bw$", "", Path(filename).stem, flags=re.IGNORECASE)
        label = re.sub(r"^tattoo[-_]?\d+[-_]?", "", label, flags=re.IGNORECASE)
        label = re.sub(r"[-_]+", " ", label) or "Lavoro di Oreste Coscia"
        label = escape(label, quote=True)
        figures.extend([
            f'            <figure class="gallery-card{active}{spare}" data-position="{position}"',
            '              role="group" aria-roledescription="diapositiva"',
            f'              aria-label="{index + 1} di {len(files)}: {label}">',
            f'              <img src="assets/gallery/{quote(filename)}"',
            f'                alt="{label}" width="600" height="800" loading="lazy">',
            '            </figure>',
        ])
    return "".join(f"\n{line}" for line in figures)


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
    photos_by_category = {"tatuaggi": [], "piercing": []}
    for filename in files:
        category = "piercing" if PIERCING_NAME.search(Path(filename).stem) else "tatuaggi"
        photos_by_category[category].append(filename)

    html_path = ROOT / "index.html"
    html = html_path.read_text(encoding="utf-8")
    for category, photos in photos_by_category.items():
        pattern = rf'(<div class="carousel-stage" id="gallery-{category}-stage">).*?(\n          </div>)'
        html, replacements = re.subn(
            pattern,
            lambda match: match[1] + static_figures(photos) + match[2],
            html,
            flags=re.DOTALL,
        )
        if replacements != 1:
            raise ValueError(f"Contenitore HTML non univoco per la galleria {category}.")

    data = json.dumps(files, ensure_ascii=False, indent=2)
    (ROOT / "js" / "gallery-data.js").write_text(
        "/* Generato da tools/update-gallery.py. */\n"
        f"window.ORESTE_GALLERY = {data};\n",
        encoding="utf-8",
    )

    html_path.write_text(html, encoding="utf-8")
    summary = ", ".join(
        f"{category}: {len(photos)}" for category, photos in photos_by_category.items()
    )
    print(f"Gallerie aggiornate ({summary}).")


if __name__ == "__main__":
    main()

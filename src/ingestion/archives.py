"""Unpacks uploaded .zip files into a project's files/ folder.

Ingestion reads files/ flat (file names are the library keys), so archive folders are
flattened: name clashes get a " (2)" suffix and junk (__MACOSX, hidden files) is skipped.
Zips inside zips are unpacked too.
"""

import os
import shutil
import zipfile

JUNK_PARTS = {"__MACOSX", ".DS_Store", "Thumbs.db", "desktop.ini"}


def _is_junk(member: str) -> bool:
    parts = [p for p in member.replace("\\", "/").split("/") if p]
    return not parts or any(p in JUNK_PARTS or p.startswith(("._", "~$")) for p in parts)


def _free_name(folder: str, name: str) -> str:
    stem, ext = os.path.splitext(name)
    candidate, n = name, 2
    while os.path.exists(os.path.join(folder, candidate)):
        candidate, n = f"{stem} ({n}){ext}", n + 1
    return candidate


def extract_zip(zip_path: str, dest: str) -> list[str]:
    """Extracts every file of the archive into dest (flat); returns the new file names."""
    names = []
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            if info.is_dir() or _is_junk(info.filename):
                continue
            name = _free_name(dest, os.path.basename(info.filename.replace("\\", "/")))
            with zf.open(info) as src, open(os.path.join(dest, name), "wb") as out:
                shutil.copyfileobj(src, out)
            names.append(name)
    return names


def extract_archives(files_dir: str, max_rounds: int = 3) -> dict[str, int]:
    """Unpacks all .zip files in files_dir (nested ones too) and deletes them.

    Returns {archive name: files extracted}; a corrupt archive is kept and reported as -1.
    """
    report: dict[str, int] = {}
    for _ in range(max_rounds):
        archives = [
            f
            for f in sorted(os.listdir(files_dir))
            if f.lower().endswith(".zip") and f not in report
        ]
        if not archives:
            break
        for archive in archives:
            path = os.path.join(files_dir, archive)
            try:
                report[archive] = len(extract_zip(path, files_dir))
            except zipfile.BadZipFile:
                report[archive] = -1
                continue
            os.remove(path)
    return report

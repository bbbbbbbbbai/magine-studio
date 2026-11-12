from __future__ import annotations

import base64
import binascii
import re
import uuid
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image, UnidentifiedImageError

MAX_REFERENCE_BYTES = 8 * 1024 * 1024
_DATA_URL_PATTERN = re.compile(
    r"^data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$"
)
_EXTENSIONS = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}


class ReferenceImageError(ValueError):
    pass


@dataclass(frozen=True)
class SavedReference:
    path: Path
    url: str


def _decode_data_url(value: str) -> tuple[bytes, str, str]:
    match = _DATA_URL_PATTERN.match(value)
    if not match:
        raise ReferenceImageError("参考图必须是 PNG、JPEG 或 WebP 图片")
    content_type, encoded = match.groups()
    try:
        content = base64.b64decode("".join(encoded.split()), validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ReferenceImageError("参考图数据无法解析") from exc
    if not content:
        raise ReferenceImageError("参考图为空")
    if len(content) > MAX_REFERENCE_BYTES:
        raise ReferenceImageError("单张参考图不能超过 8 MB")
    try:
        with Image.open(BytesIO(content)) as image:
            image.verify()
            actual_format = image.format
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ReferenceImageError("参考图文件已损坏或格式不受支持") from exc
    expected_format = {
        "image/png": "PNG",
        "image/jpeg": "JPEG",
        "image/webp": "WEBP",
    }[content_type]
    if actual_format != expected_format:
        raise ReferenceImageError("参考图扩展类型与文件内容不一致")
    return content, content_type, _EXTENSIONS[content_type]


def save_reference_images(
    values: list[str],
    generation_id: uuid.UUID,
    media_dir: Path,
) -> list[SavedReference]:
    if not values:
        return []
    target = media_dir / "references"
    target.mkdir(parents=True, exist_ok=True)
    saved: list[SavedReference] = []
    try:
        for index, value in enumerate(values, start=1):
            content, _, extension = _decode_data_url(value)
            path = target / f"{generation_id}-{index}.{extension}"
            path.write_bytes(content)
            saved.append(
                SavedReference(
                    path=path,
                    url=f"/media/references/{path.name}",
                )
            )
    except Exception:
        remove_reference_files([item.path for item in saved])
        raise
    return saved


def remove_reference_files(paths: list[Path]) -> None:
    for path in paths:
        try:
            if path.is_file():
                path.unlink()
        except OSError:
            pass


def resolve_reference_paths(urls: list[str], media_dir: Path) -> list[Path]:
    root = media_dir.resolve()
    paths: list[Path] = []
    for url in urls:
        if not url.startswith("/media/references/"):
            continue
        candidate = (media_dir / url.removeprefix("/media/")).resolve()
        if candidate.is_relative_to(root) and candidate.is_file():
            paths.append(candidate)
    return paths


def reference_paths_from_urls(urls: list[str], media_dir: Path) -> list[Path]:
    root = media_dir.resolve()
    paths: list[Path] = []
    for url in urls:
        if not url.startswith("/media/references/"):
            continue
        candidate = (media_dir / url.removeprefix("/media/")).resolve()
        if candidate.is_relative_to(root):
            paths.append(candidate)
    return paths

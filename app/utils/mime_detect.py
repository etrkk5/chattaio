import os
from typing import Set

# Accepted document formats
ALLOWED_EXTENSIONS: Set[str] = {
    ".pdf", ".xlsx", ".docx", ".pptx", ".txt", ".md", ".csv"
}

def is_allowed_file(filename: str) -> bool:
    if not filename:
        return False
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS

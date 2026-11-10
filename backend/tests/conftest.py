import os
from pathlib import Path

RUNTIME_DIR = Path(__file__).parent / ".test-runtime"
RUNTIME_DIR.mkdir(exist_ok=True)

os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{(RUNTIME_DIR / 'api.db').as_posix()}"
os.environ["MEDIA_DIR"] = str(RUNTIME_DIR / "media")
os.environ["AUTO_CREATE_TABLES"] = "true"
os.environ["LLM_API_KEY"] = ""

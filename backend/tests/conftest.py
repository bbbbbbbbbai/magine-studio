import os
import uuid
from pathlib import Path

RUNTIME_DIR = Path(__file__).parent / ".test-runtime"
RUNTIME_DIR.mkdir(exist_ok=True)
_test_database = RUNTIME_DIR / "api.db"
if _test_database.exists():
    _test_database.unlink()

os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_test_database.as_posix()}"
os.environ["MEDIA_DIR"] = str(RUNTIME_DIR / "media")
os.environ["AUTO_CREATE_TABLES"] = "true"
os.environ["LLM_API_KEY"] = ""
os.environ["ROOT_USER_UUID"] = ""

TEST_USER_ID = uuid.UUID("11111111-1111-4111-8111-111111111111")

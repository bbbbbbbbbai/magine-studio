from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class UserInitialize(BaseModel):
    id: uuid.UUID


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: Literal["root", "guest"]
    created_at: datetime
    last_seen_at: datetime

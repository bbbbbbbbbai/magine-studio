"""add reference images

Revision ID: 20261112_0002
Revises: 20261110_0001
Create Date: 2026-11-12
"""

import sqlalchemy as sa

from alembic import op

revision = "20261112_0002"
down_revision = "20261110_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "generations",
        sa.Column("reference_images_json", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("generations", "reference_images_json")

"""add users and generation ownership

Revision ID: 20261112_0003
Revises: 20261112_0002
Create Date: 2026-11-12
"""

import sqlalchemy as sa

from alembic import op

revision = "20261112_0003"
down_revision = "20261112_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index(
        "uq_users_single_root",
        "users",
        ["role"],
        unique=True,
        postgresql_where=sa.text("role = 'root'"),
        sqlite_where=sa.text("role = 'root'"),
    )
    op.add_column(
        "generations",
        sa.Column("user_uuid", sa.Uuid(), nullable=True),
    )
    op.create_index(
        "ix_generations_user_uuid",
        "generations",
        ["user_uuid"],
    )


def downgrade() -> None:
    op.drop_index("ix_generations_user_uuid", table_name="generations")
    op.drop_column("generations", "user_uuid")
    op.drop_index("uq_users_single_root", table_name="users")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_table("users")

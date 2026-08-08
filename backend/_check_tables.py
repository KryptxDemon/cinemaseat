from app.config import settings
from sqlalchemy import create_engine, text

eng = create_engine(settings.database_url, future=True)
with eng.connect() as conn:
    rows = conn.execute(
        text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
    ).fetchall()
    print("public tables:", [r[0] for r in rows])
    v = conn.execute(text("SELECT version_num FROM alembic_version")).first()
    print("alembic version:", v[0] if v else None)
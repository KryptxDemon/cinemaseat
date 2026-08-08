"""Step 2 verification — import every runtime dep + the app.

Run with: python verify_step2_imports.py
"""
import sys

packages = [
    ("fastapi", "fastapi"),
    ("sqlalchemy", "sqlalchemy"),
    ("psycopg", "psycopg"),
    ("pydantic", "pydantic"),
    ("pydantic_settings", "pydantic_settings"),
    ("humps (from pyhumps)", "humps"),
    ("httpx", "httpx"),
    ("reportlab", "reportlab"),
    ("python-dotenv", "dotenv"),
    ("uvicorn", "uvicorn"),
]

ok = True
for label, mod in packages:
    try:
        m = __import__(mod)
        ver = getattr(m, "__version__", None) or getattr(m, "version", "n/a")
        print(f"  OK   {label:25s} -> {mod}=={ver}")
    except Exception as e:  # noqa: BLE001
        ok = False
        print(f"  FAIL {label:25s} -> {mod}: {e!r}")

# Config (uses pydantic-settings -> exercises the new dep).
try:
    from app.config import settings  # noqa: F401
    print(
        f"\n  OK   app.config.settings: app={settings.app_name!r} "
        f"env={settings.environment!r} ttl={settings.hold_ttl_seconds}s"
    )
    # Show the DSN with the password masked.
    dsn = settings.database_url
    masked = dsn.replace(":" + dsn.split(":")[2].split("@")[0] + "@", ":***@", 1)
    print(f"        database_url = {masked}")
except Exception as e:  # noqa: BLE001
    ok = False
    print(f"\n  FAIL app.config.settings: {e!r}")

# App import.
try:
    from app.main import app  # noqa: F401
    print(f"  OK   app.main.app imported cleanly ({len(app.routes)} routes)")
except Exception as e:  # noqa: BLE001
    ok = False
    print(f"  FAIL app.main.app: {e!r}")

sys.exit(0 if ok else 1)

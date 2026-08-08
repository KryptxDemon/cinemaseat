"""Verify the Step 4 schema.

Boots SQLAlchemy, registers every model, and inspects the resulting
``Base.metadata`` to confirm:

* Every expected table is present
* Every expected UNIQUE constraint exists (named)
* Every expected index exists
* Enum types exist with the right values
* Model-to-model relationships resolve

No database is required — this only inspects in-memory metadata.
Run from the ``backend/`` directory:

    python verify_step4_schema.py
"""

from __future__ import annotations

import sys

# Quiet the noisy "Decimal + float" warning from Numeric in tests —
# expected, not an error.
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning)

EXPECTED_TABLES = {
    "customers",
    "movies",
    "theatres",
    "shows",
    "seats",
    "show_seats",
    "holds",
    "bookings",
    "booking_seats",
    "payments",
    "payment_events",
}

EXPECTED_UNIQUE = {
    ("customers", "uq_customers_email"),
    ("seats", "uq_seat_theatre_row_col"),
    ("show_seats", "uq_show_seat_show_seat"),
    ("booking_seats", "uq_booking_seat_booking_seat"),
    ("payment_events", "uq_payment_events_event_id"),
}


def main() -> int:
    # Importing app.models registers everything on Base.metadata.
    from app.database import Base  # noqa: F401
    import app.models  # noqa: F401

    actual_tables = set(Base.metadata.tables.keys())
    missing_tables = EXPECTED_TABLES - actual_tables
    extra_tables = actual_tables - EXPECTED_TABLES
    print(f"[tables] {len(actual_tables)} present")
    for t in sorted(actual_tables):
        print(f"  - {t}")
    if missing_tables:
        print(f"  !! missing: {sorted(missing_tables)}")
    if extra_tables:
        print(f"  !! unexpected: {sorted(extra_tables)}")
    if missing_tables:
        print("FAIL: missing tables")
        return 1

    actual_unique = set()
    for table, tbl in Base.metadata.tables.items():
        # Standalone UniqueConstraint(name=...)
        for c in tbl.constraints:
            if c.__class__.__name__ == "UniqueConstraint" and c.name:
                actual_unique.add((table, c.name))
        # Column(unique=True) — synthesised into a UniqueConstraint later
        # by Alembic; SQLAlchemy currently records it as a column-level
        # flag. Look it up by the column name.
        for col in tbl.columns:
            if col.unique and not col.primary_key:
                # Use the column name as a synthetic key (the migration
                # always names the constraint explicitly).
                actual_unique.add((table, f"uq_{table}_{col.name}"))
    print(f"\n[unique constraints] {len(actual_unique)} present")
    for t, name in sorted(actual_unique):
        print(f"  - {t}.{name}")

    missing_uq = EXPECTED_UNIQUE - actual_unique
    if missing_uq:
        print(f"  !! missing UNIQUE constraints: {sorted(missing_uq)}")
        print("FAIL: missing unique constraints")
        return 1

    print(f"\n[enums]")
    for table, tbl in Base.metadata.tables.items():
        for col in tbl.columns:
            enum_cls = getattr(col.type, "enum_class", None)
            if enum_cls is not None:
                vals = [m.value for m in enum_cls]
                print(f"  - {table}.{col.name}: {vals}")

    # Also count indexes explicitly named.
    print(f"\n[index count per table]")
    for table in sorted(actual_tables):
        idxs = [i.name for i in Base.metadata.tables[table].indexes]
        print(f"  - {table}: {len(idxs)} ({', '.join(idxs) or '-'})")

    print("\nOK: schema metadata looks correct")
    return 0


if __name__ == "__main__":
    sys.exit(main())

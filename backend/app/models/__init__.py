"""SQLAlchemy ORM models for CinemaSeat.

Importing this package registers every model class with
``Base.metadata`` so that Alembic autogeneration (and
``Base.metadata.create_all`` for tests) see every table.
"""

from app.models.booking import Booking, BookingStatus
from app.models.booking_seat import BookingSeat
from app.models.customer import Customer
from app.models.hold import Hold, HoldStatus
from app.models.movie import Movie
from app.models.payment import Payment, PaymentStatus
from app.models.payment_event import PaymentEvent
from app.models.seat import Seat
from app.models.show import Show
from app.models.show_seat import ShowSeat, ShowSeatStatus
from app.models.theatre import Theatre

__all__ = [
    "Booking",
    "BookingSeat",
    "BookingStatus",
    "Customer",
    "Hold",
    "HoldStatus",
    "Movie",
    "Payment",
    "PaymentEvent",
    "PaymentStatus",
    "Seat",
    "Show",
    "ShowSeat",
    "ShowSeatStatus",
    "Theatre",
]

"""Step 1 verification: import the app and list all registered routes."""
from app.main import app

print("App title :", app.title)
print("App ver   :", app.version)
print("Routes    :")
for route in app.routes:
    if hasattr(route, "methods"):
        methods = sorted(route.methods - {"HEAD", "OPTIONS"})
        print(f"  {','.join(methods):8s} {route.path}")
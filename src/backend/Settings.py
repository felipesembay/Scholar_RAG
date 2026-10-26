import os

from fastapi.middleware.cors import CORSMiddleware


def setup_cors_client(app):
    """CORS for the React frontend: local defaults plus ALLOWED_ORIGINS (comma-separated)."""
    allowed_origins = [
        "http://localhost:3000",  # Vite dev server
        "http://localhost:3100",  # frontend container (docker-compose)
        "http://localhost:5173",  # Vite default port
    ]
    custom_origins = os.getenv("ALLOWED_ORIGINS", "")
    if custom_origins:
        allowed_origins.extend(o.strip() for o in custom_origins.split(",") if o.strip())

    print(f"[CORS] Origens permitidas: {allowed_origins}")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

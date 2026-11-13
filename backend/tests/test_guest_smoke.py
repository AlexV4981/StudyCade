"""Disposable FastAPI smoke checks. No live cloud service or user data."""
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from backend.guest import create_guest_app


class GuestSmokeTests(unittest.TestCase):
    def test_guest_app_public_routes_and_host_origin_boundaries(self):
        with tempfile.TemporaryDirectory() as root:
            Path(root, "index.html").write_text("<h1>Disposable app</h1>", encoding="utf-8")
            with patch.dict(os.environ, {
                "PUBLIC_ORIGIN": "",
                "RENDER_EXTERNAL_URL": "",
                "SUPABASE_URL": "",
                "SUPABASE_PUBLISHABLE_KEY": "",
                "CLOUD_SESSION_KEY": "",
                "CLOUD_ALLOWED_EMAIL_HASHES": "",
            }):
                app = create_guest_app(dist_dir=root)
            with TestClient(app, base_url="http://localhost") as client:
                self.assertEqual(client.get("/healthz").json(), {"status": "ok"})
                deployment = client.get("/api/deployment").json()
                self.assertEqual(deployment["mode"], "guest")
                self.assertFalse(deployment["cloudAvailable"])
                self.assertEqual(client.get("/").status_code, 200)
                self.assertEqual(client.get("/robots.txt").status_code, 200)
                self.assertEqual(client.get("/api/admin/users").status_code, 404)
                self.assertEqual(client.get("/api/cloud/session").status_code, 404)

                sample = {"name": "disposable.md", "content": "# Topic\nSynthetic source"}
                denied = client.post(
                    "/api/import/preview", json=sample,
                    headers={"origin": "https://unrelated.example"},
                )
                self.assertEqual(denied.status_code, 403)
                allowed = client.post(
                    "/api/import/preview", json=sample,
                    headers={"origin": "http://localhost"},
                )
                self.assertEqual(allowed.status_code, 200)
                self.assertIsInstance(allowed.json(), dict)


if __name__ == "__main__":
    unittest.main()

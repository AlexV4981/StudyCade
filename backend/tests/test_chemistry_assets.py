"""Only public generated assets should be served from the bundled frontend build."""
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.guest import create_guest_app

ROOT = Path(__file__).resolve().parents[2]

class ChemistryAssetsSmokeTests(unittest.TestCase):
    def test_bundled_assets_available_over_same_origin_without_external_requests(self):
        dist = ROOT / "frontend" / "dist"
        self.assertTrue((dist / "assets/chemistry/periodic-table.svg").exists(), "Build frontend first")
        with patch.dict(os.environ, {
            "PUBLIC_ORIGIN": "", "RENDER_EXTERNAL_URL": "", "SUPABASE_URL": "",
            "SUPABASE_PUBLISHABLE_KEY": "", "CLOUD_SESSION_KEY": "",
            "CLOUD_ALLOWED_EMAIL_HASHES": "",
        }):
            app = create_guest_app(dist_dir=dist)
        with TestClient(app,base_url="http://localhost") as client:
            periodic = client.get("/assets/chemistry/periodic-table.svg")
            self.assertEqual(periodic.status_code,200)
            self.assertIn("image/svg+xml",periodic.headers["content-type"])
            self.assertIn("Oganesson",periodic.text)
            element = client.get("/assets/chemistry/elements/008-o.svg")
            self.assertEqual(element.status_code,200)
            self.assertIn("Oxygen",element.text)
            listing = client.get("/assets/chemistry/catalog.json")
            self.assertEqual(listing.status_code,200)
            manifest=json.loads(listing.text)
            self.assertEqual(len(manifest["topics"]),40)
            self.assertEqual(len(manifest["elements"]),118)
            self.assertEqual(len(manifest["stockReferences"]),10)
            self.assertEqual(client.get("/assets/chemistry/not-real.svg").status_code,404)
            self.assertEqual(client.get("/assets/.env").status_code,404)

if __name__ == "__main__":
    unittest.main()

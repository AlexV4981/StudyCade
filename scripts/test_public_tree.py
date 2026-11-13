import unittest
from check_public_tree import allowed_example_email, inspect


class PublicTreeCheckTests(unittest.TestCase):
    def test_example_addresses_allowed(self):
        self.assertTrue(allowed_example_email("guest@studycade.local"))
        self.assertTrue(allowed_example_email("alice@example.com"))
        self.assertFalse(allowed_example_email("real@" + "school.edu"))

    def test_credential_patterns_report_without_echoing_values(self):
        key = "ghp_" + "A" * 40
        findings = inspect("test.md", "token = " + key)
        self.assertTrue(any(reason == "GitHub token" for _, reason in findings))
        self.assertNotIn(key, repr(findings))

    def test_real_email_and_private_key_markers(self):
        findings = inspect("test.md", "Contact real@" + "school.edu" + "\n-----BEGIN PRIVATE KEY-----")
        self.assertIn((1, "non-example email address"), findings)
        self.assertIn((2, "private key block"), findings)

    def test_configuration_name_is_not_a_secret(self):
        self.assertEqual(inspect("test.md", "Set CLOUD_SESSION_KEY as a deployment secret."), [])
        self.assertEqual(inspect("test.js", 'const guest = "guest@studycade.local";'), [])


if __name__ == "__main__":
    unittest.main()

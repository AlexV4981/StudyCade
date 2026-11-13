import unittest

from backend.content import preview_document, preview_exam
from backend.headers import security_headers


class MarkdownImageTests(unittest.TestCase):
    def test_note_image_keeps_original_markdown_and_warns_about_explicit_loading(self):
        markdown = (
            "# [BIO] Cell structure\n\n"
            "## [BIO] Q1 · Label the diagram\n\n"
            "> [!RECALL]\n"
            "> Describe the cell using the supplied labels.\n"
            "> ![Cell diagram](https://upload.wikimedia.org/wikipedia/commons/a/a0/Example.jpg)\n\n"
            "> [!ANSWER]\n"
            "> Use the named structures in the source.\n"
        )
        parsed = preview_document("cell.md", markdown, "biology")
        self.assertEqual(parsed["content"], markdown)
        self.assertEqual(parsed["source"], markdown)
        self.assertIn("![Cell diagram]", parsed["sections"][-1]["content"])
        self.assertTrue(any("Load image" in warning for warning in parsed["warnings"]))

    def test_same_origin_image_reference_is_not_converted_or_fetched(self):
        markdown = "# [BIO] Diagram\n\n![Cell](/subjects/biology.svg)\n"
        parsed = preview_document("diagram.md", markdown)
        self.assertEqual(parsed["content"], markdown)
        self.assertTrue(any("image reference" in warning.lower() for warning in parsed["warnings"]))

    def test_https_images_allowed_only_for_images_by_browser_policy(self):
        csp = security_headers()["Content-Security-Policy"]
        self.assertIn("img-src 'self' data: https:", csp)
        self.assertIn("connect-src 'self'", csp)
        self.assertIn("object-src 'none'", csp)
        self.assertEqual(security_headers()["Referrer-Policy"], "no-referrer")


if __name__ == "__main__":
    unittest.main()

"""Network-free collector regression tests. Synthetic data are test-only."""
import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch
import json
import base64

spec = importlib.util.spec_from_file_location('collector', Path(__file__).parents[1] / 'collector' / 'sync_nba.py')
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

class UploadTest(unittest.TestCase):
    def test_large_payload_and_small_receipt(self):
        snapshot = {'source': 'nba_api', 'season': 2025, 'competition': 'regular', 'fetchedAt': '2026-10-11T00:00:00Z', 'players': [{'games': [{}], 'testOnly': 'x' * 11_000_000}], 'teamGames': []}
        chunks = {}
        def post(url, json, **kwargs):
            self.assertTrue(url.endswith('/api/nba/upload'))
            self.assertLess(len(__import__('json').dumps(json).encode()), 750_000)
            class R:
                ok = True
                status_code = 200
                def json(self):
                    if json['operation'] == 'part':
                        chunks[json['index']] = base64.b64decode(json['data'])
                        return {'ok': True}
                    reconstructed = __import__('json').loads(b''.join(chunks[i] for i in range(json['parts'])))
                    self_outer.assertEqual(reconstructed, snapshot)
                    return {'verified': True, 'sha256': json['sha256'], 'fetchedAt': snapshot['fetchedAt'], 'players': 1, 'totalGames': 1, 'teamGames': 0}
            return R()
        self_outer = self
        with patch.dict(os.environ, {'PLAY_METRIC_SERVICE_TOKEN': 'test-only-' * 8}), patch('requests.post', side_effect=post):
            # Determine the existing upload function name independently of CLI.
            collector.upload(snapshot, 'https://example.test')

if __name__ == '__main__':
    unittest.main()

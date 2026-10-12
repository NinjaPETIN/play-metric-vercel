import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('sync',Path(__file__).parents[1]/'collector'/'sync_nba.py')
sync=importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

class ScheduledTests(unittest.TestCase):
    def test_quick_sync_does_not_call_optional_enrichment(self):
        snapshot={'source':'nba_api','season':2025,'competition':'regular','players':[{'id':1,'games':[{'date':'2026-01-01'}]}]}
        with patch('sys.argv',['sync','--competition','regular','--skip-calendar','--skip-enrichment','--upload','https://example.test']),patch.object(sync,'fetch_snapshot',return_value=snapshot),patch.object(sync,'write_snapshot'),patch.object(sync,'upload'),patch.object(sync,'sync_profiles') as profiles,patch('requests.get') as get:
            sync.main()
            profiles.assert_not_called()
            get.assert_not_called()

if __name__=='__main__':unittest.main()

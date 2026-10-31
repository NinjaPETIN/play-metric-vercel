import json,tempfile,unittest
from pathlib import Path
from unittest.mock import Mock,patch
import sync_league_traits as sync

class TrackingTests(unittest.TestCase):
    def test_unavailable_tracking_is_reported_and_never_uploaded(self):
        catalog=Mock();catalog.json.return_value={'season':2026,'players':[{'id':2544}]}
        existing=Mock();existing.json.return_value={'players':[]}
        with tempfile.TemporaryDirectory() as tmp,patch.dict('os.environ',{'PLAY_METRIC_SERVICE_TOKEN':'x'*32}),patch.object(sync.requests,'get',side_effect=[catalog,existing]),patch.object(sync.requests,'post') as post,patch.object(sync,'collect',side_effect=TimeoutError):
            path=Path(tmp)/'report.json'
            with self.assertRaises(RuntimeError):sync.sync_league_traits('https://example.test',competitions=['regular'],report_path=path)
            post.assert_not_called();report=json.loads(path.read_text())
            self.assertEqual(report['status'],'unavailable');self.assertEqual(len(report['sources']),3)
            self.assertTrue(all(s['status']=='unavailable' and s['players']==0 for s in report['sources']))

    def test_one_failed_source_does_not_prevent_verified_independent_import(self):
        catalog=Mock();catalog.json.return_value={'season':2026,'players':[{'id':2544}]}
        existing=Mock();existing.json.return_value={'players':[]}
        saved=Mock()
        data={'games':4,'passes':100,'assists':20}
        def post(url,**kw):
            body=kw['json'];saved.json.return_value={'players':[{'playerId':'2544','sources':{'passes':{'fetchedAt':body['fetchedAt'],'data':data}}}]};return Mock()
        with tempfile.TemporaryDirectory() as tmp,patch.dict('os.environ',{'PLAY_METRIC_SERVICE_TOKEN':'x'*32}),patch.object(sync.requests,'get',side_effect=[catalog,existing,saved]),patch.object(sync.requests,'post',side_effect=post),patch.object(sync,'collect',side_effect=[TimeoutError(),{'2544':data},TimeoutError()]):
            path=Path(tmp)/'report.json'
            with self.assertRaises(RuntimeError):sync.sync_league_traits('https://example.test',competitions=['regular'],report_path=path)
            report=json.loads(path.read_text());self.assertEqual(report['status'],'partial');self.assertEqual(report['sources'][1]['status'],'verified');self.assertEqual(report['sources'][1]['players'],1)

if __name__=='__main__':unittest.main()

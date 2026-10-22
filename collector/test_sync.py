import unittest
from sync_nba import normalize
class NormalizationTests(unittest.TestCase):
    def test_normalize(self):
        row={'PLAYER_ID':203999,'GAME_ID':'1','WL':'W','MIN':32.5,'PTS':25,'REB':8,'AST':7,'FG3M':2,'MATCHUP':'DEN vs. BOS','GAME_DATE':'2025-11-04T00:00:00','PLAYER_NAME':'Nikola Jokic'}
        data=normalize([row,row,{**row,'GAME_ID':'2','PTS':None},{**row,'GAME_ID':'3','MIN':0}],2025)
        self.assertEqual(len(data['players']),1)
        self.assertEqual(len(data['players'][0]['games']),1)
        game=data['players'][0]['games'][0]
        self.assertTrue(game['home']);self.assertEqual(game['opponent'],'BOS');self.assertEqual(game['date'],'2025-11-04')
    def test_away(self):
        row={'PLAYER_ID':1,'GAME_ID':'1','WL':'L','MIN':12,'PTS':0,'REB':0,'AST':0,'FG3M':0,'MATCHUP':'DEN @ NYK','GAME_DATE':'2025-11-05','PLAYER_NAME':'Player'}
        self.assertFalse(normalize([row],2025)['players'][0]['games'][0]['home'])

class SeasonTests(unittest.TestCase):
    def test_rollover_and_offseason(self):
        from sync_nba import season_candidates
        from datetime import datetime, timezone
        self.assertEqual(season_candidates(datetime(2026, 10, 8, tzinfo=timezone.utc)), ['2026-27', '2025-26'])
        self.assertEqual(season_candidates(datetime(2026, 7, 1, tzinfo=timezone.utc))[0], '2025-26')
    def test_latest_team_survives_unsorted_rows(self):
        row={'PLAYER_ID':1,'GAME_ID':'1','WL':'W','MIN':20,'PTS':5,'REB':2,'AST':1,'FG3M':0,'MATCHUP':'BOS vs. DEN','GAME_DATE':'2025-11-04','PLAYER_NAME':'Player','TEAM_ABBREVIATION':'BOS'}
        recent={**row,'GAME_ID':'2','GAME_DATE':'2026-02-01','TEAM_ABBREVIATION':'NYK'}
        self.assertEqual(normalize([row,recent],2025)['players'][0]['team'], 'NYK')

class RetryTests(unittest.TestCase):
    def test_retries_failure_without_inventing_snapshot(self):
        from unittest.mock import patch
        from sync_nba import fetch_snapshot
        with patch('nba_api.stats.endpoints.playergamelogs.PlayerGameLogs', side_effect=TimeoutError), patch('sync_nba.time.sleep') as sleep:
            with self.assertRaises(RuntimeError): fetch_snapshot('2025-26')
            self.assertEqual(sleep.call_count, 2)
    def test_empty_success_is_empty_not_error(self):
        from unittest.mock import patch
        from sync_nba import fetch_snapshot
        with patch('nba_api.stats.endpoints.playergamelogs.PlayerGameLogs') as endpoint:
            endpoint.return_value.get_normalized_dict.return_value={'PlayerGameLogs':[]}
            self.assertEqual(fetch_snapshot('2026-27')['players'], [])
            self.assertEqual(endpoint.call_count, 1)
    def test_missing_dataset_is_failure(self):
        from unittest.mock import patch
        from sync_nba import fetch_snapshot
        with patch('nba_api.stats.endpoints.playergamelogs.PlayerGameLogs') as endpoint, patch('sync_nba.time.sleep'):
            endpoint.return_value.get_normalized_dict.return_value={}
            with self.assertRaises(RuntimeError): fetch_snapshot('2025-26')

class ExtendedTests(unittest.TestCase):
    def test_competitions_and_missing_stats(self):
        row={'PLAYER_ID':1,'GAME_ID':'1','WL':'W','MIN':12,'PTS':0,'REB':0,'AST':0,'FG3M':0,'STL':0,'BLK':None,'MATCHUP':'DEN @ NYK','GAME_DATE':'2026-10-05','PLAYER_NAME':'Player'}
        data=normalize([row],2026,'preseason')
        self.assertEqual(data['competition'],'preseason');self.assertEqual(data['players'][0]['games'][0]['steals'],0)
        self.assertNotIn('blocks',data['players'][0]['games'][0])
    def test_calendar_status_and_timezone(self):
        from sync_nba import normalize_calendar
        game={'gameId':'0012600001','gameCode':'20261009/BOSNYK','gameDateTimeUTC':'2026-10-10T00:00:00Z','gameStatus':1,'gameStatusText':'7:00 pm ET','homeTeam':{'teamId':1,'teamTricode':'NYK','teamName':'Knicks','score':0},'awayTeam':{'teamId':2,'teamTricode':'BOS','teamName':'Celtics','score':0}}
        data=normalize_calendar({'leagueSchedule':{'seasonYear':'2026-27','gameDates':[{'games':[game,game]}]}},'2026-27')
        self.assertEqual(len(data['games']),1);self.assertIsNone(data['games'][0]['homeScore']);self.assertEqual(data['games'][0]['competition'],'preseason')
        self.assertEqual(data['games'][0]['startsAt'],'2026-10-10T00:00:00+00:00')

class TeamResultTests(unittest.TestCase):
    def rows(self):
        return [{'GAME_ID':'0022500001','TEAM_ABBREVIATION':'BOS','MATCHUP':'BOS vs. NYK','PTS':112,'WL':'W','GAME_DATE':'2026-04-12'}, {'GAME_ID':'0022500001','TEAM_ABBREVIATION':'NYK','MATCHUP':'NYK @ BOS','PTS':108,'WL':'L','GAME_DATE':'2026-04-12'}]
    def test_official_scores_and_duplicate_rows(self):
        from sync_nba import normalize_team_games
        rows=self.rows();games=normalize_team_games(rows+rows)
        self.assertEqual(len(games),1);self.assertEqual((games[0]['homeScore'],games[0]['awayScore']),(112,108))
    def test_partial_and_contradictory_results_are_rejected(self):
        from sync_nba import normalize_team_games
        rows=self.rows();self.assertEqual(normalize_team_games(rows[:1]),[])
        self.assertEqual(normalize_team_games([rows[0],dict(rows[1],WL='W')]),[])
    def test_original_team_preserved_per_game(self):
        row={'PLAYER_ID':1,'GAME_ID':'0022500001','WL':'W','MIN':20,'PTS':5,'REB':2,'AST':1,'FG3M':0,'MATCHUP':'BOS vs. DEN','GAME_DATE':'2025-11-04','PLAYER_NAME':'Player','TEAM_ABBREVIATION':'BOS'}
        recent={**row,'GAME_ID':'0022500002','GAME_DATE':'2026-02-01','TEAM_ABBREVIATION':'NYK','MATCHUP':'NYK vs. DEN'}
        player=normalize([row,recent],2025)['players'][0]
        self.assertEqual(player['team'],'NYK');self.assertEqual([g['team'] for g in player['games']],['NYK','BOS'])

if __name__=='__main__': unittest.main()

export const state = {
  companySlug: null,
  company: null,
  standings: [],
  teams: [],
  photos: [],
  tournamentId: null,
  tournament: null,
  stats: {
    players: [],
    teams: []
  },
  fixture: [],
  standings: [],
  teams: [],
  photos: [],

  fixtureFilter: "all",
  fixtureDateKey: "all",
  fixturePage: 1,
  fixturePageSize: 3,
  fixtureSearch: "",

  activeTab: "fixture",
  playerSummary: [],
  loading: true,
  pageError: ""
};
export const state = {
  company: null,
  tournamentId: null,
  tournament: null,

  activeTab: "summary",

  participants: [],
  teams: [],
  companyTeams: [],
  matches: [],
  standings: [],

  scorers: [],
  playerStats: [],
  teamStats: [],

  matchEvents: [],
  eventPlayers: [],
  matchPhotos: [],

  ui: {
    participantMessage: "",
    participantError: "",
    teamMessage: "",
    teamError: "",
    fixtureMessage: "",
    fixtureError: "",
    resultsMessage: "",
    resultsError: "",
    standingsMessage: "",
    standingsError: "",
    eventMessage: "",
    eventError: "",
    photosMessage: "",
    photosError: "",

    selectedPhotosMatchId: "",
    uploadingPhoto: false
  }
};
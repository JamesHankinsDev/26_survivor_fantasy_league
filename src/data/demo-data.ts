import { Castaway } from "@/types/castaway";
import { League } from "@/types/league";

export const DEMO_USER_ID = "demo-user";
export const DEMO_LEAGUE_ID = "demo-league-50";

export const DEMO_CASTAWAYS: Castaway[] = [
  // --- Active castaways ---
  {
    id: "cirie-fields",
    name: "Cirie Fields",
    image:
      "https://www.tvinsider.com/wp-content/uploads/2025/05/survivor-50-cast-cirie-fields-676x1014.jpg",
    bio: "Previously competed on: Season 12, 16, 20, 34.",
    totalPoints: 38,
    eliminated: false,
    weeklyEvents: {
      "1": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "2": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
      ],
      "3": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "immunity_win", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "4": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "found_idol", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "5": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "immunity_win", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
    },
  },
  {
    id: "ozzy-lusth",
    name: "Ozzy Lusth",
    image:
      "https://www.tvinsider.com/wp-content/uploads/2025/05/survivor-50-cast-ozzy-724x1014.jpg",
    bio: "Previously competed on: Season 13, 16, 23, 34.",
    totalPoints: 31,
    eliminated: false,
    weeklyEvents: {
      "1": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "immunity_win", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "2": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "3": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
      ],
      "4": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "5": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
      ],
    },
  },
  {
    id: "dee-valladares",
    name: "Dee Valladares",
    image:
      "https://www.tvinsider.com/wp-content/uploads/2025/05/survivor-50-cast-dee-valladares-811x1014.jpg",
    bio: "Previously competed on: Season 45 (Winner).",
    totalPoints: 33,
    eliminated: false,
    weeklyEvents: {
      "1": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "2": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "immunity_win", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "3": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "found_idol", count: 1 },
      ],
      "4": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "5": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
    },
  },
  {
    id: "christian-hubicki",
    name: "Christian Hubicki",
    image:
      "https://www.tvinsider.com/wp-content/uploads/2025/05/survivor-50-cast-christian-724x1014.jpg",
    bio: "Previously competed on: Season 37.",
    totalPoints: 22,
    eliminated: false,
    weeklyEvents: {
      "1": [{ eventType: "survived_episode", count: 1 }],
      "2": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
      ],
      "3": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "4": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "5": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "immunity_win", count: 1 },
      ],
    },
  },
  {
    id: "charlie-davis",
    name: "Charlie Davis",
    image:
      "https://www.tvinsider.com/wp-content/uploads/2025/05/survivor-50-cast-charlie-davis-811x1014.jpg",
    bio: "Previously competed on: Season 46.",
    totalPoints: 14,
    eliminated: false,
    weeklyEvents: {
      "1": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
      ],
      "2": [{ eventType: "survived_episode", count: 1 }],
      "3": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
      ],
      "4": [{ eventType: "survived_episode", count: 1 }],
      "5": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
    },
  },
  {
    id: "emily-flippen",
    name: "Emily Flippen",
    image:
      "https://www.tvinsider.com/wp-content/uploads/2025/05/survivor-50-cast-emily-flippen-812x1014.jpg",
    bio: "Previously competed on: Season 45.",
    totalPoints: 8,
    eliminated: false,
    weeklyEvents: {
      "1": [{ eventType: "survived_episode", count: 1 }],
      "2": [{ eventType: "survived_episode", count: 1 }],
      "3": [{ eventType: "survived_episode", count: 1 }],
      "4": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
      ],
      "5": [{ eventType: "survived_episode", count: 1 }],
    },
  },

  // --- Eliminated castaways ---
  {
    id: "angelina-keeley",
    name: "Angelina Keeley",
    image:
      "https://www.tvinsider.com/wp-content/uploads/2025/05/survivor-50-cast-angelina-keeley-724x1014.jpg",
    bio: "Previously competed on: Season 37.",
    totalPoints: -9,
    eliminated: true,
    eliminatedWeek: 1,
    weeklyEvents: {
      "1": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "voted_out", count: 1 },
      ],
    },
  },
  {
    id: "q-burdette",
    name: "Q Burdette",
    image:
      "https://www.tvinsider.com/wp-content/uploads/2025/05/survivor-50-cast-q-burdette-811x1014.jpg",
    bio: "Previously competed on: Season 46.",
    totalPoints: -5,
    eliminated: true,
    eliminatedWeek: 2,
    weeklyEvents: {
      "1": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
      ],
      "2": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "voted_out", count: 1 },
      ],
    },
  },
  {
    id: "rick-devens",
    name: "Rick Devens",
    image:
      "https://www.tvinsider.com/wp-content/uploads/2025/05/survivor-50-cast-rick-devens-823x1014.jpg",
    bio: "Previously competed on: Season 38.",
    totalPoints: 4,
    eliminated: true,
    eliminatedWeek: 3,
    weeklyEvents: {
      "1": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "2": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "found_idol", count: 1 },
      ],
      "3": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "used_idol_successfully", count: 1 },
        { eventType: "voted_out", count: 1 },
      ],
    },
  },
  {
    id: "colby-donaldson",
    name: "Colby Donaldson",
    image:
      "https://www.tvinsider.com/wp-content/uploads/2025/05/survivor-50-cast-colby-donaldson-995x1014.jpg",
    bio: "Previously competed on: Season 2, 8, 20.",
    totalPoints: 9,
    eliminated: true,
    eliminatedWeek: 4,
    weeklyEvents: {
      "1": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "2": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "team_challenge_win", count: 1 },
      ],
      "3": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "voted_at_tribal", count: 1 },
      ],
      "4": [
        { eventType: "survived_episode", count: 1 },
        { eventType: "made_jury", count: 1 },
        { eventType: "voted_out", count: 1 },
      ],
    },
  },
];

const MEMBER_JOINED_AT = new Date("2025-09-14");
const MEMBER_DRAFTED_AT = new Date("2025-09-14");

const WEEK_LOCKED_DATES = [
  new Date("2025-09-17"), // week 1
  new Date("2025-09-24"), // week 2
  new Date("2025-10-01"), // week 3
  new Date("2025-10-08"), // week 4
  new Date("2025-10-15"), // week 5
];

export const DEMO_LEAGUE: League = {
  id: DEMO_LEAGUE_ID,
  name: "Season 50 Champions",
  ownerId: DEMO_USER_ID,
  ownerName: "Demo Player",
  maxPlayers: 8,
  currentPlayers: 4,
  joinCode: "DEMO50",
  members: [DEMO_USER_ID, "demo-player-2", "demo-player-3", "demo-player-4"],
  status: "active",
  seasonNumber: 50,
  createdAt: new Date("2025-09-15"),
  updatedAt: new Date("2025-09-15"),
  memberDetails: [
    // Member 1 — Demo User ("Fire Starters")
    {
      userId: DEMO_USER_ID,
      displayName: "Fire Starters",
      ownerName: "Demo Player",
      avatar: "",
      tribeColor: "#E85D2A",
      totalPoints: 124,
      joinedAt: MEMBER_JOINED_AT,
      draftedAt: MEMBER_DRAFTED_AT,
      roster: [
        "cirie-fields",
        "ozzy-lusth",
        "dee-valladares",
        "christian-hubicki",
        "charlie-davis",
      ],
      weeklyRosters: [
        {
          week: 1,
          castawayIds: [
            "cirie-fields",
            "ozzy-lusth",
            "colby-donaldson",
            "charlie-davis",
            "emily-flippen",
          ],
          weekScore: 28,
          lockedAt: WEEK_LOCKED_DATES[0],
        },
        {
          week: 2,
          castawayIds: [
            "cirie-fields",
            "ozzy-lusth",
            "dee-valladares",
            "christian-hubicki",
            "colby-donaldson",
          ],
          weekScore: 28,
          lockedAt: WEEK_LOCKED_DATES[1],
        },
        {
          week: 3,
          castawayIds: [
            "cirie-fields",
            "ozzy-lusth",
            "dee-valladares",
            "christian-hubicki",
            "rick-devens",
          ],
          weekScore: 17,
          lockedAt: WEEK_LOCKED_DATES[2],
        },
        {
          week: 4,
          castawayIds: [
            "cirie-fields",
            "ozzy-lusth",
            "dee-valladares",
            "christian-hubicki",
            "colby-donaldson",
          ],
          weekScore: 21,
          lockedAt: WEEK_LOCKED_DATES[3],
        },
        {
          week: 5,
          castawayIds: [
            "cirie-fields",
            "ozzy-lusth",
            "dee-valladares",
            "christian-hubicki",
            "charlie-davis",
          ],
          weekScore: 30,
          lockedAt: WEEK_LOCKED_DATES[4],
        },
      ],
    },

    // Member 2 — Alex Rivera ("Ocean Wave")
    {
      userId: "demo-player-2",
      displayName: "Ocean Wave",
      ownerName: "Alex Rivera",
      avatar: "",
      tribeColor: "#1565C0",
      totalPoints: 109,
      joinedAt: MEMBER_JOINED_AT,
      draftedAt: MEMBER_DRAFTED_AT,
      roster: [
        "ozzy-lusth",
        "dee-valladares",
        "christian-hubicki",
        "charlie-davis",
        "emily-flippen",
      ],
      weeklyRosters: [
        {
          week: 1,
          castawayIds: [
            "ozzy-lusth",
            "dee-valladares",
            "colby-donaldson",
            "q-burdette",
            "angelina-keeley",
          ],
          weekScore: 18,
          lockedAt: WEEK_LOCKED_DATES[0],
        },
        {
          week: 2,
          castawayIds: [
            "ozzy-lusth",
            "dee-valladares",
            "christian-hubicki",
            "charlie-davis",
            "rick-devens",
          ],
          weekScore: 27,
          lockedAt: WEEK_LOCKED_DATES[1],
        },
        {
          week: 3,
          castawayIds: [
            "ozzy-lusth",
            "dee-valladares",
            "christian-hubicki",
            "charlie-davis",
            "emily-flippen",
          ],
          weekScore: 19,
          lockedAt: WEEK_LOCKED_DATES[2],
        },
        {
          week: 4,
          castawayIds: [
            "ozzy-lusth",
            "dee-valladares",
            "christian-hubicki",
            "charlie-davis",
            "emily-flippen",
          ],
          weekScore: 23,
          lockedAt: WEEK_LOCKED_DATES[3],
        },
        {
          week: 5,
          castawayIds: [
            "ozzy-lusth",
            "dee-valladares",
            "christian-hubicki",
            "charlie-davis",
            "emily-flippen",
          ],
          weekScore: 22,
          lockedAt: WEEK_LOCKED_DATES[4],
        },
      ],
    },

    // Member 3 — Morgan Lee ("Thunder Hawks")
    {
      userId: "demo-player-3",
      displayName: "Thunder Hawks",
      ownerName: "Morgan Lee",
      avatar: "",
      tribeColor: "#2E7D32",
      totalPoints: 120,
      joinedAt: MEMBER_JOINED_AT,
      draftedAt: MEMBER_DRAFTED_AT,
      roster: [
        "cirie-fields",
        "dee-valladares",
        "christian-hubicki",
        "charlie-davis",
        "emily-flippen",
      ],
      weeklyRosters: [
        {
          week: 1,
          castawayIds: [
            "cirie-fields",
            "colby-donaldson",
            "rick-devens",
            "charlie-davis",
            "emily-flippen",
          ],
          weekScore: 23,
          lockedAt: WEEK_LOCKED_DATES[0],
        },
        {
          week: 2,
          castawayIds: [
            "cirie-fields",
            "dee-valladares",
            "rick-devens",
            "charlie-davis",
            "emily-flippen",
          ],
          weekScore: 21,
          lockedAt: WEEK_LOCKED_DATES[1],
        },
        {
          week: 3,
          castawayIds: [
            "cirie-fields",
            "dee-valladares",
            "christian-hubicki",
            "charlie-davis",
            "emily-flippen",
          ],
          weekScore: 24,
          lockedAt: WEEK_LOCKED_DATES[2],
        },
        {
          week: 4,
          castawayIds: [
            "cirie-fields",
            "dee-valladares",
            "christian-hubicki",
            "charlie-davis",
            "emily-flippen",
          ],
          weekScore: 25,
          lockedAt: WEEK_LOCKED_DATES[3],
        },
        {
          week: 5,
          castawayIds: [
            "cirie-fields",
            "dee-valladares",
            "christian-hubicki",
            "charlie-davis",
            "emily-flippen",
          ],
          weekScore: 27,
          lockedAt: WEEK_LOCKED_DATES[4],
        },
      ],
    },

    // Member 4 — Sam Torres ("Purple Rain")
    {
      userId: "demo-player-4",
      displayName: "Purple Rain",
      ownerName: "Sam Torres",
      avatar: "",
      tribeColor: "#6A1B9A",
      totalPoints: 105,
      joinedAt: MEMBER_JOINED_AT,
      draftedAt: MEMBER_DRAFTED_AT,
      roster: [
        "cirie-fields",
        "ozzy-lusth",
        "charlie-davis",
        "emily-flippen",
        "christian-hubicki",
      ],
      weeklyRosters: [
        {
          week: 1,
          castawayIds: [
            "colby-donaldson",
            "ozzy-lusth",
            "angelina-keeley",
            "q-burdette",
            "emily-flippen",
          ],
          weekScore: 12,
          lockedAt: WEEK_LOCKED_DATES[0],
        },
        {
          week: 2,
          castawayIds: [
            "cirie-fields",
            "ozzy-lusth",
            "charlie-davis",
            "emily-flippen",
            "dee-valladares",
          ],
          weekScore: 22,
          lockedAt: WEEK_LOCKED_DATES[1],
        },
        {
          week: 3,
          castawayIds: [
            "cirie-fields",
            "ozzy-lusth",
            "charlie-davis",
            "emily-flippen",
            "christian-hubicki",
          ],
          weekScore: 22,
          lockedAt: WEEK_LOCKED_DATES[2],
        },
        {
          week: 4,
          castawayIds: [
            "cirie-fields",
            "ozzy-lusth",
            "charlie-davis",
            "emily-flippen",
            "dee-valladares",
          ],
          weekScore: 25,
          lockedAt: WEEK_LOCKED_DATES[3],
        },
        {
          week: 5,
          castawayIds: [
            "cirie-fields",
            "ozzy-lusth",
            "charlie-davis",
            "emily-flippen",
            "christian-hubicki",
          ],
          weekScore: 24,
          lockedAt: WEEK_LOCKED_DATES[4],
        },
      ],
    },
  ],
};

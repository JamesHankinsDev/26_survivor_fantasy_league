# Firestore Setup Guide for League Management

## Database Structure

### Collections

#### `leagues`

Stores all league information with nested sub-collections for league-specific data.

**Document Structure:**

```
leagues/
├── {leagueId}
│   ├── name: string (e.g., "Summer 2026 Showdown")
│   ├── ownerId: string (Firebase User ID) - IMPORTANT for permissions
│   ├── ownerName: string
│   ├── ownerEmail: string
│   ├── maxPlayers: number (2-20)
│   ├── currentPlayers: number
│   ├── joinCode: string (unique 6-char code, e.g., "ABC123")
│   ├── members: array<string> (array of user IDs)
│   ├── memberDetails: array<TribeMember> (detailed member info with rosters)
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   └── status: string ("active" | "archived")
│   │
│   └── seasons/
│       └── {seasonNumber}
│           ├── eliminated/
│           │   └── {castawayId}
│           │       ├── castawayId: string
│           │       └── eliminatedAt: timestamp
│           │
│           ├── episodes/
│           │   └── {episodeId} (e.g., "episode-1")
│           │       ├── id: string
│           │       ├── seasonNumber: number
│           │       ├── episodeNumber: number
│           │       ├── airDate: timestamp
│           │       ├── events: map<castawayId, array<ScoringEvent>>
│           │       ├── createdAt: timestamp
│           │       └── updatedAt: timestamp
│           │
│           └── castaways/ (optional, if stored per league)
│               └── {castawayId}
```

## Firestore Security Rules

**⚠️ IMPORTANT:** See `firestore.rules` and `FIRESTORE_SECURITY_RULES.md` for comprehensive security rules.

The security rules enforce:

- **League Owners** can manage episode scoring and eliminations for their leagues
- **Players** (members) can view data but cannot modify scoring/eliminations
- All users must be authenticated to access league data

Quick deployment:

```bash
firebase deploy --only firestore:rules
```

Or paste the contents of `firestore.rules` into the Firebase Console.

## Implementation Notes

### Creating a League

1. User fills in league name and max player count
2. Backend generates:
   - Unique `joinCode` (6 alphanumeric chars)
   - Unique `leagueId` (timestamp + random string)
3. League document is created with owner as first member
4. Join URL is generated: `https://yoursite.com/join/{joinCode}`

### Joining a League

1. User clicks join link or enters join code
2. System fetches league by `joinCode`
3. Checks if user is already a member
4. Checks if league has available slots
5. Adds user to `members` array
6. Increments `currentPlayers`

### Important Considerations

- **Join Code**: Must be uppercase and unique. Consider adding a unique index in Firestore.
- **Members Array**: Keep this array in the document for quick membership checks. Alternatively, create a separate `members` sub-collection for more scalability with large leagues.
- **Timestamps**: Use Firestore's `serverTimestamp()` for `createdAt` and `updatedAt` to ensure consistency.
- **Concurrency**: The `increment()` operation is atomic, so `currentPlayers` stays accurate even with concurrent joins.

## Future Enhancements

- Add a `leagueSessions` collection for tracking game/season data
- Create `leagueMembers` sub-collection for per-user metadata (role, joined date, stats)
- Implement league status transitions (draft → active → completed)
- Add player roster management
- Implement scoring system with transactions

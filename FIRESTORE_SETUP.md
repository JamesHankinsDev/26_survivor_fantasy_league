# Firestore Setup Guide for League Management

## Database Structure

### Collections

#### `leagues`

Stores all league information.

**Document Structure:**

```
leagues/
├── {leagueId}
│   ├── name: string (e.g., "Summer 2026 Showdown")
│   ├── ownerId: string (Firebase User ID)
│   ├── ownerName: string
│   ├── ownerEmail: string
│   ├── maxPlayers: number (2-20)
│   ├── currentPlayers: number
│   ├── joinCode: string (unique 6-char code, e.g., "ABC123")
│   ├── members: array<string> (array of user IDs)
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   └── status: string ("active" | "archived")
```

## Firestore Security Rules

Add these rules to your Firestore security rules (Firebase Console → Firestore Database → Rules):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leagues collection
    match /leagues/{leagueId} {
      // Read: Users can read leagues they are a member of
      allow read: if request.auth != null &&
                     request.auth.uid in resource.data.members;

      // Create: Authenticated users can create leagues
      allow create: if request.auth != null &&
                       request.auth.uid == request.resource.data.ownerId &&
                       request.resource.data.members.size() >= 1;

      // Update: Only the league owner can update
      allow update: if request.auth != null &&
                       request.auth.uid == resource.data.ownerId;

      // Delete: Only the league owner can delete
      allow delete: if request.auth != null &&
                       request.auth.uid == resource.data.ownerId;
    }
  }
}
```

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

# League Message Board Feature

## Overview

The message board feature allows league members to communicate with each other within their league. Members can post messages, mention other users or tribes using @ tags, edit their own messages, and delete messages (owners can delete any message).

## Features

### Permissions

- **Read**: All league members can read all messages
- **Write**: All league members can post messages
- **Edit**: Authors can edit their own messages
- **Delete**: Authors can delete their own messages, league owners can delete any message

### Tagging System

Users can mention other league members or tribes in messages using the @ symbol:

- **@username** - Mentions a specific user
- **@tribename** - Mentions a tribe/team

When typing @, a dropdown menu appears showing available users and tribes to mention.

## Technical Implementation

### Data Model

Messages are stored in Firestore under:

```
/leagues/{leagueId}/messages/{messageId}
```

Each message contains:

- `authorId`: User ID of the message author
- `authorName`: Display name of the author
- `authorAvatar`: Avatar URL (optional)
- `content`: Message text
- `mentions`: Array of mention objects (type, id, name, positions)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp (if edited)
- `isEdited`: Boolean flag
- `editHistory`: Array of previous versions

### Components

#### MessageBoard.tsx

Main component that displays the message list and input form. Features:

- Real-time message updates using Firestore snapshots
- Message input with @ mention detection
- Mention autocomplete menu
- Message submission

#### MessageItem.tsx

Individual message display component. Features:

- Author avatar and name
- Message content with highlighted mentions (rendered as chips)
- Edit/delete options menu
- Edit mode with inline editing
- Delete confirmation dialog
- "edited" indicator for modified messages

### Firestore Security Rules

```javascript
match /leagues/{leagueId}/messages/{messageId} {
  // All league members can read messages
  allow read: if isLeagueMember(leagueId);

  // League members can create messages (must be author)
  allow create: if isLeagueMember(leagueId) &&
                   request.auth.uid == request.resource.data.authorId;

  // Authors can update their own messages
  allow update: if isLeagueMember(leagueId) &&
                   request.auth.uid == resource.data.authorId;

  // Authors can delete their own messages OR league owner can delete any message
  allow delete: if isLeagueMember(leagueId) &&
                   (request.auth.uid == resource.data.authorId ||
                    isLeagueOwner(leagueId));
}
```

## Usage

### Accessing the Message Board

1. Navigate to a league detail page
2. Click the "Message Board" button in the header
3. The message board page will display all messages for that league

### Posting a Message

1. Type your message in the text input field
2. (Optional) Use @ to mention users or tribes
3. Click "Send" or press Enter (Shift+Enter for new line)

### Mentioning Users/Tribes

1. Type @ in the message input
2. A dropdown menu will appear with available users and tribes
3. Type to filter the list
4. Click on a user or tribe to insert the mention
5. The mention will appear as a chip in the message

### Editing a Message

1. Click the three-dot menu on your message
2. Select "Edit"
3. Modify the message text
4. Click "Save" to update or "Cancel" to discard changes
5. Edited messages show an "(edited)" indicator

### Deleting a Message

1. Click the three-dot menu on the message
2. Select "Delete"
3. Confirm deletion in the dialog
4. The message will be permanently removed

## File Structure

```
src/
  app/
    dashboard/
      my-leagues/
        [id]/
          messages/
            page.tsx              # Message board page route
          page.tsx                # League detail page (with "Message Board" button)
  components/
    MessageBoard.tsx              # Main message board component
    MessageItem.tsx               # Individual message component
  types/
    league.ts                     # Updated with LeagueMessage, MessageMention, MessageEdit types
```

## Dependencies

- `date-fns`: For formatting relative timestamps (e.g., "2 hours ago")
- `@mui/material`: For UI components
- `firebase/firestore`: For real-time data synchronization

## Future Enhancements

- Reply threading
- Reactions/emojis
- Image/file attachments
- Notification system for mentions
- Search/filter messages
- Pin important messages
- Message categories (announcements, general, trash talk, etc.)

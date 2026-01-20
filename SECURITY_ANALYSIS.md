# Security Analysis - Survivor Fantasy League

## Executive Summary

**Date:** January 20, 2026  
**Status:** ⚠️ VULNERABILITIES FOUND - Action Required

This analysis identifies security vulnerabilities in the Survivor Fantasy League application, with specific focus on PII exposure and XSS risks.

---

## 🔴 Critical Issues

### 1. **PII Exposure in User Notifications Collection**

**Severity:** HIGH  
**Location:** `/users/{userId}/notifications` subcollection

**Issue:**
The Firestore security rules allow ANY authenticated user to read their own user document (`/users/{userId}`), but there are **no explicit rules** for the notifications subcollection. This means:

- The notifications subcollection inherits the parent rules
- BUT there's a security gap where notifications are queried directly

**Current Rules:**

```javascript
match /users/{userId} {
  allow read: if isAuthenticated() && request.auth.uid == userId;
  allow write: if isAuthenticated() && request.auth.uid == userId;
}
```

**Missing:** Explicit subcollection rules for notifications.

**Exposed Data:**

- User IDs
- League IDs
- League names
- User display names mentioned in notifications
- Message IDs
- Reaction information

**Recommendation:**
Add explicit rules for the notifications subcollection:

```javascript
match /users/{userId} {
  allow read: if isAuthenticated() && request.auth.uid == userId;
  allow write: if isAuthenticated() && request.auth.uid == userId;

  // Add explicit notification rules
  match /notifications/{notificationId} {
    // Users can only read their own notifications
    allow read: if isAuthenticated() && request.auth.uid == userId;

    // Only system/backend can write notifications
    // In client-side app, this should be handled by Cloud Functions
    allow write: if false; // Disable client writes for now
  }
}
```

---

### 2. **XSS Vulnerability in Message Content**

**Severity:** MEDIUM-HIGH  
**Location:** `MessageItem.tsx` and `MessageBoard.tsx`

**Issue:**
User-submitted message content is rendered directly in React components without proper sanitization. While React automatically escapes HTML by default when using `{variable}` syntax, the application could be vulnerable if:

1. Future developers add `dangerouslySetInnerHTML`
2. Message content is processed/manipulated before rendering
3. Special characters in usernames or tribe names aren't properly escaped

**Current Implementation:**

```tsx
// MessageItem.tsx - Line 223
<Typography variant="body1">{message.content}</Typography>

// Mentions are rendered as Chip components (safe)
<Chip label={mention.name} />
```

**Status:** ✅ **Currently Safe** - React's built-in XSS protection is active

**Potential Risks:**

- No input validation on message length
- No profanity filter or content moderation
- Mentions could theoretically contain malicious strings if not validated

**Recommendations:**

1. Add input validation and sanitization
2. Implement maximum message length (currently unlimited)
3. Add content-type validation for usernames/tribe names
4. Consider adding a profanity filter

---

### 3. **Email Exposure in League Data**

**Severity:** MEDIUM  
**Location:** League documents

**Issue:**
League documents store `ownerEmail` which is visible to all league members:

```typescript
// League document structure
{
  ownerEmail: string; // ⚠️ PII exposed to all league members
  ownerName: string;
  ownerId: string;
}
```

**Current Access:**
Any authenticated league member can read the entire league document, including the owner's email address.

**Firestore Rules:**

```javascript
allow read: if isAuthenticated() &&
               (request.auth.uid in resource.data.members ||
                request.auth.uid == resource.data.ownerId);
```

**Recommendation:**

1. Remove `ownerEmail` from the league document (not necessary for app functionality)
2. If email is needed, store it in a separate secure subcollection
3. Only expose email to the owner themselves

---

## 🟡 Medium Priority Issues

### 4. **No Rate Limiting on Message Creation**

**Issue:**
Users can spam messages without restriction. No rate limiting implemented.

**Location:** `MessageBoard.tsx`

**Recommendation:**

- Implement client-side throttling
- Add Firestore Security Rules rate limiting (if using Firebase Extensions)
- Consider using Cloud Functions with rate limiting

---

### 5. **No Input Sanitization on User Profile Data**

**Issue:**
User display names and avatars are not validated:

```typescript
const newMember = {
  displayName: user.displayName || "Unknown",
  avatar: user.photoURL || "",
};
```

**Risks:**

- Display names could contain special characters
- Avatar URLs are not validated (could be malicious)
- No maximum length enforcement

**Recommendation:**

```typescript
// Add validation
const sanitizeDisplayName = (name: string) => {
  return name
    .trim()
    .slice(0, 50) // Max 50 characters
    .replace(/[<>]/g, ""); // Remove potential HTML
};

const validateAvatarURL = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};
```

---

### 6. **Join Code Security**

**Issue:**
Join codes are only 6 characters (36^6 = ~2.1 billion combinations). While sufficient for small-scale, could be vulnerable to brute force.

**Current Implementation:**

```typescript
// 6-character alphanumeric code
const generateJoinCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
```

**Recommendation:**

- Add rate limiting on join code validation attempts
- Consider increasing to 8 characters for better security
- Add expiration time for join codes
- Log failed join attempts

---

## 🟢 Good Security Practices Already Implemented

### ✅ 1. **React's Built-in XSS Protection**

All text content is rendered through React's JSX, which automatically escapes HTML.

### ✅ 2. **Authentication Required**

All routes require authentication via Firebase Auth.

### ✅ 3. **Role-Based Access Control**

Firestore rules properly enforce league ownership and membership.

### ✅ 4. **No dangerouslySetInnerHTML Usage**

Confirmed: No instances of `dangerouslySetInnerHTML` in the codebase.

### ✅ 5. **Secure Firebase Configuration**

Firebase credentials are properly configured in environment variables.

### ✅ 6. **HTTPS Only**

Application uses HTTPS (enforced by Vercel/Next.js).

---

## 🛠️ Immediate Action Items

### Priority 1 (Critical - Fix Immediately)

1. ✅ **Add explicit Firestore rules for notifications subcollection**
2. ✅ **Remove `ownerEmail` from league documents** or move to secure location

### Priority 2 (High - Fix This Week)

3. ✅ **Add input validation and sanitization for messages**
4. ✅ **Implement maximum message length (e.g., 2000 characters)**
5. ✅ **Add display name validation/sanitization**

### Priority 3 (Medium - Fix This Month)

6. ⚠️ **Implement rate limiting on messages**
7. ⚠️ **Add join code rate limiting**
8. ⚠️ **Add avatar URL validation**

### Priority 4 (Low - Future Enhancement)

9. 📋 **Add content moderation/profanity filter**
10. 📋 **Implement audit logging for sensitive operations**
11. 📋 **Add CAPTCHA for join code validation**

---

## 📝 Code Fixes Required

### Fix 1: Update Firestore Security Rules

**File:** `firestore.rules`

Add after the users collection rules (around line 125):

```javascript
match /users/{userId} {
  // Users can read their own profile
  allow read: if isAuthenticated() && request.auth.uid == userId;

  // Users can write their own profile
  allow write: if isAuthenticated() && request.auth.uid == userId;

  // Notifications subcollection
  match /notifications/{notificationId} {
    // Users can only read their own notifications
    allow read: if isAuthenticated() && request.auth.uid == userId;

    // Notifications should only be created by backend/cloud functions
    // For now, allow authenticated users (update when Cloud Functions are added)
    allow create: if isAuthenticated();

    // Users can mark their own notifications as read
    allow update: if isAuthenticated() &&
                     request.auth.uid == userId &&
                     request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);

    // Users can delete their own notifications
    allow delete: if isAuthenticated() && request.auth.uid == userId;
  }
}
```

### Fix 2: Remove Email from League Documents

**Files to update:**

- `src/types/league.ts` - Remove ownerEmail from interface
- `src/components/CreateLeagueDialog.tsx` - Remove ownerEmail from league creation
- Any other files referencing league.ownerEmail

### Fix 3: Add Input Validation Utility

**New file:** `src/utils/inputValidation.ts`

```typescript
/**
 * Input validation and sanitization utilities
 */

const MAX_MESSAGE_LENGTH = 2000;
const MAX_DISPLAY_NAME_LENGTH = 50;
const MAX_LEAGUE_NAME_LENGTH = 100;

/**
 * Sanitize display name
 */
export const sanitizeDisplayName = (name: string): string => {
  if (!name) return "Unknown";

  return name
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LENGTH)
    .replace(/[<>]/g, "") // Remove potential HTML brackets
    .replace(/\s+/g, " "); // Normalize whitespace
};

/**
 * Sanitize message content
 */
export const sanitizeMessageContent = (content: string): string => {
  if (!content) return "";

  return content.trim().slice(0, MAX_MESSAGE_LENGTH);
};

/**
 * Validate avatar URL
 */
export const validateAvatarURL = (url: string): boolean => {
  if (!url) return true; // Empty is okay

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Sanitize league name
 */
export const sanitizeLeagueName = (name: string): string => {
  if (!name) return "";

  return name.trim().slice(0, MAX_LEAGUE_NAME_LENGTH).replace(/[<>]/g, "");
};
```

### Fix 4: Update Message Sending

**File:** `src/components/MessageBoard.tsx`

Update the handleSendMessage function:

```typescript
import { sanitizeMessageContent } from "@/utils/inputValidation";

const handleSendMessage = async () => {
  if (!messageContent.trim() || sending) return;

  // Sanitize input
  const sanitized = sanitizeMessageContent(messageContent);
  if (!sanitized) return;

  setSending(true);
  setError("");

  try {
    const messagesRef = collection(db, "leagues", league.id, "messages");
    // ... rest of function using sanitized content
  }
}
```

---

## 🔍 Testing Recommendations

### Security Testing Checklist

- [ ] Test XSS attempts in message content
- [ ] Test SQL injection attempts (N/A - using Firestore)
- [ ] Test authentication bypass attempts
- [ ] Test unauthorized league access
- [ ] Test notification access from different users
- [ ] Test malformed display names
- [ ] Test extremely long message content
- [ ] Test special characters in all input fields
- [ ] Test rate limiting (once implemented)
- [ ] Test join code brute force (once rate limiting added)

---

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Rules Best Practices](https://firebase.google.com/docs/rules/best-practices)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)

---

## Conclusion

The application has **good foundational security** with proper authentication and role-based access control. However, there are **critical gaps** around:

1. **Notifications subcollection rules** (missing explicit permissions)
2. **Email exposure** in league documents
3. **Input validation** missing in several areas

The **XSS risk is currently LOW** due to React's built-in protections, but proper input validation should still be implemented as defense-in-depth.

**Recommended timeline:** Address Priority 1 items within 24 hours, Priority 2 within 1 week.

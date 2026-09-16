# Manual Testing Checklist - DriftBoard Smoke Test

## Overview

Comprehensive manual testing checklist for DriftBoard's core features. This serves as a smoke test to verify major functionality before releases and after significant changes.

## Context

Manual testing complement to automated test suite. Ensures user workflows function correctly end-to-end and catches integration issues that unit tests might miss.

## Pre-Testing Setup

- [ ] Environment: Development server running (`pnpm dev`)
- [ ] Browser: Fresh incognito/private window
- [ ] Network: Stable internet connection for Firebase
- [ ] Firebase: Ensure Firestore and Auth are operational

## Authentication Flow

### User Registration

- [ ] Navigate to landing page
- [ ] Click "Sign Up"
- [ ] Enter valid email and password (min 6 characters)
- [ ] Verify successful account creation
- [ ] Confirm redirect to dashboard

### User Sign In

- [ ] Sign out if logged in
- [ ] Enter valid credentials
- [ ] Verify successful login
- [ ] Confirm redirect to dashboard

### Password Reset

- [ ] Click "Forgot Password"
- [ ] Enter registered email
- [ ] Verify password reset email sent
- [ ] Test reset link functionality (if accessible)

## Dashboard Features

### Board Management

- [ ] View empty dashboard state (for new users)
- [ ] Create new board with title and description
- [ ] Verify board appears in dashboard
- [ ] Edit board title and description
- [ ] Create multiple boards (3-5) for testing
- [ ] Delete board and confirm removal
- [ ] Verify board permissions (user only sees own boards)

### Dashboard Navigation

- [ ] Click board card to navigate to board view
- [ ] Use browser back button to return to dashboard
- [ ] Verify board cards display correct information
- [ ] Test responsive design on mobile/tablet

## Board View Features

### List Management

- [ ] Create new list (e.g., "To Do", "In Progress", "Done")
- [ ] Edit list title inline
- [ ] Create multiple lists (3-4) for testing
- [ ] Delete list and verify removal
- [ ] Verify list ordering/positioning

### Card Management

- [ ] Create new card within a list
- [ ] Edit card title and description
- [ ] Add multiple cards to same list
- [ ] Add cards to different lists
- [ ] Delete card and verify removal
- [ ] Open card detail dialog

### Card Detail Dialog

- [ ] View card details in modal
- [ ] Edit card title and description
- [ ] Add comments to card
- [ ] Edit existing comments
- [ ] Delete comments
- [ ] View comment timestamps and authors
- [ ] Close dialog with X button or outside click

## Drag and Drop Functionality

### Card Reordering

- [ ] Drag card to new position within same list
- [ ] Verify position persists after page refresh
- [ ] Drag card to top of list
- [ ] Drag card to bottom of list
- [ ] Test smooth visual feedback during drag

### Card Movement Between Lists

- [ ] Drag card from one list to another
- [ ] Verify card appears in target list
- [ ] Verify card removed from source list
- [ ] Test movement between all list combinations
- [ ] Verify persistence after refresh

### Edge Cases

- [ ] Drag to empty list
- [ ] Drag with single card in list
- [ ] Cancel drag (drag and release at original position)
- [ ] Fast consecutive drag operations

## URL Linking Feature

### Basic URL Detection

- [ ] Add card with HTTP URL (https://example.com)
- [ ] Add card with HTTPS URL
- [ ] Add card with www URL (www.example.com)
- [ ] Add card with localhost URL (localhost:3000)
- [ ] Verify URLs appear as clickable links

### URL Testing in Comments

- [ ] Add comment with various URL formats
- [ ] Verify URLs are clickable in comments
- [ ] Test multiple URLs in single comment
- [ ] Test mixed text and URLs

### Link Behavior

- [ ] Click links to verify they open in new tabs
- [ ] Verify www URLs normalize to https://
- [ ] Verify localhost URLs normalize to http://
- [ ] Check link styling (blue, underlined, hover effects)

## Data Persistence and Real-time Updates

### Data Persistence

- [ ] Create board, lists, and cards
- [ ] Refresh page and verify all data persists
- [ ] Close browser and reopen - verify session
- [ ] Test data persistence across browser restarts

### Real-time Collaboration (if multiple accounts available)

- [ ] Open same board in multiple browser sessions
- [ ] Create card in one session, verify appears in other
- [ ] Move card in one session, verify updates in other
- [ ] Add comment in one session, verify appears in other

## Error Handling and Edge Cases

### Network Issues

- [ ] Disconnect network and attempt operations
- [ ] Verify appropriate error messages
- [ ] Reconnect and verify operations resume

### Invalid Data

- [ ] Try to create board with empty title
- [ ] Try to create card with empty title
- [ ] Test very long titles and descriptions
- [ ] Test special characters in titles

### Browser Compatibility

- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari (macOS)
- [ ] Test in mobile browsers

## Performance and UX

### Loading Performance

- [ ] Measure initial page load time
- [ ] Test board loading with many cards (50+)
- [ ] Verify smooth animations and transitions
- [ ] Check for memory leaks during extended use

### Responsive Design

- [ ] Test on mobile devices (phone view)
- [ ] Test on tablet devices
- [ ] Test on desktop (various screen sizes)
- [ ] Verify touch interactions on mobile

### Accessibility

- [ ] Navigate using keyboard only
- [ ] Test with screen reader (basic check)
- [ ] Verify color contrast is sufficient
- [ ] Check focus indicators are visible

## Document History and Audit Trail

### History Tracking

- [ ] Create and modify cards
- [ ] Open card history viewer
- [ ] Verify change history is recorded
- [ ] Check timestamps and user attribution
- [ ] Verify history for different operation types

## Security Testing

### Authentication Security

- [ ] Verify signed-out users cannot access boards
- [ ] Test direct URL access to boards without auth
- [ ] Verify users only see their own boards
- [ ] Test session timeout behavior

### Data Security

- [ ] Verify users cannot access others' boards
- [ ] Test URL manipulation attempts
- [ ] Verify proper logout clears session

## Export/Backup Functionality

### Data Export

- [ ] Test Firebase export commands (if available)
- [ ] Verify exported data format
- [ ] Check data completeness in exports

## Cleanup and Reset

### Post-Testing Cleanup

- [ ] Delete test boards created during testing
- [ ] Clear test data from Firestore (if dev environment)
- [ ] Document any issues found
- [ ] Reset to clean state for next testing session

## Testing Notes Template

### Issues Found

```
Date:
Tester:
Browser:
Issue:
Steps to Reproduce:
1.
2.
3.
Expected Result:
Actual Result:
Severity: [Low/Medium/High/Critical]
```

### Performance Notes

```
Page Load Times:
- Dashboard:
- Board View:
- Card Dialog:

Observations:
-
```

## Priority

High - Essential for release validation and ongoing quality assurance

## Implementation Status

Ready to use - can be executed manually by developers or QA team

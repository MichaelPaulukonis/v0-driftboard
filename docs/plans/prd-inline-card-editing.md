# PRD: Inline Card Editing and Actions

**Author:** Gemini
**Date:** 2025-10-01
**Status:** Proposed

---

## 1. Overview & Problem Definition

### 1.1. Problem Statement

Currently, essential card management actions such as editing a title or description, and changing a card's status (e.g., archiving, deleting) are disconnected from the main card detail view. When a user opens a card to view its details, comments, and subtasks, they cannot perform basic edits without closing the detail view and using a separate kebab menu on the board.

### 1.2. User Pain Points

This disjointed workflow creates several pain points:

-   **Increased Friction & Clicks:** Users require multiple steps to perform simple edits, leading to a clunky and inefficient experience.
-   **Loss of Context:** Forcing a user to exit the detail view to make an edit disrupts their workflow and causes them to lose the context of the full card information.
-   **Inconsistent User Experience:** The application provides a rich view for consumption but a poor one for interaction, which feels inconsistent and unintuitive.

### 1.3. Opportunity

By integrating editing capabilities directly within the card detail view, we can significantly improve user workflow efficiency and satisfaction. This aligns with modern application design patterns where viewing and editing are seamlessly integrated. A smoother editing process will lead to higher user engagement and productivity.

---

## 2. Structured Requirements

### 2.1. Functional Requirements

| ID      | Requirement                      | Acceptance Criteria                                                                                                                                                                                                                                   |
| :------ | :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01   | **Inline Title Editing**         | - Given the user is viewing the card detail dialog,<br>- When they click on the card title,<br>- Then the title should become an editable input field.<br>- And when they click away or press Enter, the new title is saved.                                 |
| FR-02   | **Inline Description Editing**   | - Given the user is viewing the card detail dialog,<br>- When they click on the card description,<br>- Then the description should become an editable textarea.<br>- And a "Save" and "Cancel" button should appear.<br>- And when they click "Save", the new description is saved. |
| FR-03   | **Direct Status Change Actions** | - Given the user is viewing the card detail dialog,<br>- Then action buttons for "Mark as Done", "Archive", and "Delete" should be visible.<br>- And clicking "Mark as Done" updates the card's status accordingly.<br>- And clicking "Archive" archives the card and removes it from the board.<br>- And clicking "Delete" prompts for confirmation before permanently deleting the card. |

### 2.2. Non-Functional Requirements

-   **Performance:** All inline editing actions should feel instantaneous, with backend updates completing in under 500ms.
-   **Usability:** The UI for editing must be intuitive and require no user training.
-   **Concurrency:** If another user is editing the same card, the UI should gracefully handle potential conflicts (e.g., by showing a notification, though full real-time collaboration is out of scope for this phase).

### 2.3. Prioritization

-   **Must-Have:**
    -   Inline editing for title and description.
    -   Action buttons for Archive and Delete.
-   **Nice-to-Have:**
    -   A dedicated "Mark as Done" or status-toggle button.
    -   Real-time notifications for concurrent edits.

---

## 3. User-Centered Design

### 3.1. User Personas

-   **Alex (Project Manager):** Needs to quickly triage and update dozens of cards daily. The current workflow slows them down significantly.
-   **Sam (Developer):** Often needs to update the title or description of a card while discussing its details with the team.

### 3.2. User Journey

1.  User opens a card from the main board.
2.  User reads the comments and realizes the title is unclear.
3.  User clicks the title, types a new one, and hits Enter. The title is saved.
4.  User decides the card is no longer relevant.
5.  User clicks the "Archive" button in the dialog. The dialog closes, and the card is gone from the board.

### 3.3. Edge Cases & Error Handling

-   **Offline Editing:** If the user loses their connection while editing, the application should cache the changes and attempt to save them once the connection is restored. A visual indicator should inform the user of the offline status.
-   **Permissions Error:** If a user without edit permissions somehow sees the edit UI, they should receive a clear error message upon attempting to save.
-   **API Failure:** If the backend save operation fails, the user should be notified with a toast message, and their edits should be preserved locally for a retry.

---

## 4. Technical Considerations

### 4.1. Architecture & Technology

-   **Frontend:** This is primarily a frontend change impacting the React components.
-   **Component to Modify:** `components/card-detail-dialog.tsx` will be the main component to update.
-   **Logic to Reuse:** Logic from `components/edit-card-dialog.tsx` and the `use-toast.ts` hook should be reused for updating card data and showing notifications.
-   **Backend Service:** The existing `lib/firebase-service.ts` will be used to persist the changes to Firestore. No backend changes are anticipated.

### 4.2. Integration Requirements

-   The new functionality must integrate seamlessly with the existing Firestore data model and security rules defined in `firestore.rules`.

---

## 5. Implementation Planning

### 5.1. Development Phases

1.  **Phase 1: Title & Description Editing (1-2 days)**
    -   Implement inline editing for the card title.
    -   Implement inline editing for the card description.
    -   Add unit and integration tests.
2.  **Phase 2: Action Buttons (1 day)**
    -   Add "Archive" and "Delete" buttons to the dialog.
    -   Wire them up to the existing `firebase-service` functions.
    -   Add confirmation for the delete action.

### 5.2. Dependencies & Blockers

-   No external dependencies are anticipated. This work is self-contained.

### 5.3. Risk Assessment

| Risk               | Likelihood | Impact | Mitigation Strategy                                                                                                                                                              |
| :----------------- | :--------- | :----- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Concurrent Edits   | Low        | Medium | Implement optimistic locking or a "last-write-wins" strategy. For this iteration, we will accept last-write-wins. A notification of changes is a "nice-to-have". |

---

## 6. Open Questions & Future Work

-   **User Research:** We should conduct user interviews to formally validate the pain points assumed in this document.
-   **Real-time Collaboration:** Full real-time collaboration (seeing other users type) is out of scope but should be considered for a future roadmap if the application requires it.
-   **A/B Testing:** Consider an A/B test to measure the impact on user engagement before a full rollout.
# PRD: Full-Height Kanban Board Layout

**Author:** Gemini
**Date:** 2025-10-07
**Status:** Completed
**Completion Date:** 2025-10-07

## 1. Overview

This document outlines the requirements for refactoring the kanban board's layout to a full-height, independently scrolling column design. This change addresses a key UI/UX issue where the main horizontal scrollbar has an awkward and inconsistent position based on the height of the list content.

## 2. Problem Statement

Currently, the board's container height is determined by the content of the longest list. This leads to two undesirable behaviors:

1.  If a list is taller than the viewport, the main horizontal scrollbar is pushed "below the fold," forcing the user to scroll down the entire page just to scroll horizontally.
2.  If all lists are shorter than the viewport, the horizontal scrollbar appears directly beneath the content, which can be in the middle of the screen, looking awkward and disconnected.

This behavior is non-standard for modern web applications and detracts from a professional, polished user experience.

## 3. Goals and Objectives

- **Goal:** Implement a professional, industry-standard kanban board layout.
- **Objectives:**
    - The main horizontal scrollbar must always be positioned at the bottom of the viewport.
    - Each list column should fill the available vertical space of the board area.
    - Each list column must scroll its content (the cards) vertically and independently if the content overflows.
    - The solution must be robust, responsive, and maintain the existing drag-and-drop functionality.

## 4. Phased Implementation Plan

To mitigate risks and allow for incremental development, the refactor will be broken down into three distinct phases.

### Phase 1: Restructure the Main Board Page Layout

**Goal:** Create the main full-height container and fix the horizontal scrollbar's position.

- **Task 1.1:** Isolate the board header from the list container in `app/board/[id]/page.tsx`.
- **Task 1.2:** Wrap the page content in a full-height flexbox container (`h-screen`). The container should account for the main app navigation's height.
- **Task 1.3:** Configure the list container to `flex-grow` to fill the remaining vertical space and apply `overflow-x: auto`.

**Acceptance Criteria for Phase 1:**
- The board area fills the screen vertically.
- The main horizontal scrollbar is always at the bottom of the viewport.
- The application remains stable and functional. (Note: Lists will appear visually cut off at this stage, which is expected).

### Phase 2: Refactor the List Column Component

**Goal:** Enable independent vertical scrolling for each list column.

- **Task 2.1:** Modify the root element of `components/list-column.tsx` to be a flex column that fills its parent's height.
- **Task 2.2:** The card container within the list column will be set to `overflow-y: auto` and `flex-grow` to enable scrolling.

**Acceptance Criteria for Phase 2:**
- Each list column stretches to the bottom of the board area.
- Lists with overflowing content display a vertical scrollbar.
- The layout looks and functions as intended.

### Phase 3: Refinement and Cleanup

**Goal:** Polish the new layout and verify all functionality.

- **Task 3.1 (Optional):** Apply custom styling to the new vertical scrollbars in `app/globals.css` to make them thinner and less obtrusive.
- **Task 3.2:** Conduct thorough testing of all drag-and-drop functionality (cards and lists).
- **Task 3.3:** Verify the layout's responsiveness across different screen sizes and with varying amounts of content.

## 5. Risks

- **CSS Conflicts:** New layout styles may conflict with existing ones.
- **Drag-and-Drop Integration:** Changes to scroll containers may require adjustments to the drag-and-drop library configuration.
- **Responsiveness:** The new layout must be carefully tested on various screen sizes.

By following this phased approach, we can address these risks systematically and ensure a stable, high-quality implementation.

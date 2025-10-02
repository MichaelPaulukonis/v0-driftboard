# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Feature to view "Done", "Archived", and "Deleted" cards via a new kebab menu in the board header.
- Functionality to restore cards from non-active states back to the board.
- Card-level actions to mark cards as "Done" or "Archived".
- UI toast notifications for feedback on card status changes.
- Firestore index for querying cards by status.
- Comprehensive testing documentation (`docs/reference/testing.md`) with lessons learned and best practices
- Full test suite coverage with 43 tests passing across 7 test files
- Enhanced Firebase mocking with proper `writeBatch` and `runTransaction` support
- Authentication context mocking for component integration tests

### Changed
- Improved UI consistency by implementing `Ctrl/Cmd + Enter` for submission and `Escape` for cancellation across all major data entry fields, including comments and dialog forms.
- Finalized the hybrid Firestore data model by implementing and deploying comprehensive security rules. This change enforces data integrity, ownership, and valid status transitions across all collections.
- The "Delete" action now functions as a soft-delete, moving cards to a "Deleted" view instead of permanent removal.
- The delete confirmation dialog text has been updated to reflect the new soft-delete behavior.
- Updated TypeScript interfaces to use `status` field instead of `isDeleted` boolean
- Improved Firebase service layer with proper hybrid data model support
- Enhanced test configuration with better mock patterns using `vi.importOriginal()`
- Reorganized documentation structure with dedicated `docs/reference/` folder
- Updated plan statuses to reflect current implementation progress

### Fixed
- Fixed a critical data integrity bug where deleting a list would orphan its cards or incorrectly change their status. Implemented a robust cascading soft-delete and smart restoration process.
- Bug where the UI did not automatically update to remove a card from a list after its status was changed to 'done', 'archived', or 'deleted'.
- Corrected multiple build errors related to missing component imports (`Toaster`, `DropdownMenu`) and incorrect JSX syntax.
- Firebase mock configuration issues that were causing test failures
- Type inconsistencies between Comment interface and service implementations
- Authentication mocking in board card integration tests
- Document ID generation behavior in Firebase mocks

### Completed Features
- ✅ Done, Archived, & Deleted Views
- ✅ User Comments System (moved to `docs/plans/completed/01.user-comments.md`)
- ✅ URL Linking Feature (moved to `docs/plans/completed/04.url-linking-feature.md`)

### Documentation
- Reorganized all reference documentation under `docs/reference/`
- Updated testing strategy plan with completion status
- Enhanced Copilot instructions with testing requirements
- Added comprehensive testing strategy documentation with real-world insights

### Technical Improvements
- Test coverage for Firebase service layer exceeds 95%
- All integration tests now properly handle authentication context
- Robust mock setup for complex Firebase operations (batch writes, transactions)
- Type-safe testing patterns established across the codebase

---

*This changelog tracks major changes, bug fixes, and feature completions in the Driftboard project.*

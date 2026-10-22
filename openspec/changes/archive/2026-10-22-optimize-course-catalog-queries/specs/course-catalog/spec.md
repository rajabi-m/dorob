# Spec Delta

## ADDED Requirements

### Requirement: Resilient individual-course images
Accepted individual-course cards SHALL remain visible when thumbnail metadata is null or image loading fails. The course catalogue and homepage course shelf SHALL reuse the shared Persian image-unavailable fallback with stable image-area dimensions, usable provider links and accessible RTL presentation. A missing image SHALL not become a course-list error, remove a card or change the displayed matching count.

#### Scenario: No image metadata
- **WHEN** an eligible course is returned with thumbnail=null
- **THEN** its card immediately renders the existing «تصویر در دسترس نیست» fallback without attempting a fabricated asset request, retaining its facts and provider navigation

#### Scenario: Image fails after render
- **WHEN** the recorded image request fails for a visible card
- **THEN** only its image area switches to the fallback and the course, list total, ordering and current filters remain intact

#### Scenario: Image becomes available
- **WHEN** refreshed metadata for a visible course supplies a new current image reference after processing succeeds
- **THEN** the shared card attempts that image instead of remaining stuck in a previous fallback state

#### Scenario: Persian mobile and keyboard use
- **WHEN** a card without an image appears on a narrow screen or is visited by keyboard
- **THEN** the image area stays stable, Persian text is readable, mixed-direction text remains isolated and provider links retain visible focus and their existing new-window notice

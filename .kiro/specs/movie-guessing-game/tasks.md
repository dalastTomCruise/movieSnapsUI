# Implementation Plan: Movie Guessing Game

## Overview

Build a single `index.html` file (with inline or co-located CSS/JS) that fetches a random movie from the public API, displays screenshots with navigation, and lets the user reveal the answer. Deploy to S3 + CloudFront.

## Tasks

- [x] 1. Create project scaffold and core data structures
  - Create `index.html` with the base HTML skeleton, viewport meta tag, and placeholder sections for each UI region (loading, error, image viewer, reveal panel, action bar)
  - Define the `AppState` object shape and initialize default state: `{ movie: null, currentIndex: 0, revealed: false, loading: false, error: null }`
  - Implement `buildImageUrl(s3_prefix, imagePath)` as a pure function that concatenates the S3 base URL with the prefix and path
  - _Requirements: 1.1, 2.1_

  - [ ]* 1.1 Write property test for `buildImageUrl` (Property 6)
    - **Property 6: Image URL construction is correct**
    - Use fast-check to generate arbitrary `s3_prefix` and `imagePath` strings; assert the result starts with `https://s3.amazonaws.com/flixpatrol-screencaps/` and contains both inputs as substrings in order
    - **Validates: Requirements 2.1**

- [x] 2. Implement API client and loading/error views
  - Implement `fetchRandomMovie()` that calls the API endpoint, parses the JSON response, and throws on network failure or missing `title` field
  - Implement `LoadingView` — a spinner element shown while `state.loading === true`
  - Implement `ErrorView` — an error message element with a "Try Again" button; clicking it retries `fetchRandomMovie()`
  - Wire `fetchRandomMovie()` to run on page load, setting `loading` during fetch and `error` on failure
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Implement ImageViewer component and navigation logic
  - Implement `ImageViewer` that renders the current screenshot `<img>` using `buildImageUrl`, left/right arrow buttons, and the `"{i+1} / {N}"` counter
  - Implement `navigateRight(state)` and `navigateLeft(state)` pure functions that return the new `currentIndex` (clamped to `[0, N-1]`)
  - Disable the left arrow when `currentIndex === 0`; disable the right arrow when `currentIndex === N-1`
  - Add an `onerror` handler on the `<img>` that swaps the src to an inline placeholder SVG when a screenshot fails to load
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 3.1 Write property test for navigation index changes (Property 1)
    - **Property 1: Navigation changes index correctly**
    - Use fast-check to generate random `N` (1–50) and index `i` in `[0, N-1]`; assert right increments to `i+1` when `i < N-1` and left decrements to `i-1` when `i > 0`
    - **Validates: Requirements 2.3, 2.4**

  - [ ]* 3.2 Write property test for boundary arrow disabled state (Property 2)
    - **Property 2: Boundary arrows are disabled**
    - Use fast-check to generate any `N ≥ 1`; assert left arrow is disabled at index 0 and right arrow is disabled at index `N-1`
    - **Validates: Requirements 2.5, 2.6**

  - [ ]* 3.3 Write property test for counter display (Property 3)
    - **Property 3: Counter display reflects current state**
    - Use fast-check to generate random `N` and `i` in `[0, N-1]`; assert counter text equals `"{i+1} / {N}"`
    - **Validates: Requirements 2.7**

- [x] 4. Checkpoint — Ensure navigation and image display work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement RevealPanel and ActionBar
  - Implement `RevealPanel` that displays `movie.title`, `movie.year`, `movie.genres` (comma-separated), `movie.synopsis`, and `movie.cast` (comma-separated)
  - Implement `ActionBar` that shows the "Reveal Movie" button when `revealed === false` and the "New Movie" button when `revealed === true`
  - Wire "Reveal Movie" click to set `state.revealed = true` and re-render
  - Wire "New Movie" click to reset `currentIndex` to 0, set `revealed` to false, and fetch a new movie
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_

  - [ ]* 5.1 Write property test for new-movie state reset (Property 4)
    - **Property 4: New-movie resets state**
    - Use fast-check to generate arbitrary `revealed` and `currentIndex` values; assert that after the new-movie action `revealed === false` and `currentIndex === 0`
    - **Validates: Requirements 4.1, 4.2**

- [x] 6. Implement keyboard navigation and responsive/accessible UI
  - Add a `keydown` event listener on `document` that maps `ArrowRight` → `navigateRight` and `ArrowLeft` → `navigateLeft`, re-rendering after each
  - Apply CSS to make the layout responsive from 320px to 2560px; scale screenshots with `max-width: 100%; height: auto`
  - Ensure all interactive controls meet 44×44 CSS px minimum touch target size
  - Ensure text/background color contrast meets 4.5:1 minimum ratio
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 6.1 Write property test for keyboard navigation mirroring arrow clicks (Property 5)
    - **Property 5: Keyboard navigation mirrors arrow controls**
    - Use fast-check to generate arbitrary loaded movie state; assert that dispatching `ArrowRight`/`ArrowLeft` keyboard events produces the same `currentIndex` change as clicking the right/left arrow buttons
    - **Validates: Requirements 5.3**

- [x] 7. Wire the full render loop and finalize single-file output
  - Implement a single `render(state)` function that calls each component renderer and updates the DOM
  - Ensure all state mutations go through `render()` so the UI is always consistent with state
  - Consolidate all CSS and JS into `index.html` (or a minimal `index.html` + `app.js` + `styles.css` if preferred)
  - _Requirements: 1.1, 1.2, 1.3, 2.1–2.8, 3.1–3.4, 4.1–4.3, 5.1–5.5_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Add deployment script
  - Create a `deploy.sh` shell script that runs `aws s3 sync` and `aws cloudfront create-invalidation` with placeholder values for bucket name and distribution ID
  - _Requirements: (deployment, not a functional requirement)_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- fast-check is the PBT library; include it via CDN or npm for the test file
- Each property test file should include the tag comment: `// Feature: movie-guessing-game, Property {N}: {property_text}`
- The `title` field comes directly from the API response — no derivation needed
- Image URLs are built as: `https://s3.amazonaws.com/flixpatrol-screencaps/` + `s3_prefix` + `imagePath`

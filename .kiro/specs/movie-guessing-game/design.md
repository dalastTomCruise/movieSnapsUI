# Design Document: Movie Guessing Game

## Overview

A single-page web application (SPA) delivered as a minimal set of static files (HTML, CSS, JS) hosted on AWS S3 + CloudFront. The app fetches a random movie from a public API, displays its screenshots one at a time with navigation controls, and lets the user reveal the answer. No backend is required — all logic runs in the browser.

The deployment target is AWS S3 (static website hosting) fronted by CloudFront for HTTPS, caching, and global CDN distribution.

---

## Architecture

```mermaid
graph TD
    Browser["Browser (SPA)"]
    CF["AWS CloudFront"]
    S3["AWS S3 Bucket\n(static files)"]
    API["Public Movie API\nhttps://batyn96vwb.execute-api.us-east-1.amazonaws.com/prod/random-movie"]
    ImgS3["S3 Image CDN\nhttps://s3.amazonaws.com/flixpatrol-screencaps/"]

    Browser -->|HTTPS request| CF
    CF -->|origin fetch| S3
    S3 -->|index.html + assets| CF
    CF -->|serves static files| Browser
    Browser -->|fetch()| API
    Browser -->|img src| ImgS3
```

**Key decisions:**
- Single HTML file with inline or co-located CSS/JS to minimize deployment complexity
- CloudFront provides HTTPS (required for `fetch()` to a non-same-origin API from a secure context) and caching
- No build step required — vanilla HTML/CSS/JS
- CORS is handled by the public API; the browser calls it directly

---

## Components and Interfaces

### AppState (in-memory JS object)

Holds all runtime state. No persistence needed.

```
{
  movie: Movie | null,
  currentIndex: number,       // 0-based index into movie_screen_caps
  revealed: boolean,
  loading: boolean,
  error: string | null
}
```

### API Client

Single function responsible for fetching movie data.

```
fetchRandomMovie(): Promise<Movie>
```

- Calls the API endpoint
- Returns the movie directly — no status filtering needed
- Throws on network failure or malformed response

### Image URL Builder

```
buildImageUrl(s3_prefix: string, imagePath: string): string
```

Concatenates `https://s3.amazonaws.com/flixpatrol-screencaps/` + `s3_prefix` + `imagePath`.

### UI Components (DOM-based, no framework)

| Component | Responsibility |
|---|---|
| `LoadingView` | Spinner shown during fetch |
| `ErrorView` | Error message + "Try Again" button |
| `ImageViewer` | Screenshot display, left/right arrows, index counter |
| `RevealPanel` | Movie title, year, genres, synopsis, cast |
| `ActionBar` | "Reveal Movie" / "New Movie" buttons |

All components are pure render functions that take state and return/mutate DOM nodes. A single `render(state)` function drives the entire UI.

---

## Data Models

### Movie (API response shape)

```typescript
interface Movie {
  movie_id: string;            // e.g. "the-dark-knight-2008"
  title: string;               // human-readable title, e.g. "The Dark Knight"
  status: string;              // informational only, no filtering needed
  s3_prefix: string;           // path prefix for image URLs
  movie_screen_caps: string[]; // array of image file paths
  synopsis: string;
  cast: string[];
  genres: string[];
  year: number;
}
```

The `title` field is used directly from the API response — no derivation from `movie_id` needed.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Navigation changes index correctly

*For any* movie with N screenshots and any current index `i`, pressing right when `i < N-1` SHALL increment the index to `i+1`, and pressing left when `i > 0` SHALL decrement the index to `i-1`.

**Validates: Requirements 2.3, 2.4**

### Property 2: Boundary arrows are disabled

*For any* movie with N screenshots, when `currentIndex === 0` the left arrow SHALL be disabled, and when `currentIndex === N-1` the right arrow SHALL be disabled.

**Validates: Requirements 2.5, 2.6**

### Property 3: Counter display reflects current state

*For any* movie with N screenshots and any index `i` in `[0, N-1]`, the counter text SHALL equal `"{i+1} / {N}"`.

**Validates: Requirements 2.7**

### Property 4: New-movie resets state

*For any* app state where `revealed === true` and `currentIndex` is any value, activating "New Movie" SHALL set `revealed` to `false` and `currentIndex` to `0`.

**Validates: Requirements 4.1, 4.2**

### Property 5: Keyboard navigation mirrors arrow controls

*For any* loaded movie state, dispatching an `ArrowRight` keyboard event SHALL produce the same index change as clicking the right arrow, and dispatching `ArrowLeft` SHALL produce the same index change as clicking the left arrow.

**Validates: Requirements 5.3**

### Property 6: Image URL construction is correct

*For any* `s3_prefix` and `imagePath`, `buildImageUrl(s3_prefix, imagePath)` SHALL return a string that starts with the S3 base URL and contains both `s3_prefix` and `imagePath` as substrings in the correct order.

**Validates: Requirements 2.1**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| API network failure | Show `ErrorView` with "Try Again" button; retry on click |
| Screenshot image fails to load | `onerror` handler swaps `<img>` src to a placeholder SVG/text |
| API returns malformed data | Treat as error, show `ErrorView` |

Retry logic uses a simple counter — no exponential backoff needed for this use case.

---

## Testing Strategy

### Unit Tests (example-based)

Focus on pure functions that have no DOM or network dependencies:

- `buildImageUrl(prefix, path)` — correct URL construction
- Navigation boundary conditions (index clamping)
- State transitions: load → display → reveal → new movie

### Property-Based Tests

Use **fast-check** (JavaScript PBT library) with minimum 100 iterations per property.

Each property test is tagged with:
`// Feature: movie-guessing-game, Property {N}: {property_text}`

| Property | Test approach |
|---|---|
| P1: Navigation changes index correctly | Generate random N and index, assert right/left produce correct index change |
| P2: Boundary arrows disabled | Generate any movie, set index to 0 or N-1, assert correct arrow disabled |
| P3: Counter display | Generate random N and index i, assert counter text === `"{i+1} / {N}"` |
| P4: New-movie resets state | Generate arbitrary revealed state, trigger new-movie, assert index=0 and revealed=false |
| P5: Keyboard navigation mirrors clicks | Generate arbitrary state, dispatch keyboard events, assert same index change as arrow clicks |
| P6: Image URL construction | Generate arbitrary prefix/path strings, assert URL starts with base and contains both parts |

### Integration / Smoke Tests

- Manual smoke test: deploy to S3+CloudFront, verify the page loads, fetches a movie, and navigation works end-to-end
- No automated integration tests needed given the simplicity of the static deployment

### AWS Deployment

Deployment steps (manual or via a simple shell script):

1. `aws s3 sync ./dist s3://{bucket-name} --delete`
2. `aws cloudfront create-invalidation --distribution-id {id} --paths "/*"`

CloudFront distribution config:
- Origin: S3 bucket (REST endpoint, not website endpoint, for OAC)
- Default root object: `index.html`
- Error pages: 404 → `/index.html` (for SPA routing, though not strictly needed here)
- HTTPS only (redirect HTTP → HTTPS)
- Cache policy: CachingOptimized for static assets

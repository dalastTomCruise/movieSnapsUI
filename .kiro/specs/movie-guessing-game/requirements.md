# Requirements Document

## Introduction

A single-page web application where users try to guess a movie title by viewing screenshots from that movie. The app fetches a random movie from an external API, displays its screenshots one at a time with navigation controls, and lets the user reveal the answer when ready. The UI should be modern, responsive, and mobile-friendly.

## Glossary

- **App**: The movie guessing game single-page web application
- **API**: The external service at `https://batyn96vwb.execute-api.us-east-1.amazonaws.com/prod/random-movie` that returns random movie data
- **Movie**: A film record returned by the API, containing an ID, title, screenshots, synopsis, cast, genres, and year
- **Screenshot**: A still image from a movie, referenced by a path in the `movie_screen_caps` array
- **Image_Viewer**: The UI component that displays the current screenshot and navigation arrows
- **Reveal_Panel**: The UI component shown after the user clicks "Reveal Movie", displaying the movie title, year, genres, synopsis, and cast
- **S3_Base_URL**: The base URL used to construct full image URLs from the `s3_prefix` and image paths returned by the API (`https://s3.amazonaws.com/flixpatrol-screencaps/`)

## Requirements

### Requirement 1: Fetch a Random Movie

**User Story:** As a player, I want the app to load a random movie when I open it, so that I can start guessing immediately.

#### Acceptance Criteria

1. WHEN the App loads, THE App SHALL fetch a random movie from the API endpoint.
2. WHILE the App is fetching movie data, THE App SHALL display a loading indicator to the user.
3. IF the API request fails, THEN THE App SHALL display an error message and a "Try Again" button that retries the fetch.

---

### Requirement 2: Display Screenshots for Guessing

**User Story:** As a player, I want to browse through movie screenshots, so that I can gather clues to guess the movie.

#### Acceptance Criteria

1. WHEN a movie is loaded, THE Image_Viewer SHALL display the first screenshot from the `movie_screen_caps` array.
2. THE Image_Viewer SHALL display a left arrow control and a right arrow control for navigating between screenshots.
3. WHEN the user activates the right arrow, THE Image_Viewer SHALL display the next screenshot in the sequence.
4. WHEN the user activates the left arrow, THE Image_Viewer SHALL display the previous screenshot in the sequence.
5. WHILE the first screenshot is displayed, THE Image_Viewer SHALL disable the left arrow control.
6. WHILE the last screenshot is displayed, THE Image_Viewer SHALL disable the right arrow control.
7. THE Image_Viewer SHALL display the current screenshot index and total count (e.g., "3 / 10").
8. WHEN a screenshot fails to load, THE Image_Viewer SHALL display a placeholder indicating the image is unavailable.

---

### Requirement 3: Reveal the Movie Answer

**User Story:** As a player, I want to reveal the movie details when I'm ready, so that I can check if my guess was correct.

#### Acceptance Criteria

1. THE App SHALL display a "Reveal Movie" button while the answer has not been revealed.
2. WHEN the user activates the "Reveal Movie" button, THE Reveal_Panel SHALL display the movie `title` from the API response, the release year, genres, synopsis, and cast.
3. WHEN the Reveal_Panel is visible, THE App SHALL hide the "Reveal Movie" button.
4. WHEN the Reveal_Panel is visible, THE App SHALL display a "New Movie" button that fetches and loads a new random movie.

---

### Requirement 4: Play Again

**User Story:** As a player, I want to start a new round with a different movie, so that I can keep playing.

#### Acceptance Criteria

1. WHEN the user activates the "New Movie" button, THE App SHALL reset the Image_Viewer to the first screenshot.
2. WHEN the user activates the "New Movie" button, THE App SHALL hide the Reveal_Panel.
3. WHEN the user activates the "New Movie" button, THE App SHALL fetch a new random movie from the API.

---

### Requirement 5: Responsive and Accessible UI

**User Story:** As a player using any device, I want the app to look good and be easy to use, so that I can play on desktop or mobile.

#### Acceptance Criteria

1. THE App SHALL render correctly on viewport widths from 320px to 2560px.
2. THE Image_Viewer SHALL scale screenshots to fit the available screen width while preserving the image aspect ratio.
3. THE App SHALL support keyboard navigation, where the left and right arrow keys navigate between screenshots.
4. THE App SHALL provide sufficient color contrast between text and background elements meeting a minimum contrast ratio of 4.5:1 for normal text.
5. THE App SHALL display all interactive controls at a minimum touch target size of 44x44 CSS pixels on mobile viewports.

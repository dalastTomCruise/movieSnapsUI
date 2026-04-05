// Feature: movie-guessing-game, Property 6: Image URL construction is correct
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

const S3_BASE_URL = 'https://s3.amazonaws.com/flixpatrol-screencaps/';

/**
 * buildImageUrl: pure function extracted from dist/index.html for testing.
 * The imagePath already includes the s3_prefix from the API response.
 * @param {string} s3_prefix
 * @param {string} imagePath
 * @returns {string}
 */
function buildImageUrl(s3_prefix, imagePath) {
  return S3_BASE_URL + imagePath;
}

describe('buildImageUrl', () => {
  // Unit tests — concrete examples
  it('builds a correct URL for a known image path', () => {
    const url = buildImageUrl('movies/need-for-speed-2014/', 'movies/need-for-speed-2014/01.jpg');
    expect(url).toBe('https://s3.amazonaws.com/flixpatrol-screencaps/movies/need-for-speed-2014/01.jpg');
  });

  it('starts with the S3 base URL', () => {
    const url = buildImageUrl('', 'movies/film-2020/02.jpg');
    expect(url.startsWith(S3_BASE_URL)).toBe(true);
  });

  // Property 6: Image URL construction is correct
  // Validates: Requirements 2.1
  it('Property 6 — result starts with S3 base URL and contains imagePath', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 80 }),  // s3_prefix
        fc.string({ minLength: 1, maxLength: 120 }), // imagePath
        (s3_prefix, imagePath) => {
          const url = buildImageUrl(s3_prefix, imagePath);
          // Must start with the base URL
          expect(url.startsWith(S3_BASE_URL)).toBe(true);
          // Must contain the imagePath as a substring
          expect(url.includes(imagePath)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

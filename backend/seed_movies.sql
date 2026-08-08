-- Seed movies with banner URLs that match bdn/public/images/*_banner.jpg.
-- Stale rows from earlier smoke tests are detached through the FK chain
-- then deleted so we end with a clean catalogue.
BEGIN;

WITH stale_movies AS (
  SELECT id FROM movies WHERE title = 'Test Film'
), stale_shows AS (
  SELECT id FROM shows WHERE movie_id IN (SELECT id FROM stale_movies)
)
DELETE FROM booking_seats
WHERE booking_id IN (
  SELECT id FROM bookings WHERE show_id IN (SELECT id FROM stale_shows)
);

WITH stale_shows AS (
  SELECT id FROM shows WHERE movie_id IN (SELECT id FROM movies WHERE title = 'Test Film')
)
DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE show_id IN (SELECT id FROM stale_shows));

WITH stale_shows AS (
  SELECT id FROM shows WHERE movie_id IN (SELECT id FROM movies WHERE title = 'Test Film')
)
DELETE FROM bookings WHERE show_id IN (SELECT id FROM stale_shows);

WITH stale_shows AS (
  SELECT id FROM shows WHERE movie_id IN (SELECT id FROM movies WHERE title = 'Test Film')
)
DELETE FROM hold_seats WHERE hold_id IN (
  SELECT id FROM holds WHERE show_id IN (SELECT id FROM stale_shows)
);

WITH stale_shows AS (
  SELECT id FROM shows WHERE movie_id IN (SELECT id FROM movies WHERE title = 'Test Film')
)
DELETE FROM holds WHERE show_id IN (SELECT id FROM stale_shows);

DELETE FROM show_seats WHERE show_id IN (SELECT id FROM shows WHERE movie_id IN (SELECT id FROM movies WHERE title = 'Test Film'));
DELETE FROM shows WHERE movie_id IN (SELECT id FROM movies WHERE title = 'Test Film');
DELETE FROM movies WHERE title = 'Test Film';

INSERT INTO movies (id, title, description, duration_minutes, poster_url, banner_url) VALUES
  (gen_random_uuid(), 'Spider-Man: Brand New Day (2D)', 'Peter Parker navigates a brand new chapter filled with unexpected allies, emerging citywide threats, and fresh challenges in this 2D theatrical release.', 135, '/images/spiderman_poster.jpg', '/images/spiderman_banner.jpg'),
  (gen_random_uuid(), 'Spider-Man: Brand New Day (3D)', 'Experience the high-octane web-slinging spectacle of Spider-Man: Brand New Day in full 3D visual depth with enhanced spatial audio and effects.', 135, '/images/spiderman_3d_poster.jpg', '/images/spiderman_3d_banner.jpg'),
  (gen_random_uuid(), 'Avatar: Fire and Ash', 'Jake Sully and Neytiri encounter a new, aggressive clan of Na''vi known as the Ash People in an uncharted region of Pandora.', 192, '/images/avatar_poster.jpg', '/images/avatar_banner.jpg'),
  (gen_random_uuid(), 'Inception: Cosmic Rift', 'A team of dream operatives embark on a deep-level subconscious extraction mission that threatens the fabric of physical reality.', 156, '/images/inception_poster.jpg', '/images/inception_banner.jpg'),
  (gen_random_uuid(), 'Dune: Messiah Part 1', 'Paul Atreides ascends the Emperor''s throne while facing cosmic conspiracies and religious fervour across the known universe.', 168, '/images/dune_poster.jpg', '/images/dune_banner.jpg');

COMMIT;

SELECT title, poster_url, banner_url FROM movies ORDER BY title;
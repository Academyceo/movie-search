# CEO Movie Search

A responsive movie and TV search app powered by the [OMDb API](https://www.omdbapi.com/).

## Run it

1. Get a free API key at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) and activate it from the confirmation email.
2. Open `index.html` in a browser, enter the key, and search a title or choose a suggestion.

The page does not save the key, but sends it directly to OMDb with each request. Anyone publishing this static app should have each visitor use their own key; do not put a private or shared key in the page.

## Publish with GitHub Pages

1. Create a GitHub repository and push these project files to its `main` or `master` branch.
2. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
3. The included workflow deploys the static site. When it finishes, GitHub shows the live URL under **Settings → Pages**.

Each visitor must enter their own OMDb key. GitHub Pages only hosts static files, so it cannot keep a shared API key secret.

OMDb supplies title details and ratings. For TV series, the app checks each season to calculate the total episode count and season-by-season breakdown. Movie titles show their runtime instead.

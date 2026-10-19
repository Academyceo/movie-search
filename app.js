const API_BASE = "https://www.omdbapi.com/";

const form = document.querySelector("#search-form");
const apiKeyInput = document.querySelector("#api-key");
const searchInput = document.querySelector("#search-input");
const searchButton = document.querySelector(".search-button");
const statusMessage = document.querySelector("#status-message");
const searchSection = document.querySelector("#search-section");
const resultsList = document.querySelector("#results-list");
const resultCount = document.querySelector("#result-count");
const detailPanel = document.querySelector("#detail-panel");
let currentSearchId = 0;

function setStatus(message, kind = "") {
  statusMessage.textContent = message;
  statusMessage.dataset.kind = kind;
}

function getApiKey() {
  return apiKeyInput.value.trim();
}

async function fetchOmdb(params) {
  const query = new URLSearchParams({ ...params, apikey: getApiKey() });
  const response = await fetch(`${API_BASE}?${query}`);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`OMDb returned an unreadable response (${response.status}). Check your connection and try again.`);
  }

  if (data.Response === "False") {
    const reason = data.Error || `HTTP ${response.status}`;
    if (response.status === 401 || /invalid api key|not activated/i.test(reason)) {
      throw new Error("OMDb rejected this API key. Make sure you activated it from the confirmation email, then re-enter the key. If it still fails, request a new key from OMDb.");
    }
    throw new Error(`OMDb: ${reason}`);
  }
  if (!response.ok) {
    throw new Error(`OMDb request failed (HTTP ${response.status}). Please try again.`);
  }
  return data;
}

function createResultCard(item) {
  const button = document.createElement("button");
  button.className = "result-card";
  button.type = "button";
  button.setAttribute("aria-current", "false");

  const poster = document.createElement("img");
  poster.className = "result-poster";
  poster.alt = "";
  poster.loading = "lazy";
  if (item.Poster && item.Poster !== "N/A") {
    poster.src = item.Poster;
  }

  const copy = document.createElement("span");
  copy.className = "result-copy";
  const title = document.createElement("span");
  title.className = "result-title";
  title.textContent = item.Title;
  const meta = document.createElement("span");
  meta.className = "result-meta";
  meta.textContent = `${item.Year} · ${item.Type}`;
  copy.append(title, meta);

  const arrow = document.createElement("span");
  arrow.className = "result-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "→";
  button.append(poster, copy, arrow);
  button.addEventListener("click", () => showDetails(item.imdbID, button));
  return button;
}

function renderResults(items) {
  resultsList.replaceChildren();
  resultCount.textContent = `(${items.length})`;

  if (items.length === 0) {
    const message = document.createElement("p");
    message.className = "no-results";
    message.textContent = "No titles found. Try another spelling or a shorter search.";
    resultsList.append(message);
    return;
  }

  for (const item of items) {
    resultsList.append(createResultCard(item));
  }
}

function addDetailItem(grid, label, value) {
  if (!value || value === "N/A") return;
  const item = document.createElement("div");
  item.className = "detail-item";
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  item.append(term, description);
  grid.append(item);
}

function renderDetails(movie) {
  detailPanel.replaceChildren();
  detailPanel.classList.add("has-detail");
  const poster = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : "";
  detailPanel.style.setProperty("--backdrop-image", poster ? `url("${poster}")` : "none");

  const layout = document.createElement("div");
  layout.className = "detail-layout";

  const content = document.createElement("div");
  content.className = "detail-content";

  const posterCard = document.createElement("div");
  posterCard.className = "detail-poster-card";
  if (poster) {
    const posterImage = document.createElement("img");
    posterImage.className = "detail-poster";
    posterImage.alt = `Poster for ${movie.Title}`;
    posterImage.src = poster;
    posterImage.loading = "lazy";
    posterImage.addEventListener("error", () => {
      const unavailable = document.createElement("span");
      unavailable.className = "poster-unavailable";
      unavailable.textContent = "Poster unavailable";
      posterCard.replaceChildren(unavailable);
    }, { once: true });
    posterCard.append(posterImage);
  } else {
    const unavailable = document.createElement("span");
    unavailable.className = "poster-unavailable";
    unavailable.textContent = "No poster available";
    posterCard.append(unavailable);
  }

  const type = document.createElement("span");
  type.className = "detail-type";
  type.textContent = movie.Type;

  const title = document.createElement("h2");
  title.className = "detail-title";
  title.textContent = movie.Title;

  const facts = document.createElement("div");
  facts.className = "detail-facts";
  for (const value of [movie.Year, movie.Rated, movie.Runtime, movie.Released]) {
    if (!value || value === "N/A") continue;
    const fact = document.createElement("span");
    fact.textContent = value;
    facts.append(fact);
  }

  const ratings = document.createElement("div");
  ratings.className = "rating-row";
  for (const rating of movie.Ratings || []) {
    const badge = document.createElement("span");
    badge.className = "rating-badge";
    const source = document.createElement("strong");
    source.textContent = `${rating.Source}: `;
    badge.append(source, document.createTextNode(rating.Value));
    ratings.append(badge);
  }

  const plot = document.createElement("p");
  plot.className = "detail-plot";
  plot.textContent = movie.Plot && movie.Plot !== "N/A" ? movie.Plot : "No plot summary is available.";

  const grid = document.createElement("dl");
  grid.className = "detail-grid";
  addDetailItem(grid, "Genre", movie.Genre);
  addDetailItem(grid, "Director", movie.Director);
  addDetailItem(grid, "Writer", movie.Writer);
  addDetailItem(grid, "Cast", movie.Actors);
  addDetailItem(grid, "Language", movie.Language);
  addDetailItem(grid, "Country", movie.Country);
  addDetailItem(grid, "Awards", movie.Awards);
  addDetailItem(grid, "Box office", movie.BoxOffice);
  addDetailItem(grid, "Metascore", movie.Metascore);
  addDetailItem(grid, "IMDb votes", movie.imdbVotes);

  content.append(type, title, facts, ratings, plot, grid);

  if (movie.Type === "series") {
    const episodeInfo = document.createElement("div");
    episodeInfo.className = "episode-info";
    episodeInfo.textContent = "Loading episode count…";
    episodeInfo.dataset.episodeInfo = "";
    content.append(episodeInfo);
  }

  layout.append(content, posterCard);
  detailPanel.append(layout);
}

async function loadEpisodeCount(imdbId, panel) {
  try {
    const series = await fetchOmdb({ i: imdbId });
    const seasonCount = Number.parseInt(series.totalSeasons, 10);
    if (!Number.isInteger(seasonCount) || seasonCount < 1) {
      throw new Error("OMDb doesn’t list season data for this series.");
    }

    let totalEpisodes = 0;
    const seasonCounts = [];
    for (let season = 1; season <= seasonCount; season += 1) {
      const data = await fetchOmdb({ i: imdbId, Season: String(season) });
      const episodes = Array.isArray(data.Episodes) ? data.Episodes : [];
      totalEpisodes += episodes.length;
      seasonCounts.push(episodes.length);
    }

    if (!panel.isConnected || panel.dataset.imdbId !== imdbId) return;
    const episodeInfo = panel.querySelector("[data-episode-info]");
    if (!episodeInfo) return;
    episodeInfo.replaceChildren();
    const summary = document.createElement("strong");
    summary.textContent = `${totalEpisodes} episodes across ${seasonCount} seasons`;
    const breakdown = document.createElement("span");
    breakdown.textContent = ` · ${seasonCounts.map((count, index) => `S${index + 1}: ${count}`).join("  ")}`;
    episodeInfo.append(summary, breakdown);
  } catch (error) {
    if (!panel.isConnected || panel.dataset.imdbId !== imdbId) return;
    const episodeInfo = panel.querySelector("[data-episode-info]");
    if (episodeInfo) {
      episodeInfo.textContent = `Episode count unavailable: ${error.message}`;
    }
  }
}

async function showDetails(imdbId, selectedButton) {
  for (const button of resultsList.querySelectorAll(".result-card")) {
    button.setAttribute("aria-current", String(button === selectedButton));
  }
  detailPanel.replaceChildren();
  detailPanel.classList.remove("has-detail");
  detailPanel.style.removeProperty("--backdrop-image");
  detailPanel.dataset.imdbId = imdbId;
  const loading = document.createElement("div");
  loading.className = "detail-placeholder";
  loading.textContent = "Loading title details…";
  detailPanel.append(loading);

  try {
    const movie = await fetchOmdb({ i: imdbId, plot: "full" });
    if (detailPanel.dataset.imdbId !== imdbId) return;
    renderDetails(movie);
    detailPanel.dataset.imdbId = imdbId;
    if (movie.Type === "series") {
      void loadEpisodeCount(imdbId, detailPanel);
    }
  } catch (error) {
    if (detailPanel.dataset.imdbId !== imdbId) return;
    detailPanel.replaceChildren();
    const message = document.createElement("div");
    message.className = "detail-placeholder";
    message.textContent = error.message;
    detailPanel.append(message);
  }
}

async function searchTitles(query) {
  const key = getApiKey();
  if (!key) {
    apiKeyInput.focus();
    setStatus("Enter your free OMDb API key before searching.", "error");
    return;
  }
  if (!query.trim()) {
    searchInput.focus();
    setStatus("Enter a movie or TV show title to search.", "error");
    return;
  }

  const searchId = ++currentSearchId;
  searchButton.disabled = true;
  setStatus("Searching movies and TV shows…");
  searchSection.hidden = false;
  resultsList.replaceChildren();
  resultCount.textContent = "";
  detailPanel.dataset.imdbId = "";
  detailPanel.classList.remove("has-detail");
  detailPanel.style.removeProperty("--backdrop-image");
  const loading = document.createElement("div");
  loading.className = "detail-placeholder";
  loading.textContent = "Searching…";
  detailPanel.replaceChildren(loading);

  try {
    const data = await fetchOmdb({ s: query.trim() });
    if (searchId !== currentSearchId) return;
    renderResults(data.Search || []);
    setStatus(`Found ${data.totalResults} matching titles. Select one to see the details.`, "success");
    if (data.Search && data.Search.length > 0) {
      const firstResult = resultsList.querySelector(".result-card");
      if (firstResult) {
        await showDetails(data.Search[0].imdbID, firstResult);
      }
    } else {
      detailPanel.replaceChildren();
      const empty = document.createElement("div");
      empty.className = "detail-placeholder";
      empty.textContent = "No titles found. Try another search.";
      detailPanel.append(empty);
    }
  } catch (error) {
    if (searchId !== currentSearchId) return;
    setStatus(error.message, "error");
    renderResults([]);
    detailPanel.replaceChildren();
    const message = document.createElement("div");
    message.className = "detail-placeholder";
    message.textContent = error.message;
    detailPanel.append(message);
  } finally {
    if (searchId === currentSearchId) {
      searchButton.disabled = false;
    }
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void searchTitles(searchInput.value);
});

document.querySelectorAll(".suggestion-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    searchInput.value = chip.textContent;
    void searchTitles(searchInput.value);
  });
});

apiKeyInput.addEventListener("input", () => {
  if (getApiKey() && statusMessage.dataset.kind === "error") {
    setStatus("Your key isn’t saved by this page. Use your own key; requests are sent directly to OMDb.");
  }
});

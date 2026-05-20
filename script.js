const searchInput = document.getElementById('searchInput');
const bookFilter = document.getElementById('bookFilter');
const searchButton = document.getElementById('searchButton');
const resultsEl = document.getElementById('results');

let bibleVerses = [];

function escapeHTML(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, tokens) {
    let highlighted = escapeHTML(text);
    tokens.forEach(token => {
        if (!token) return;
        const regex = new RegExp(escapeRegExp(token), 'gi');
        highlighted = highlighted.replace(regex, '<mark>$&</mark>');
    });
    return highlighted;
}

function buildReference(verse) {
    return `${verse.book} ${verse.chapter}:${verse.verse}`;
}

function renderResults(matches, query) {
    if (!matches.length) {
        resultsEl.innerHTML = '<p>No verses found. Try a different keyword or book name.</p>';
        return;
    }

    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const list = matches.slice(0, 50).map(result => {
        const verseText = highlightText(result.text, tokens);
        return `
            <article class="result-item">
                <div class="reference">${escapeHTML(buildReference(result))}</div>
                <p>${verseText}</p>
            </article>
        `;
    }).join('');

    const summary = `<p>Showing ${Math.min(matches.length, 50)} of ${matches.length} matching verses.</p>`;
    resultsEl.innerHTML = summary + list;
}

function flattenBible(raw) {
    const verses = [];

    const addVerse = (book, chapter, verse, text) => {
        const safeText = String(text || '');
        verses.push({
            book,
            chapter: Number(chapter) || 0,
            verse: Number(verse) || 0,
            text: safeText,
            textLower: safeText.toLowerCase(),
            refLower: `${book} ${chapter}:${verse}`.toLowerCase(),
        });
    };

    if (Array.isArray(raw)) {
        raw.forEach(bookItem => {
            const bookName = bookItem.book || bookItem.name || bookItem.title || '';
            if (Array.isArray(bookItem.chapters)) {
                bookItem.chapters.forEach((chapter, chapterIndex) => {
                    if (Array.isArray(chapter)) {
                        chapter.forEach((verseText, verseIndex) => {
                            addVerse(bookName, chapterIndex + 1, verseIndex + 1, verseText);
                        });
                    } else if (chapter && Array.isArray(chapter.verses)) {
                        chapter.verses.forEach(verse => {
                            addVerse(bookName, chapter.chapter || chapter.number || chapterIndex + 1, verse.verse || verse.number, verse.text || verse.translation);
                        });
                    } else if (chapter && ('verse' in chapter || 'text' in chapter)) {
                        addVerse(bookName, chapter.chapter || chapter.number || chapterIndex + 1, chapter.verse || chapter.number, chapter.text || chapter.translation);
                    }
                });
            }
            if (Array.isArray(bookItem.verses)) {
                bookItem.verses.forEach(verse => {
                    addVerse(bookName, verse.chapter || 0, verse.verse || verse.number, verse.text || verse.translation);
                });
            }
        });
    } else {
        Object.entries(raw).forEach(([book, chapters]) => {
            if (Array.isArray(chapters)) {
                chapters.forEach((chapter, chapterIndex) => {
                    if (Array.isArray(chapter)) {
                        chapter.forEach((verseText, verseIndex) => {
                            addVerse(book, chapterIndex + 1, verseIndex + 1, verseText);
                        });
                    } else if (chapter && Array.isArray(chapter.verses)) {
                        chapter.verses.forEach(verse => {
                            addVerse(book, chapter.chapter || chapter.number || chapterIndex + 1, verse.verse || verse.number, verse.text || verse.translation);
                        });
                    } else if (chapter && ('verse' in chapter || 'text' in chapter)) {
                        addVerse(book, chapter.chapter || chapter.number || chapterIndex + 1, chapter.verse || chapter.number, chapter.text || chapter.translation);
                    }
                });
            }
        });
    }

    return verses;
}

function populateBookFilter(verses) {
    const books = [...new Set(verses.map(v => v.book))].sort((a, b) => a.localeCompare(b));
    const options = books.map(book => `<option value="${escapeHTML(book)}">${escapeHTML(book)}</option>`).join('');
    bookFilter.innerHTML = '<option value="">All Books</option>' + options;
}

function searchBible() {
    const query = searchInput.value.trim();
    const selectedBook = bookFilter.value;

    if (!query && !selectedBook) {
        renderResults(bibleVerses.slice(0, 20), '');
        return;
    }

    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = bibleVerses.filter(verse => {
        if (selectedBook && verse.book !== selectedBook) {
            return false;
        }

        if (!tokens.length) {
            return true;
        }

        return tokens.every(token => verse.textLower.includes(token) || verse.refLower.includes(token));
    });

    renderResults(matches, query);
}

async function loadBible() {
    resultsEl.innerHTML = '<p>Loading scripture data…</p>';
    try {
        const response = await fetch('bible.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const rawData = await response.json();
        bibleVerses = flattenBible(rawData);

        if (!bibleVerses.length) {
            resultsEl.innerHTML = '<p>The Bible data could not be interpreted. Please confirm the file format.</p>';
            return;
        }

        populateBookFilter(bibleVerses);
        renderResults(bibleVerses.slice(0, 20), '');
    } catch (error) {
        resultsEl.innerHTML = `<p>Unable to load Bible data from <code>bible.json</code>. ${escapeHTML(error.message)}</p><p>If you are opening the file directly, use a local web server or Live Server extension because browsers may block local JSON fetches.</p>`;
    }
}

searchButton.addEventListener('click', searchBible);
searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchBible();
    }
});
bookFilter.addEventListener('change', searchBible);

window.addEventListener('DOMContentLoaded', loadBible);
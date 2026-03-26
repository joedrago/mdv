let marginEl = null
// Pixel threshold for snapping to an existing bookmark when clicking
const SNAP_PX = 10

function ensureMargin() {
    if (marginEl) return
    marginEl = document.createElement("div")
    marginEl.id = "bookmark-margin"
    document.getElementById("content-area").appendChild(marginEl)

    marginEl.addEventListener("click", (e) => {
        const tab = Tabs.getActiveTab()
        if (!tab) return
        const area = document.getElementById("content-area")
        if (!area || area.scrollHeight === 0) return

        // Convert click to absolute pixel position in the document
        const areaRect = area.getBoundingClientRect()
        const pixelY = e.clientY - areaRect.top + area.scrollTop
        const ratio = pixelY / area.scrollHeight

        toggleAtPosition(tab, ratio, area)
    })
}

function toggle() {
    const tab = Tabs.getActiveTab()
    if (!tab) return
    if (!tab.bookmarks) tab.bookmarks = loadBookmarks(tab.filePath)

    const area = document.getElementById("content-area")
    if (!area || area.scrollHeight === 0) return
    const ratio = typeof Cursor !== "undefined" ? Cursor.getRatio() : area.scrollTop / area.scrollHeight

    toggleAtPosition(tab, ratio, area)
}

function toggleAtPosition(tab, ratio, area) {
    if (!tab.bookmarks) tab.bookmarks = loadBookmarks(tab.filePath)

    const threshold = SNAP_PX / area.scrollHeight

    // Check if near an existing bookmark
    const existing = tab.bookmarks.findIndex((b) => Math.abs(b - ratio) < threshold)
    if (existing !== -1) {
        tab.bookmarks.splice(existing, 1)
    } else {
        tab.bookmarks.push(ratio)
        tab.bookmarks.sort((a, b) => a - b)
    }

    saveBookmarks(tab.filePath, tab.bookmarks)
    updateMarkers()
}

function next() {
    const tab = Tabs.getActiveTab()
    if (!tab || !tab.bookmarks || tab.bookmarks.length === 0) return

    const area = document.getElementById("content-area")
    if (!area || area.scrollHeight === 0) return
    const current = typeof Cursor !== "undefined" ? Cursor.getRatio() : area.scrollTop / area.scrollHeight

    const epsilon = SNAP_PX / area.scrollHeight
    let target = tab.bookmarks.find((b) => b > current + epsilon)
    if (target === undefined) target = tab.bookmarks[0]

    scrollToBookmark(area, target)
}

function prev() {
    const tab = Tabs.getActiveTab()
    if (!tab || !tab.bookmarks || tab.bookmarks.length === 0) return

    const area = document.getElementById("content-area")
    if (!area || area.scrollHeight === 0) return
    const current = typeof Cursor !== "undefined" ? Cursor.getRatio() : area.scrollTop / area.scrollHeight

    const epsilon = SNAP_PX / area.scrollHeight
    let target = null
    for (let i = tab.bookmarks.length - 1; i >= 0; i--) {
        if (tab.bookmarks[i] < current - epsilon) {
            target = tab.bookmarks[i]
            break
        }
    }
    if (target === null) target = tab.bookmarks[tab.bookmarks.length - 1]

    scrollToBookmark(area, target)
}

function scrollToBookmark(area, ratio) {
    const pixelY = ratio * area.scrollHeight
    // Center the bookmark in the visible area
    area.scrollTo({ top: pixelY - area.clientHeight / 2, behavior: "smooth" })
    if (typeof Cursor !== "undefined") {
        Cursor.update(pixelY)
    }
}

function clearAll() {
    const tab = Tabs.getActiveTab()
    if (!tab) return
    tab.bookmarks = []
    saveBookmarks(tab.filePath, tab.bookmarks)
    updateMarkers()
}

function updateMarkers() {
    ensureMargin()
    marginEl.innerHTML = ""

    const area = document.getElementById("content-area")
    if (!area) return

    // Size the margin to match the full scrollable height
    marginEl.style.height = area.scrollHeight + "px"

    const tab = Tabs.getActiveTab()
    if (!tab || !tab.bookmarks || tab.bookmarks.length === 0) return

    const scrollHeight = area.scrollHeight
    for (const ratio of tab.bookmarks) {
        const marker = document.createElement("div")
        marker.className = "bookmark-marker"
        marker.style.top = ratio * scrollHeight + "px"
        marginEl.appendChild(marker)
    }
}

function refreshMarkers() {
    const tab = Tabs.getActiveTab()
    if (!tab) return
    if (!tab.bookmarks) tab.bookmarks = loadBookmarks(tab.filePath)

    // Prune bookmarks beyond content after a hot-reload
    const area = document.getElementById("content-area")
    if (area && tab.bookmarks.length > 0) {
        const body = Tabs.getMarkdownBody(tab.id)
        if (body) {
            const lastChild = body.lastElementChild
            if (lastChild) {
                const contentBottom = (lastChild.offsetTop + lastChild.offsetHeight) / area.scrollHeight
                tab.bookmarks = tab.bookmarks.filter((b) => b <= contentBottom)
                saveBookmarks(tab.filePath, tab.bookmarks)
            }
        }
    }

    updateMarkers()
}

function deleteBookmarks(filePath) {
    try {
        localStorage.removeItem("mdv-bookmarks-" + filePath)
    } catch (_e) {
        // ignore
    }
}

function saveBookmarks(filePath, bookmarks) {
    try {
        if (bookmarks.length === 0) {
            localStorage.removeItem("mdv-bookmarks-" + filePath)
        } else {
            localStorage.setItem("mdv-bookmarks-" + filePath, JSON.stringify(bookmarks))
        }
    } catch (_e) {
        // ignore
    }
}

function loadBookmarks(filePath) {
    try {
        const data = localStorage.getItem("mdv-bookmarks-" + filePath)
        if (data) return JSON.parse(data)
    } catch (_e) {
        // ignore
    }
    return []
}

// eslint-disable-next-line no-unused-vars
const Bookmarks = { toggle, next, prev, clearAll, refreshMarkers, deleteBookmarks }

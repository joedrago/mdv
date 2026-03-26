let findBarEl = null
let findInput = null
let matchCountEl = null
let currentIndex = -1
let matches = []
let matchCase = false
let wholeWord = false
let debounceTimer = null

function createFindBar() {
    if (findBarEl) return

    // Restore persisted options
    try {
        matchCase = localStorage.getItem("mdv-find-match-case") === "1"
        wholeWord = localStorage.getItem("mdv-find-whole-word") === "1"
    } catch (_e) {
        // ignore
    }

    findBarEl = document.createElement("div")
    findBarEl.id = "find-bar"
    findBarEl.classList.add("hidden")

    findBarEl.innerHTML = `
        <div id="find-input-wrapper">
            <input type="text" id="find-input" placeholder="Find..." />
            <button id="find-clear" title="Clear">&times;</button>
        </div>
        <span id="find-match-count"></span>
        <button id="find-prev" title="Previous match (Shift+Enter)">&#x25B2;</button>
        <button id="find-next" title="Next match (Enter)">&#x25BC;</button>
        <label class="find-option" title="Match case">
            <input type="checkbox" id="find-match-case" ${matchCase ? "checked" : ""} />
            <span>Aa</span>
        </label>
        <label class="find-option" title="Whole word">
            <input type="checkbox" id="find-whole-word" ${wholeWord ? "checked" : ""} />
            <span class="find-whole-word-icon">ab</span>
        </label>
        <button id="find-close" title="Close (Escape)">&times;</button>
    `

    document.getElementById("main-container").appendChild(findBarEl)

    findInput = document.getElementById("find-input")
    matchCountEl = document.getElementById("find-match-count")

    findInput.addEventListener("input", () => {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => performSearch(), 200)
    })

    findInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault()
            if (e.shiftKey) {
                navigateMatch(-1)
            } else {
                navigateMatch(1)
            }
        } else if (e.key === "Escape") {
            closeFindBar()
        }
    })

    document.getElementById("find-clear").addEventListener("click", () => {
        findInput.value = ""
        findInput.focus()
        clearHighlights()
        matches = []
        currentIndex = -1
        matchCountEl.textContent = ""
    })
    document.getElementById("find-prev").addEventListener("click", () => navigateMatch(-1))
    document.getElementById("find-next").addEventListener("click", () => navigateMatch(1))
    document.getElementById("find-close").addEventListener("click", () => closeFindBar())

    document.getElementById("find-match-case").addEventListener("change", (e) => {
        matchCase = e.target.checked
        try { localStorage.setItem("mdv-find-match-case", matchCase ? "1" : "0") } catch (_e) { /* ignore */ }
        performSearch()
    })

    document.getElementById("find-whole-word").addEventListener("change", (e) => {
        wholeWord = e.target.checked
        try { localStorage.setItem("mdv-find-whole-word", wholeWord ? "1" : "0") } catch (_e) { /* ignore */ }
        performSearch()
    })
}

function toggleFind() {
    createFindBar()
    if (findBarEl.classList.contains("hidden")) {
        openFindBar()
    } else {
        closeFindBar()
    }
}

function openFindBar() {
    createFindBar()
    findBarEl.classList.remove("hidden")
    findInput.focus()
    findInput.select()
    if (findInput.value) {
        performSearch()
    }
}

function closeFindBar() {
    if (!findBarEl) return
    findBarEl.classList.add("hidden")
    clearHighlights()
    matchCountEl.textContent = ""
    currentIndex = -1
    matches = []
}

function getActiveBody() {
    const tab = Tabs.getActiveTab()
    if (!tab) return null
    return Tabs.getMarkdownBody(tab.id)
}

function performSearch() {
    clearHighlights()
    matches = []
    currentIndex = -1

    const query = findInput.value
    if (!query) {
        matchCountEl.textContent = ""
        return
    }

    const body = getActiveBody()
    if (!body) return

    // Build regex from query
    let pattern
    try {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const wrapped = wholeWord ? `\\b${escaped}\\b` : escaped
        const flags = matchCase ? "g" : "gi"
        pattern = new RegExp(wrapped, flags)
    } catch (_e) {
        matchCountEl.textContent = "0 of 0"
        return
    }

    // Walk text nodes and find matches
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null)
    const textNodes = []
    let node
    while ((node = walker.nextNode())) {
        textNodes.push(node)
    }

    for (const textNode of textNodes) {
        const text = textNode.textContent
        let match
        const fragments = []
        let lastIndex = 0

        pattern.lastIndex = 0
        while ((match = pattern.exec(text)) !== null) {
            if (match.index > lastIndex) {
                fragments.push({ text: text.slice(lastIndex, match.index), highlight: false })
            }
            fragments.push({ text: match[0], highlight: true })
            lastIndex = pattern.lastIndex
            // Prevent infinite loop on zero-length matches
            if (match[0].length === 0) {
                pattern.lastIndex++
            }
        }

        if (fragments.length === 0) continue

        if (lastIndex < text.length) {
            fragments.push({ text: text.slice(lastIndex), highlight: false })
        }

        const parent = textNode.parentNode
        for (const frag of fragments) {
            if (frag.highlight) {
                const mark = document.createElement("mark")
                mark.className = "search-highlight"
                mark.textContent = frag.text
                matches.push(mark)
                parent.insertBefore(mark, textNode)
            } else {
                parent.insertBefore(document.createTextNode(frag.text), textNode)
            }
        }
        parent.removeChild(textNode)
    }

    if (matches.length > 0) {
        // Find the first match at or below the current line
        const scrollTop = typeof Cursor !== "undefined" ? Cursor.getPixel() : document.getElementById("content-area").scrollTop
        currentIndex = 0
        for (let i = 0; i < matches.length; i++) {
            if (matches[i].offsetTop >= scrollTop) {
                currentIndex = i
                break
            }
        }
        matches[currentIndex].classList.add("active")
        matches[currentIndex].scrollIntoView({ block: "center", behavior: "smooth" })
        if (typeof Cursor !== "undefined") {
            Cursor.update(matches[currentIndex].offsetTop)
        }
    }

    updateMatchCount()
    updateScrollMarkers()
}

function navigateMatch(direction) {
    if (matches.length === 0) return

    const wrap = typeof Settings !== "undefined" && Settings.getWrapNavigation()
    const cursorPx = typeof Cursor !== "undefined" ? Cursor.getPixel() : null

    // If cursor has moved away from the current match, find relative to cursor
    let newIndex
    if (cursorPx !== null && currentIndex >= 0 && Math.abs(matches[currentIndex].offsetTop - cursorPx) > 20) {
        if (direction > 0) {
            newIndex = matches.findIndex((m) => m.offsetTop > cursorPx)
            if (newIndex === -1) newIndex = wrap ? 0 : -1
        } else {
            newIndex = -1
            for (let i = matches.length - 1; i >= 0; i--) {
                if (matches[i].offsetTop < cursorPx) { newIndex = i; break }
            }
            if (newIndex === -1) newIndex = wrap ? matches.length - 1 : -1
        }
        if (newIndex === -1) return
    } else {
        newIndex = currentIndex + direction
        if (!wrap && (newIndex < 0 || newIndex >= matches.length)) return
        newIndex = (newIndex + matches.length) % matches.length
    }

    matches[currentIndex].classList.remove("active")
    currentIndex = newIndex
    matches[currentIndex].classList.add("active")
    matches[currentIndex].scrollIntoView({ block: "center", behavior: "smooth" })
    if (typeof Cursor !== "undefined") {
        Cursor.update(matches[currentIndex].offsetTop)
    }
    updateMatchCount()

    // Update active scroll marker
    const markers = document.querySelectorAll(".find-scroll-marker")
    for (let i = 0; i < markers.length; i++) {
        markers[i].classList.toggle("active", i === currentIndex)
    }
}

function updateMatchCount() {
    if (matches.length === 0) {
        matchCountEl.textContent = findInput.value ? "0 results" : ""
    } else {
        matchCountEl.textContent = `${currentIndex + 1} of ${matches.length}`
    }
}

function updateScrollMarkers() {
    let track = document.getElementById("find-scroll-markers")
    if (!track) {
        track = document.createElement("div")
        track.id = "find-scroll-markers"
        document.getElementById("main-container").appendChild(track)
    }

    track.innerHTML = ""

    if (matches.length === 0) {
        track.classList.add("hidden")
        return
    }

    track.classList.remove("hidden")

    const area = document.getElementById("content-area")
    const scrollHeight = area.scrollHeight
    const trackHeight = track.clientHeight

    for (let i = 0; i < matches.length; i++) {
        const marker = document.createElement("div")
        marker.className = "find-scroll-marker"
        if (i === currentIndex) marker.classList.add("active")
        const ratio = matches[i].offsetTop / scrollHeight
        marker.style.top = (ratio * trackHeight) + "px"
        track.appendChild(marker)
    }
}

function clearHighlights() {
    const body = getActiveBody()
    if (!body) return

    const marks = body.querySelectorAll("mark.search-highlight")
    for (const mark of marks) {
        const parent = mark.parentNode
        parent.replaceChild(document.createTextNode(mark.textContent), mark)
        parent.normalize()
    }
    matches = []
    currentIndex = -1

    const track = document.getElementById("find-scroll-markers")
    if (track) {
        track.innerHTML = ""
        track.classList.add("hidden")
    }
}

function refreshSearch() {
    clearHighlights()
    if (findBarEl && !findBarEl.classList.contains("hidden") && findInput.value) {
        performSearch()
    }
}

// eslint-disable-next-line no-unused-vars
const Find = { toggleFind, closeFindBar, clearHighlights, refreshSearch }

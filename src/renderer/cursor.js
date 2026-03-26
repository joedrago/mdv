let cursorY = 0 // absolute pixel position in the document
let lockedUntil = 0 // timestamp: suppress clamping during smooth scrolls

function clampToViewport() {
    if (Date.now() < lockedUntil) return
    const area = document.getElementById("content-area")
    if (!area) return
    const top = area.scrollTop
    const bottom = top + area.clientHeight
    if (cursorY < top) cursorY = top
    if (cursorY > bottom) cursorY = bottom
}

function setFromClick(clientY) {
    const area = document.getElementById("content-area")
    if (!area) return
    cursorY = clientY - area.getBoundingClientRect().top + area.scrollTop
    lockedUntil = 0
}

function update(pixelY) {
    cursorY = pixelY
    // Suppress clamping while the smooth scroll animation settles
    lockedUntil = Date.now() + 2000
}

function getPixel() {
    return cursorY
}

function getRatio() {
    const area = document.getElementById("content-area")
    if (!area || area.scrollHeight === 0) return 0
    return cursorY / area.scrollHeight
}

// eslint-disable-next-line no-unused-vars
const Cursor = { clampToViewport, setFromClick, update, getPixel, getRatio }

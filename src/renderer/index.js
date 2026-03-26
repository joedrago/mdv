document.addEventListener("DOMContentLoaded", () => {
    Themes.loadSavedTheme()
    TOC.loadTocState()

    // Set up drag-and-drop
    document.addEventListener("dragover", (e) => {
        e.preventDefault()
        e.stopPropagation()
    })

    document.addEventListener("drop", async (e) => {
        e.preventDefault()
        e.stopPropagation()
        for (const file of e.dataTransfer.files) {
            const filePath = window.mdv.getPathForFile(file)
            if (filePath) {
                await openFile(filePath)
            }
        }
    })

    // Wire up IPC events from main process
    window.mdv.onOpenFile(async (filePath) => {
        await openFile(filePath)
    })

    window.mdv.onFileChanged(async (data) => {
        const tab = Tabs.findTabByPath(data.filePath)
        if (!tab) return

        const body = Tabs.getMarkdownBody(tab.id)
        if (!body) return

        // Save scroll position from the actual scroll container
        const area = document.getElementById("content-area")
        const scrollTop = area ? area.scrollTop : 0

        await Markdown.renderToContainer(data.content, body)
        Links.setupLinkHandling(body)
        // Only update TOC if this is the active tab
        const activeTab = Tabs.getActiveTab()
        if (activeTab && activeTab.id === tab.id) {
            TOC.generateTOC(body)
        }

        // Restore scroll position
        if (area) {
            area.scrollTop = scrollTop
        }

        // Refresh bookmark markers after re-render (active tab only)
        if (activeTab && activeTab.id === tab.id) {
            Bookmarks.refreshMarkers()
        }
    })

    window.mdv.onSetTheme((theme) => {
        Themes.setTheme(theme)
    })

    window.mdv.onToggleToc(() => {
        TOC.toggleTOC()
    })

    window.mdv.onCloseTab(() => {
        const tab = Tabs.getActiveTab()
        if (tab) Tabs.closeTab(tab.id)
    })

    window.mdv.onMoveTab((direction) => {
        const tab = Tabs.getActiveTab()
        if (tab) Tabs.moveTab(tab.id, direction)
    })

    window.mdv.onToggleFind(() => {
        Find.toggleFind()
    })

    window.mdv.onBookmarkAction((action) => {
        if (action === "toggle") Bookmarks.toggle()
        else if (action === "next") Bookmarks.next()
        else if (action === "prev") Bookmarks.prev()
        else if (action === "clear") Bookmarks.clearAll()
    })

    // Empty state click opens file dialog
    document.getElementById("empty-state").addEventListener("click", async () => {
        const filePath = await window.mdv.openFileDialog()
        if (filePath) await openFile(filePath)
    })

    // Track cursor position and save session on scroll
    let scrollSaveTimer = null
    const contentAreaEl = document.getElementById("content-area")
    contentAreaEl.addEventListener("scroll", () => {
        Cursor.clampToViewport()
        if (scrollSaveTimer) clearTimeout(scrollSaveTimer)
        scrollSaveTimer = setTimeout(() => Tabs.saveSession(), 200)
    })

    contentAreaEl.addEventListener("click", (e) => {
        Cursor.setFromClick(e.clientY)
    })

    // Save session before app closes
    window.addEventListener("beforeunload", () => {
        Tabs.saveSession()
    })

    // Set up Prism autoloader path
    if (typeof Prism !== "undefined" && Prism.plugins && Prism.plugins.autoloader) {
        Prism.plugins.autoloader.languages_path = "../vendor/prism-components/"
    }

    // Restore saved session, then open any CLI arg files on top
    const session = Tabs.getSession()
    const restorePromise = (async () => {
        if (session && session.tabs && session.tabs.length > 0) {
            Tabs.setRestoring(true)
            for (const saved of session.tabs) {
                await openFile(saved.filePath)
                // Patch saved scroll into the tab object
                const tab = Tabs.findTabByPath(saved.filePath)
                if (tab) tab.scrollTop = saved.scrollTop || 0
            }
            // Switch to the previously active tab
            if (session.activeTab) {
                const active = Tabs.findTabByPath(session.activeTab)
                if (active) {
                    Tabs.switchTab(active.id)
                }
            }
            Tabs.setRestoring(false)
            // Restore active tab's scroll after layout settles
            requestAnimationFrame(() => {
                const activeTab = Tabs.getActiveTab()
                if (activeTab) {
                    document.getElementById("content-area").scrollTop = activeTab.scrollTop
                }
            })
        }
    })()

    restorePromise.then(async () => {
        const files = await window.mdv.getInitialFiles()
        for (const f of files) {
            await openFile(f)
        }
    })
})

async function openFile(filePath) {
    // Check if already open
    const existing = Tabs.findTabByPath(filePath)
    if (existing) {
        Tabs.switchTab(existing.id)
        return
    }

    const data = await window.mdv.readFile(filePath)
    if (data.error) {
        console.error("Failed to open file:", data.error)
        return
    }

    const tabId = Tabs.createTab(data.filePath, data.title)
    const body = Tabs.getMarkdownBody(tabId)
    if (body) {
        await Markdown.renderToContainer(data.content, body)
        Links.setupLinkHandling(body)
        TOC.generateTOC(body)
    }

    // Start watching for changes
    await window.mdv.watchFile(data.filePath)
}

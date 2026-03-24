const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const { loadWindowState, attachWindowStateHandlers } = require("./window-state")
const { registerIpcHandlers, sendOpenFile } = require("./ipc-handlers")
const { buildMenu } = require("./menu")
const { unwatchAll } = require("./file-manager")

app.setName("Markdown Viewer")

let mainWindow = null
let pendingFiles = []
let initialFilesConsumed = false

function extractFilePaths(argv) {
    // Skip electron binary and script path
    return argv.slice(app.isPackaged ? 1 : 2).filter((arg) => {
        return (
            !arg.startsWith("-") &&
            (arg.endsWith(".md") ||
                arg.endsWith(".markdown") ||
                arg.endsWith(".mdown") ||
                arg.endsWith(".mkd") ||
                arg.endsWith(".mkdn") ||
                arg.endsWith(".txt"))
        )
    })
}

function createWindow() {
    const state = loadWindowState()

    mainWindow = new BrowserWindow({
        width: state.width,
        height: state.height,
        x: state.x,
        y: state.y,
        title: "Markdown Viewer",
        icon: path.join(__dirname, "..", "..", "assets", "icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "..", "preload", "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    if (state.isMaximized) {
        mainWindow.maximize()
    }

    attachWindowStateHandlers(mainWindow)
    registerIpcHandlers()
    buildMenu(mainWindow)

    mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"))

    // Prevent Electron from navigating away, but allow in-page anchor links
    mainWindow.webContents.on("will-navigate", (event, url) => {
        const currentURL = mainWindow.webContents.getURL()
        const current = new URL(currentURL)
        const target = new URL(url)
        // Allow same-page hash navigation
        if (target.origin === current.origin && target.pathname === current.pathname && target.hash) {
            return
        }
        event.preventDefault()
    })

    mainWindow.on("closed", () => {
        unwatchAll()
        mainWindow = null
    })
}

// Handle initial files request from renderer
ipcMain.handle("get-initial-files", () => {
    if (initialFilesConsumed) return []
    initialFilesConsumed = true
    const files = [...pendingFiles, ...extractFilePaths(process.argv)].map((f) => path.resolve(f))
    pendingFiles = []
    return files
})

// Single instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
    app.quit()
} else {
    app.on("second-instance", (_event, argv) => {
        const files = extractFilePaths(argv)
        for (const f of files) {
            if (mainWindow) {
                sendOpenFile(mainWindow, path.resolve(f))
            }
        }
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        }
    })

    // macOS: file opened via Finder / dock drop
    app.on("open-file", (event, filePath) => {
        event.preventDefault()
        if (mainWindow) {
            sendOpenFile(mainWindow, filePath)
        } else {
            pendingFiles.push(filePath)
        }
    })

    app.whenReady().then(createWindow)

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit()
    })

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
}

const { ipcMain, dialog, shell, BrowserWindow } = require("electron")
const path = require("path")
const fileManager = require("./file-manager")
const { renderMarkdown } = require("./markdown")

function getWin() {
    const wins = BrowserWindow.getAllWindows()
    return wins.length > 0 ? wins[0] : null
}

let registered = false

function registerIpcHandlers() {
    if (registered) return
    registered = true

    ipcMain.handle("open-file-dialog", async () => {
        const win = getWin()
        if (!win) return null
        const result = await dialog.showOpenDialog(win, {
            properties: ["openFile"],
            filters: [
                { name: "Markdown Files", extensions: ["md", "markdown", "mdown", "mkd", "mkdn", "txt"] },
                { name: "All Files", extensions: ["*"] }
            ]
        })
        if (result.canceled || result.filePaths.length === 0) return null
        return result.filePaths[0]
    })

    ipcMain.handle("read-file", (_event, filePath) => {
        try {
            const data = fileManager.readMarkdownFile(filePath)
            fileManager.addRecentFile(filePath)
            return data
        } catch (err) {
            return { error: err.message }
        }
    })

    ipcMain.handle("watch-file", (_event, filePath) => {
        fileManager.watchFile(filePath, (resolved, content) => {
            const win = getWin()
            if (win && !win.isDestroyed()) {
                win.webContents.send("file-changed", { filePath: resolved, content })
            }
        })
    })

    ipcMain.handle("unwatch-file", (_event, filePath) => {
        fileManager.unwatchFile(filePath)
    })

    ipcMain.handle("open-external-link", (_event, url) => {
        shell.openExternal(url)
    })

    ipcMain.handle("get-recent-files", () => {
        return fileManager.getRecentFiles()
    })

    ipcMain.handle("clear-recent-files", () => {
        fileManager.clearRecentFiles()
    })

    ipcMain.handle("print", () => {
        const win = getWin()
        if (win) win.webContents.print()
    })

    ipcMain.handle("get-app-path", () => {
        return path.join(__dirname, "..")
    })

    ipcMain.handle("render-markdown", (_event, source) => {
        return renderMarkdown(source)
    })
}

function sendOpenFile(win, filePath) {
    if (win && !win.isDestroyed()) {
        win.webContents.send("open-file", filePath)
    }
}

function sendToggleToc(win) {
    if (win && !win.isDestroyed()) {
        win.webContents.send("toggle-toc")
    }
}

function sendSetTheme(win, theme) {
    if (win && !win.isDestroyed()) {
        win.webContents.send("set-theme", theme)
    }
}

function sendMoveTab(win, direction) {
    if (win && !win.isDestroyed()) {
        win.webContents.send("move-tab", direction)
    }
}

module.exports = { registerIpcHandlers, sendOpenFile, sendToggleToc, sendSetTheme, sendMoveTab }

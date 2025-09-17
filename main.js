const { app, BrowserWindow, ipcMain, Menu, MenuItem, shell } = require('electron')
const path = require('node:path')
const fs = require('fs')

let mainWindow
const TODOS_FILE = path.join(app.getPath('userData'), 'todos.json')


//custom menu
function externalLink(url) {
  shell.openExternal(url)
}

const menuItems = [
  {
    label: 'Help',
    submenu: [
        {
            label: 'Contact',
            click: () => externalLink('https://github.com/muneeb6624')
        }
    ]
  },
  {
    label: 'Website',
    submenu: [
        {
            label: 'Visit Site',
            click: () => externalLink('https://todo-list-frontend-puce.vercel.app/')
        }
    ]
  },
    ];

const menu = Menu.buildFromTemplate(menuItems);
Menu.setApplicationMenu(menu);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      spellcheck: true,
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  ipcMain.handle('toggle-dark-mode', () => {
    const isDark = mainWindow.webContents.executeJavaScript('document.documentElement.classList.toggle("dark")')
    return isDark
  })

  ipcMain.handle('get-dark-mode', () => {
    return mainWindow.webContents.executeJavaScript('document.documentElement.classList.contains("dark")')
  })

  // for spelling check suggestions.
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = new Menu()

    // Add each spelling suggestion
    for (const suggestion of params.dictionarySuggestions) {
      menu.append(new MenuItem({
        label: suggestion,
        click: () => mainWindow.webContents.replaceMisspelling(suggestion)
      }))
    }

    // Add separator if there are suggestions
    if (params.dictionarySuggestions.length > 0) {
      menu.append(new MenuItem({ type: 'separator' }))
    }

    // Allow users to add the misspelled word to the dictionary
    if (params.misspelledWord) {
      menu.append(
        new MenuItem({
          label: 'Add to dictionary',
          click: () => mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
        })
      )
    }

    // Only show the menu if there are spelling suggestions or a misspelled word
    if (params.dictionarySuggestions.length > 0 || params.misspelledWord) {
      menu.popup()
    }
  })

  // Load todos
  ipcMain.handle('load-todos', () => {
    try {
      if (fs.existsSync(TODOS_FILE)) {
        const data = fs.readFileSync(TODOS_FILE, 'utf8')
        return JSON.parse(data)
      }
      return []
    } catch (error) {
      console.error('Error loading todos:', error)
      return []
    }
  })

  // Save todos
  ipcMain.handle('save-todos', (_, todos) => {
    try {
      fs.writeFileSync(TODOS_FILE, JSON.stringify(todos))
      return true
    } catch (error) {
      console.error('Error saving todos:', error)
      return false
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
})
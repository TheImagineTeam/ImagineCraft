const url = require("url");
const path = require("path");
const glob = require("glob");
const { Archive } = require("buttercup");
const auth = require("./auth.js");
const ipc = require("electron").ipcMain;

const { app, BrowserWindow } = require("electron");

if (process.mas) app.setName("ImagineCraft");

let mainWindow = null;

app.on("window-all-closed", function() {
  app.quit();
});

ipc.on("login", function(event, username, password) {
  let client = auth.login(username, password);

  client.then(client => {
    console.log(client.token);
  });
});

//Listen for app to ready
app.on("ready", function() {
  mainWindow = new BrowserWindow({
    resizable: false,
    width: 1100,
    height: 600,
    transparent: true,
    frame: false,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
    },
  });
  //Load HTML into window
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "news.html"),
      protocol: "file",
      slashes: true,
    }),
  );
});

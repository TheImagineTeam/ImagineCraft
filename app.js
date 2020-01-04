const url = require("url");
const path = require("path");
const glob = require("glob");
const { Archive, Datasources, Credentials } = require("buttercup");
const { FileDatasource } = Datasources;
const archive = Archive.createWithDefaults();
const credentials = Credentials.fromPassword("masterpw");
const auth = require("./auth.js");
const ipc = require("electron").ipcMain;

const { app, BrowserWindow } = require("electron");

if (process.mas) app.setName("ImagineCraft");
app.allowRendererProcessReuse = true;

let mainWindow = null;

app.on("window-all-closed", function() {
  app.quit();
});

ipc.on("login", function(event, username, password) {
  auth.Authentication.login(username, password).then(client => {
    pushTokenToArchive(client.token);

    //TODO: Visually login user
  });
});

ipc.on("logout", function(event) {
  getTokenFromArchive().then(token => {
    auth.Authentication.logout(token).then(client => {
      if (client.code === 204) {
        deleteTokenFromArchive();

        //TODO: Visually logout user
      } else {
        //TODO: Handle logout error
      }
    });
  });
});

function handleLogin() {}

function handleLogout() {}

function getTokenFromArchive() {
  let fileDatasource = new FileDatasource("./mcuser.bcup");

  let token = fileDatasource
    .load(credentials)
    .then(Archive.createFromHistory)
    .then(archive => {
      return archive
        .findGroupsByTitle("Minecraft")[0]
        .getEntries()[0]
        .getProperty("clientToken");
    })
    .catch(function() {
      return null;
    });

  return token;
}

function pushTokenToArchive(token) {
  let fileDatasource = new FileDatasource("./mcuser.bcup");

  archive
    .createGroup("Minecraft")
    .createEntry("Player")
    .setProperty("clientToken", token);

  fileDatasource.save(archive.getHistory(), credentials);
}

function deleteTokenFromArchive() {
  let fileDatasource = new FileDatasource("./mcuser.bcup");

  fileDatasource
    .load(credentials)
    .then(Archive.createFromHistory)
    .then(archive => {
      archive
        .findGroupsByTitle("Minecraft")[0]
        .getEntries()[0]
        .deleteProperty("clientToken");

      fileDatasource.save(archive.getHistory(), credentials);
    });
}

function validateToken() {
  let result = getTokenFromArchive().then(token => {
    return auth.Authentication.validate(token).then(client => {
      if (client.code !== 204) {
        return auth.Authentication.refresh(token).then(client => {
          if (client.result) {
            pushTokenToArchive(client.token);
            return true;
          } else {
            deleteTokenFromArchive();
            return false;
          }
        });
      } else {
        return true;
      }
    });
  });

  return result;
}

//Listen for app to ready
app.on("ready", function() {
  mainWindow = new BrowserWindow({
    resizable: false,
    width: 1100,
    height: 600,
    transparent: false,
    frame: false,
    show: false,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
    },
  });

  mainWindow.webContents.session.clearCache();

  getTokenFromArchive().then(token => {
    if (token != null) {
      validateToken().then(result => {
        if (result) {
          //TODO: Visually login user
        }
      });
    }
  });

  //Load HTML into window
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "news.html"),
      protocol: "file",
      slashes: true,
    }),
  );

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
});

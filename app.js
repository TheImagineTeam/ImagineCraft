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
    if (client.result) {
      pushPlayerToArchive(client.token, client.uuid, client.name);
      handleLogin(true);
    } else {
      //TODO: Handle login error
    }
  });
});

ipc.on("logout", function(event) {
  getPlayerFromArchive().then(player => {
    auth.Authentication.logout(player.token).then(result => {
      if (result.code === 204) {
        deletePlayerFromArchive();
        handleLogout();
      } else {
        //TODO: Handle logout error
      }
    });
  });
});

function handleLogin(redirect) {
  //redirect to loggedin (if not handleLogin on start), fill user info in 3 places on loggedin and 2 places on every page
  //enable start button only if loggedin
  if (redirect) {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, "loggedin.html"),
        protocol: "file",
        slashes: true,
      }),
    );
  }
}

function handleLogout() {}

function getPlayerFromArchive() {
  let fileDatasource = new FileDatasource("./mcuser.bcup");

  return fileDatasource
    .load(credentials)
    .then(Archive.createFromHistory)
    .then(archive => {
      let entry = archive.findGroupsByTitle("Minecraft")[0].getEntries()[0];
      return new Player(
        entry.getProperty("clientToken"),
        entry.getProperty("uuid"),
        entry.getProperty("name"),
      );
    })
    .catch(function() {
      return null;
    });
}

function pushPlayerToArchive(token, uuid, name) {
  let fileDatasource = new FileDatasource("./mcuser.bcup");

  archive
    .createGroup("Minecraft")
    .createEntry("Player")
    .setProperty("clientToken", token)
    .setProperty("uuid", uuid)
    .setProperty("name", name);

  fileDatasource.save(archive.getHistory(), credentials);
}

function pushTokenToPlayerArchive(token) {
  let fileDatasource = new FileDatasource("./mcuser.bcup");

  fileDatasource
    .load(credentials)
    .then(Archive.createFromHistory)
    .then(archive => {
      archive
        .findGroupsByTitle("Minecraft")[0]
        .getEntries()[0]
        .setProperty("clientToken", token);

      fileDatasource.save(archive.getHistory(), credentials);
    });
}

function deletePlayerFromArchive() {
  let fileDatasource = new FileDatasource("./mcuser.bcup");

  fileDatasource
    .load(credentials)
    .then(Archive.createFromHistory)
    .then(archive => {
      archive
        .findGroupsByTitle("Minecraft")[0]
        .getEntries()
        .forEach(entry => entry.delete(true));

      fileDatasource.save(archive.getHistory(), credentials);
    });
}

function validateToken() {
  return getPlayerFromArchive().then(player => {
    return auth.Authentication.validate(player.token).then(client1 => {
      if (client1.code !== 204) {
        return auth.Authentication.refresh(player.token).then(client2 => {
          if (client2.result) {
            pushTokenToPlayerArchive(client2.token);
            return true;
          } else {
            deletePlayerFromArchive();
            return false;
          }
        });
      } else {
        return true;
      }
    });
  });
}

//Listen for app to ready
app.on("ready", function() {
  mainWindow = new BrowserWindow({
    resizable: false,
    width: 1100,
    height: 600,
    transparent: true,
    frame: false,
    show: false,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
    },
  });

  mainWindow.webContents.session.clearCache();

  getPlayerFromArchive().then(player => {
    if (player != null && player.token != null) {
      validateToken().then(result => {
        if (result) {
          handleLogin(false);
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

class Player {
  constructor(token, uuid, name) {
    this.token = token;
    this.uuid = uuid;
    this.name = name;
  }
}

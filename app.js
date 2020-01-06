const url = require("url");
const path = require("path");
const glob = require("glob");
const { Archive, Datasources, Credentials } = require("buttercup");
const { FileDatasource } = Datasources;
const archive = Archive.createWithDefaults();
const credentials = Credentials.fromPassword("masterpw");
const auth = require("./auth.js");
const launcher = require("./launcher.js");
const ipc = require("electron").ipcMain;
const { app, BrowserWindow } = require("electron");

//handle setupevents as quickly as possible
const setupEvents = require("./installers/setupEvents");
if (setupEvents.handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

if (process.mas) app.setName("ImagineCraft");
app.allowRendererProcessReuse = true;

let mainWindow = null;

app.on("window-all-closed", function() {
  app.quit();
});

ipc.on("login", function(event, username, password) {
  auth.Authentication.login(username, password).then(client => {
    if (client.result) {
      pushPlayerToArchive(
        client.token,
        client.uuid,
        client.name,
        client.clientToken,
        client.userProperties,
      ).then(() => {
        redirectLogin();
      });
    } else {
      console.log(client);
      //TODO: Handle login error
    }
  });
});

ipc.on("logout", function(event) {
  getPlayerFromArchive().then(player => {
    auth.Authentication.logout(player.token).then(result => {
      if (result.code === 204) {
        deletePlayerFromArchive().then(() => {
          redirectLogout();
        });
      } else {
        console.log(result);
        //TODO: Handle logout error
      }
    });
  });
});

ipc.on("getplayer", function(event) {
  getPlayerFromArchive().then(player => {
    event.returnValue = player;
  });
});

ipc.on("startmodded", function(event) {
  getPlayerFromArchive().then(player => {
    launcher.Launcher.launchModded(
      new LauncherAuth(
        player.token,
        player.uuid,
        player.name,
        player.clientToken,
        player.userProperties,
      ),
    );
  });
});

ipc.on("startvanilla", function(event) {
  getPlayerFromArchive().then(player => {
    launcher.Launcher.launchVanilla(
      new LauncherAuth(
        player.token,
        player.uuid,
        player.name,
        player.clientToken,
        player.userProperties,
      ),
    );
  });
});

function redirectLogin() {
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "loggedin.html"),
      protocol: "file",
      slashes: true,
    }),
  );
}

function redirectLogout() {
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "login.html"),
      protocol: "file",
      slashes: true,
    }),
  );
}

async function getPlayerFromArchive() {
  let fileDatasource = new FileDatasource("./mcuser.bcup");

  return fileDatasource
    .load(credentials)
    .then(Archive.createFromHistory)
    .then(archive => {
      let entry = archive.findGroupsByTitle("Minecraft")[0].getEntries()[0];
      return new Player(
        entry.getProperty("accessToken"),
        entry.getProperty("uuid"),
        entry.getProperty("name"),
        entry.getProperty("clientToken"),
        entry.getProperty("userProperties"),
      );
    })
    .catch(function() {
      return null;
    });
}

async function pushPlayerToArchive(
  token,
  uuid,
  name,
  clientToken,
  userProperties,
) {
  let fileDatasource = new FileDatasource("./mcuser.bcup");

  archive
    .createGroup("Minecraft")
    .createEntry("Player")
    .setProperty("accessToken", token)
    .setProperty("uuid", uuid)
    .setProperty("name", name)
    .setProperty("clientToken", clientToken)
    .setProperty("userProperties", userProperties);

  return fileDatasource.save(archive.getHistory(), credentials);
}

async function pushTokenToPlayerArchive(token) {
  let fileDatasource = new FileDatasource("./mcuser.bcup");

  return fileDatasource
    .load(credentials)
    .then(Archive.createFromHistory)
    .then(archive => {
      archive
        .findGroupsByTitle("Minecraft")[0]
        .getEntries()[0]
        .setProperty("accessToken", token);

      return fileDatasource.save(archive.getHistory(), credentials);
    });
}

async function deletePlayerFromArchive() {
  let fileDatasource = new FileDatasource("./mcuser.bcup");

  return fileDatasource
    .load(credentials)
    .then(Archive.createFromHistory)
    .then(archive => {
      archive
        .findGroupsByTitle("Minecraft")[0]
        .getEntries()
        .forEach(entry => entry.delete(true));

      return fileDatasource.save(archive.getHistory(), credentials);
    });
}

async function validateToken() {
  return getPlayerFromArchive().then(player => {
    return auth.Authentication.validate(player.token).then(client1 => {
      if (client1.code !== 204) {
        return auth.Authentication.refresh(player.token).then(client2 => {
          if (client2.result) {
            return pushTokenToPlayerArchive(client2.token).then(() => {
              return true;
            });
          } else {
            return deletePlayerFromArchive().then(() => {
              return false;
            });
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
        if (!result) {
          redirectLogout();
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
  constructor(token, uuid, name, clientToken, userProperties) {
    this.token = token;
    this.uuid = uuid;
    this.name = name;
    this.clientToken = clientToken;
    this.userProperties = userProperties;
  }
}
class LauncherAuth {
  constructor(token, uuid, name, clientToken, userProperties) {
    this.access_token = token;
    this.uuid = uuid;
    this.name = name;
    this.client_token = clientToken;
    this.user_properties = userProperties;
  }
}

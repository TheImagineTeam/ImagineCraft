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
let launcherInstance = null;

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

ipc.on("getplayer", async function(event) {
  let player = await getPlayerFromArchive();
  event.reply("getplayer-reply", player);
});

ipc.on("startmodded", async function(event) {
  let player = await getPlayerFromArchive();
  launcherInstance.launchModded(
    new LauncherAuth(
      player.token,
      player.uuid,
      player.name,
      player.clientToken,
      player.userProperties,
    ),
  );
});

ipc.on("startvanilla", async function(event) {
  let player = await getPlayerFromArchive();
  launcherInstance.launchVanilla(
    new LauncherAuth(
      player.token,
      player.uuid,
      player.name,
      player.clientToken,
      player.userProperties,
    ),
  );
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
  let player = await getPlayerFromArchive();
  let validation = await auth.Authentication.validate(player.token);

  if (validation.code !== 204) {
    let refresh = await auth.Authentication.refresh(player.token);

    if (refresh.result) {
      await pushTokenToPlayerArchive(refresh.token);
      return true;
    } else {
      await deletePlayerFromArchive();
      return false;
    }
  } else {
    return true;
  }
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
    fullscreen: false,
    maximizable: false,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
    },
  });

  launcherInstance = new launcher(mainWindow);

  //disables F11 fullscreen, but also disables development console
  //mainWindow.setMenu(null);
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

app.on("window-all-closed", function() {
  app.quit();
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

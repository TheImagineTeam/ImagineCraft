const { Client } = require("minecraft-launcher-core");
const { app } = require("electron");
const fs = require("fs");
const sys = require("os");
const child = require("child_process");
const fetch = require("node-fetch");
const Constants_1 = require("./constants");
const launcher = new Client();
const totalmem = Math.round(sys.totalmem() / 1073741824) - 1;

async function getOptsInformation(packname) {
  let res = await fetch.default(
    Constants_1.Endpoints.DOWNLOAD_SERVER + packname + ".json",
    new (class {
      constructor() {
        this.method = "GET";
      }
    })(),
  );

  let json = await res.json();

  return new OptsInformation(
    json["mc-version"],
    json["download-link"],
    json["mc-server-host"],
    json["mc-server-port"],
    json["ram-minimum"],
    json["modpack-version"],
  );
}

async function getOpts(packname, auth) {
  let opts = {
    clientPackage: null,
    authorization: auth,
    root: app.getPath("appData") + "\\imaginecraft\\" + packname,
    os: "windows",
    version: {
      number: null,
      type: "release",
    },
    memory: {
      max: (totalmem - 2) * 1024,
      min: null,
    },
    forge:
      app.getPath("appData") + "\\imaginecraft\\" + packname + "\\forge.jar",
    server: {
      host: null,
      port: null,
    },
  };

  let optsInformation = await getOptsInformation(packname);

  opts.version.number = optsInformation.mcVersion;
  opts.memory.min = optsInformation.ramMinimum;

  if (fs.existsSync(app.getPath("appData") + "\\imaginecraft\\meta.json")) {
    let versionFile = fs.readFileSync(
      app.getPath("appData") + "\\imaginecraft\\meta.json",
    );
    let versionJson = JSON.parse(versionFile);
    if (versionJson["version"] < optsInformation.modpackVersion) {
      opts.clientPackage = optsInformation.downloadLink;
    }
  } else {
    opts.clientPackage = optsInformation.downloadLink;
  }

  if (optsInformation.mcServerHost !== "") {
    opts.server.host = optsInformation.mcServerHost;

    if (optsInformation.mcServerPort !== "") {
      opts.server.port = optsInformation.mcServerPort;
    }
  } else {
    opts.server = undefined;
  }

  return opts;
}

async function checkPrerequisites() {
  if (totalmem < 4) {
    return false;
  }

  return new Promise(resolve => {
    child.exec("java -version", (error, stdout, stderr) => {
      if (error) {
        resolve(false);
      } else if (stderr.includes("64-Bit") && stderr.includes("1.8")) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

// We could suse electron global variables, or just use getAllWindows instead of getFocusedWindow, or use browser-window-blur->setWindow
// Actually, getFocusedWindow is only null when out of focus after closing the game
class Launcher {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
  }

  async launch(packname, auth) {
    let opts = await getOpts(packname, auth);
    let isPrerequisites = await checkPrerequisites();

    if (!fs.existsSync(app.getPath("appData") + "\\imaginecraft")) {
      fs.mkdirSync(app.getPath("appData") + "\\imaginecraft");
    }

    if (isPrerequisites) {
      let today = new Date();
      let date =
        today.getFullYear() +
        "-" +
        (today.getMonth() + 1) +
        "-" +
        today.getDate();
      let time =
        today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
      let dateTime = date + " " + time;
      launcher.removeAllListeners("debug");
      launcher.removeAllListeners("data");
      launcher.launch(opts);
      this.mainWindow.webContents.send(
        "play-update",
        false,
        "(0 %) Starting...",
      );
      launcher.on("debug", e => {
        if (e.includes("Extracting client package")) {
          this.mainWindow.webContents.send(
            "play-update",
            false,
            "(10 %) Downloading modpack...",
          );
        } else if (e.includes("Detected Forge in options")) {
          this.mainWindow.webContents.send(
            "play-update",
            false,
            "(50 %) Downloading forge...",
          );
        } else if (e.includes("Attempting to download assets")) {
          this.mainWindow.webContents.send(
            "play-update",
            false,
            "(80 %) Downloading assets...",
          );
        } else if (e.includes("Set launch options")) {
          this.mainWindow.webContents.send(
            "play-update",
            false,
            "(99 %) Finalizing...",
          );
        }

        console.log(e);
        fs.appendFile(
          app.getPath("appData") + "\\imaginecraft\\" + "debug_log.txt",
          dateTime + " " + e + "\n",
          function(err) {
            if (err) throw err;
          },
        );
      });
      launcher.on("data", e => {
        if (e.includes("Setting user")) {
          this.mainWindow.webContents.send("play-update", false, "Running");
        }

        console.log(e);
        fs.appendFile(
          app.getPath("appData") + "\\imaginecraft\\" + "debug_log.txt",
          date + " " + e + "\n",
          function(err) {
            if (err) throw err;
          },
        );
      });
      launcher.on("close", e => {
        this.mainWindow.webContents.send(
          "play-update",
          true,
          e == 0 ? "Play now" : "Crashed (Check logs and try again)",
        );
      });
    } else {
      this.mainWindow.webContents.send(
        "play-update",
        true,
        "Please install Java 8 64-Bit",
      );
    }
  }
}
class OptsInformation {
  constructor(
    mcVersion,
    downloadLink,
    mcServerHost,
    mcServerPort,
    ramMinimum,
    modpackVersion,
  ) {
    this.mcVersion = mcVersion;
    this.downloadLink = downloadLink;
    this.mcServerHost = mcServerHost;
    this.mcServerPort = mcServerPort;
    this.ramMinimum = ramMinimum;
    this.modpackVersion = modpackVersion;
  }
}
module.exports = Launcher;

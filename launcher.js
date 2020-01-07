Object.defineProperty(exports, "__esModule", { value: true });
const { Client, Authenticator } = require("minecraft-launcher-core");
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
  );
}

async function getOpts(packname, auth) {
  let opts = {
    clientPackage: null,
    authorization: auth,
    root: app.getPath("appData") + "\\.imaginecraft\\" + packname,
    os: "windows",
    version: {
      number: null,
      type: "release",
    },
    memory: {
      max: (totalmem - 2) * 1024,
      min: "1024",
    },
    forge:
      app.getPath("appData") + "\\.imaginecraft\\" + packname + "\\forge.jar",
    server: {
      host: null,
      port: null,
    },
  };

  let optsInformation = await getOptsInformation(packname);

  opts.version.number = optsInformation.mcVersion;
  opts.clientPackage = optsInformation.downloadLink;

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

class Launcher {
  static async launchVanilla(auth) {
    let opts = await getOpts("vanilla", auth);
    let isPrerequisites = await checkPrerequisites();

    if (!fs.existsSync(app.getPath("appData") + "\\.imaginecraft")) {
      fs.mkdirSync(app.getPath("appData") + "\\.imaginecraft");
    }

    if (isPrerequisites) {
      launcher.removeAllListeners("debug");
      launcher.removeAllListeners("data");
      launcher.launch(opts);
      launcher.on("debug", e => {
        console.log(e);
        fs.appendFile("debug_log.txt", e + "\n", function(err) {
          if (err) throw err;
        });
      });
      launcher.on("data", e => console.log(e));
    } else {
      //TODO: Handle java launch error
    }
  }

  static async launchModded(auth) {
    let opts = await getOpts("modded", auth);
    let isPrerequisites = await checkPrerequisites();

    if (!fs.existsSync(app.getPath("appData") + "\\.imaginecraft")) {
      fs.mkdirSync(app.getPath("appData") + "\\.imaginecraft");
    }

    if (isPrerequisites) {
      launcher.removeAllListeners("debug");
      launcher.removeAllListeners("data");
      launcher.launch(opts);
      launcher.on("debug", e => {
        console.log(e);
        fs.appendFile("debug_log.txt", e + "\n", function(err) {
          if (err) throw err;
        });
      });
      launcher.on("data", e => console.log(e));
    } else {
      //TODO: Handle java launch error
    }
  }
}
class OptsInformation {
  constructor(mcVersion, downloadLink, mcServerHost, mcServerPort) {
    this.mcVersion = mcVersion;
    this.downloadLink = downloadLink;
    this.mcServerHost = mcServerHost;
    this.mcServerPort = mcServerPort;
  }
}
exports.Launcher = Launcher;

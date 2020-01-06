Object.defineProperty(exports, "__esModule", { value: true });
const { Client, Authenticator } = require("minecraft-launcher-core");
const { app } = require("electron");
const fs = require("fs");
const sys = require("os");
const child = require("child_process");
const launcher = new Client();
const totalmem = Math.round(sys.totalmem() / 1073741824) - 1;

let optsVanilla = {
  clientPackage: null,
  authorization: null,
  root: app.getPath("appData") + "\\.imaginecraft\\vanilla",
  os: "windows",
  version: {
    number: "1.15.1",
    type: "release",
  },
  memory: {
    max: (totalmem - 2) * 1024,
    min: "1024",
  },
};

let optsModded = {
  clientPackage: "C:\\Users\\Jan\\Desktop\\mod.zip",
  authorization: null,
  root: app.getPath("appData") + "\\.imaginecraft\\modded",
  os: "windows",
  version: {
    number: "1.12.2",
    type: "release",
  },
  memory: {
    max: (totalmem - 2) * 1024,
    min: "1024",
  },
  forge: "./forge-1.12.2-14.23.5.2847-universal.jar",
};

function checkPrerequisites(modded) {
  if (totalmem < 4) {
    return false;
  }
  if (modded) {
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
  return true;
}

class Launcher {
  static launchVanilla(auth) {
    optsVanilla.authorization = auth;

    if (!fs.existsSync(app.getPath("appData") + "\\.imaginecraft")) {
      fs.mkdirSync(app.getPath("appData") + "\\.imaginecraft");
    }

    checkPrerequisites(false).then(result => {
      if (result) {
        launcher.launch(optsVanilla);
        launcher.on("debug", e => console.log(e));
        launcher.on("data", e => console.log(e));
      } else {
        //TODO: Handle java launch error
      }
    });
  }

  static launchModded(auth) {
    optsModded.authorization = auth;

    if (!fs.existsSync(app.getPath("appData") + "\\.imaginecraft")) {
      fs.mkdirSync(app.getPath("appData") + "\\.imaginecraft");
    }

    checkPrerequisites(true).then(result => {
      if (result) {
        launcher.launch(optsModded);
        launcher.on("debug", e => console.log(e));
        launcher.on("data", e => console.log(e));
      } else {
        //TODO: Handle java launch error
      }
    });
  }
}
exports.Launcher = Launcher;

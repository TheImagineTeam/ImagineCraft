Object.defineProperty(exports, "__esModule", { value: true });
const { Client, Authenticator } = require("minecraft-launcher-core");
const { app } = require("electron");
const fs = require("fs");
const launcher = new Client();

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
    max: "4096",
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
    max: "8192",
    min: "1024",
  },
  forge: "C:\\Users\\Jan\\Desktop\\forge-1.12.2-14.23.5.2847-universal.jar",
};

class Launcher {
  static launchVanilla(auth) {
    if (!fs.existsSync(app.getPath("appData") + "\\.imaginecraft")) {
      fs.mkdirSync(app.getPath("appData") + "\\.imaginecraft");
    }

    optsVanilla.authorization = auth;
    launcher.launch(optsVanilla);

    launcher.on("debug", e => console.log(e));
    launcher.on("data", e => console.log(e));
  }

  static launchModded(auth) {
    if (!fs.existsSync(app.getPath("appData") + "\\.imaginecraft")) {
      fs.mkdirSync(app.getPath("appData") + "\\.imaginecraft");
    }

    optsModded.authorization = auth;
    launcher.launch(optsModded);

    launcher.on("debug", e => console.log(e));
    launcher.on("data", e => console.log(e));
  }
}
exports.Launcher = Launcher;

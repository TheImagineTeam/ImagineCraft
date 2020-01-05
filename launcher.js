Object.defineProperty(exports, "__esModule", { value: true });
const { Client, Authenticator } = require("minecraft-launcher-core");
const launcher = new Client();

let optsVanilla = {
  clientPackage: null,
  authorization: null,
  root: "./test",
  os: "windows",
  version: {
    number: "latest",
    type: "release",
  },
  memory: {
    max: "4096",
    min: "1024",
  },
};

let optsModded = {
  clientPackage: "https://launcher.imagine.team/mod.zip",
  authorization: null,
  root: "%appdata%/.test",
  os: "windows",
  version: {
    number: "1.12.2",
    type: "release",
  },
  memory: {
    max: "16144",
    min: "1024",
  },
  forge: {
    path: "C:\\Users\\Jan\\Desktop\\forge-1.12.2-14.23.5.2847-universal.jar",
  },
};

class Launcher {
  static launchVanilla(auth) {
    optsVanilla.authorization = auth;
    launcher.launch(optsVanilla);

    launcher.on("debug", e => console.log(e));
    launcher.on("data", e => console.log(e));
  }

  static launchModded(auth) {
    optsModded.authorization = auth;
    launcher.launch(optsModded);

    launcher.on("debug", e => console.log(e));
    launcher.on("data", e => console.log(e));
  }
}
exports.Launcher = Launcher;

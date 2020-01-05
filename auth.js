Object.defineProperty(exports, "__esModule", { value: true });
const sys = require("os");
const mz_1 = require("mz");
const fetch = require("node-fetch");
const Constants_1 = require("./constants");
function getUniqueIdentifier() {
  let data =
    sys.arch() +
    sys.cpus() +
    sys.type() +
    sys.homedir() +
    sys.endianness() +
    sys.tmpdir();
  let hash = mz_1.crypto.createHash("sha512");
  hash.update(data, "utf8");
  return hash.digest().toString("hex");
}
class Authentication {
  static offline(username) {
    return {
      token: "null",
      name: username,
      errorMessage: "",
      result: false,
      uuid: "00000000-0000-0000-0000-000000000000",
      errorCause: "",
      errorType: "",
    };
  }
  static login(username, password) {
    return this.authenticate(new LoginStrategy(username, password));
  }
  static refresh(token) {
    return this.authenticate(new RefreshStrategy(token));
  }
  static logout(token) {
    return this.authenticate(new LogoutStrategy(token));
  }
  static validate(token) {
    return this.authenticate(new ValidateStrategy(token));
  }
  static async authenticate(strategy) {
    let res = await fetch.default(
      strategy.endpoint,
      new (class {
        constructor() {
          this.method = "POST";
          this.body = JSON.stringify(strategy.generatePayload());
          this.headers = Authentication.generateHeaders();
        }
      })(),
    );

    let result;

    if (
      strategy.type === AuthenticationType.Login ||
      strategy.type === AuthenticationType.Refresh
    ) {
      let json = await res.json();
      if (json.hasOwnProperty("error"))
        result = new ErrorAuthenticationResult(
          json["cause"] || "",
          json["errorMessage"],
          json["error"],
        );
      else if (!json.hasOwnProperty("selectedProfile"))
        result = new ErrorAuthenticationResult(
          "",
          "Your Mojang profile has no attached Minecraft profile!",
          "Not Found",
        );
      else
        result = new ValidAuthenticationResult(
          //clientToken, selectedProfile, userProperties
          json["accessToken"],
          json["selectedProfile"]["id"],
          json["selectedProfile"]["name"],
          getUniqueIdentifier(),
          json["user"]["properties"] || {},
        );
    } else {
      result = new GeneralAuthenticationResult(res.status);
    }
    return result;
  }
  static generateHeaders() {
    let headers = new fetch.Headers();
    headers.append("Content-Type", "application/json");
    return headers;
  }
}
exports.Authentication = Authentication;
var AuthenticationType;
(function(AuthenticationType) {
  AuthenticationType[(AuthenticationType["Login"] = 0)] = "Login";
  AuthenticationType[(AuthenticationType["Refresh"] = 1)] = "Refresh";
  AuthenticationType[(AuthenticationType["Logout"] = 2)] = "Logout";
  AuthenticationType[(AuthenticationType["Validate"] = 3)] = "Validate";
})(AuthenticationType || (AuthenticationType = {}));
class LoginStrategy {
  constructor(username, password) {
    this.endpoint =
      Constants_1.Endpoints.MINECRAFT_AUTH_SERVER + "authenticate";
    this.type = AuthenticationType.Login;
    this.username = username;
    this.password = password;
  }
  generatePayload() {
    return {
      agent: {
        name: "Minecraft",
        version: 1,
      },
      username: this.username,
      password: this.password,
      clientToken: getUniqueIdentifier(),
      requestUser: true,
    };
  }
}
class RefreshStrategy {
  constructor(token) {
    this.endpoint = Constants_1.Endpoints.MINECRAFT_AUTH_SERVER + "refresh";
    this.type = AuthenticationType.Refresh;
    this.token = token;
  }
  generatePayload() {
    return {
      accessToken: this.token,
      clientToken: getUniqueIdentifier(),
      //sending "selectedProfile" will result in an error
      requestUser: true,
    };
  }
}
class LogoutStrategy {
  constructor(token) {
    this.endpoint = Constants_1.Endpoints.MINECRAFT_AUTH_SERVER + "invalidate";
    this.type = AuthenticationType.Logout;
    this.token = token;
  }
  generatePayload() {
    return {
      accessToken: this.token,
      clientToken: getUniqueIdentifier(),
    };
  }
}
class ValidateStrategy {
  constructor(token) {
    this.endpoint = Constants_1.Endpoints.MINECRAFT_AUTH_SERVER + "validate";
    this.type = AuthenticationType.Validate;
    this.token = token;
  }
  generatePayload() {
    return {
      accessToken: this.token,
      clientToken: getUniqueIdentifier(),
    };
  }
}
class ValidAuthenticationResult {
  constructor(token, uuid, name, clientToken, userProperties) {
    this.token = token;
    this.uuid = uuid;
    this.name = name;
    this.clientToken = clientToken;
    this.userProperties = userProperties;
    this.errorCause = "";
    this.errorMessage = "";
    this.errorType = "";
    this.result = true;
  }
}
class ErrorAuthenticationResult {
  constructor(errorCause, errorMessage, errorType) {
    this.errorCause = errorCause;
    this.errorMessage = errorMessage;
    this.errorType = errorType;
    this.result = false;
    this.token = "";
    this.uuid = "";
    this.name = "";
    this.clientToken = "";
    this.userProperties = {};
  }
}
class GeneralAuthenticationResult {
  constructor(code) {
    this.code = code;
  }
}

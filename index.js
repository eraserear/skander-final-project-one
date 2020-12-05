// server.js
// where your node app starts

// we've started you off with Express (https://expressjs.com/)
// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
const express = require("express");
const app = express();

const bodyParser = require("body-parser");
app.use(bodyParser.raw({ type: "*/*" }));

app.get("/sourcecode", (req, res) => {
  res.send(
    require("fs")
      .readFileSync(__filename)
      .toString()
  );
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});


//Users
let users = new Map();

//Sessions
let sessions = new Map();

function isValidToken(token) {
  if (sessions.has(token)) {
    return sessions.get(token);
  }
  return false;
}

function getToken() {
  let token = "";
  let chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 6; i++)
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

function setSession(username) {
  let token = getToken();
  sessions.set(token, username);
  return token;
}

//Chat Channels
let channels = new Map();

function createChannel(channelName, username) {
  channels.set(channelName, {
    creator: username,
    users: [],
    banned: [],
    messages: []
  });
}

function deleteChannel(channelName) {
  channels.delete(channelName);
}

function addUserChannel(channelName, username) {
  channels.get(channelName)["users"].push(username);
}

function removeUserChannel(channelName, username) {
  let usrs = channels.get(channelName)["users"];
  usrs.splice(usrs.indexOf(username), 1);
}

function banUserChannel(channelName, username) {
  let usrs = channels.get(channelName)["users"];
  usrs.splice(usrs.indexOf(username), 1);
  let bnds = channels.get(channelName)["banned"].push(username);
}

function postMessage(channelName, username, message) {
  channels
    .get(channelName)
    ["messages"].push({ from: username, contents: message });
}

//create an account
app.post("/signup", (req, res) => {
  let parsed = JSON.parse(req.body);
  if (!parsed.password) {
    res.send({ success: false, reason: "password field missing" });
    return;
  }
  if (!parsed.username) {
    res.send({ success: false, reason: "username field missing" });
    return;
  }
  if (users.has(parsed.username)) {
    res.send({ success: false, reason: "Username exists" });
    return
  }
  users.set(parsed.username, parsed.password);
  res.send({ success: true });
});

//login
app.post("/login", (req, res) => {
  let parsed = JSON.parse(req.body);
  let usr = parsed.username;
  if (!parsed.password) {
    res.send({ success: false, reason: "password field missing" });
    return
  }
  if (!parsed.username) {
    res.send({ success: false, reason: "username field missing" });
    return
  }
  if (!users.has(usr)) {
    res.send({ success: false, reason: "User does not exist" });
    return
  }

  let typedPsw = parsed.password;
  let expectedPsw = users.get(usr);
  if (typedPsw !== expectedPsw) {
    res.send({ success: false, reason: "Invalid password" });
    return
  }
  let token = setSession(usr);
  res.send({ success: true, token: token });
});

//Create channel
app.post("/create-channel", (req, res) => {
  let parsed = JSON.parse(req.body);
  let token = req.get("token");
  if (!token) {
    res.send({ success: false, reason: "token field missing" });
    return
  }
  if (!parsed.channelName) {
    res.send({ success: false, reason: "channelName field missing" });
    return
  }

  let username = isValidToken(token);
  if (!username) {
    res.send({ success: false, reason: "Invalid token" });
    return
  }
  if (channels.has(parsed.channelName)) {
    res.send({ success: false, reason: "Channel already exists" });
    return
  }
  createChannel(parsed.channelName, username);
  res.send({ success: true });
});

//Join the channel
app.post("/join-channel", (req, res) => {
  let parsed = JSON.parse(req.body);

  if (!req.get("token")) {
    res.send({ success: false, reason: "token field missing" });
    return
  }
  if (!parsed.channelName) {
    res.send({ success: false, reason: "channelName field missing" });
    return
  }

  let currentToken = req.get("token");
  let username = isValidToken(currentToken);
  if (!username) {
    res.send({ success: false, reason: "Invalid token" });
    return
  }

  let chatName = parsed.channelName;
  if (!channels.has(chatName)) {
    res.send({ success: false, reason: "Channel does not exist" });
    return
  }
  if (channels.get(chatName)["users"].includes(username)) {
    res.send({ success: false, reason: "User has already joined" });
    return
  }
  if (channels.get(chatName)["banned"].includes(username)) {
    res.send({ success: false, reason: "User is banned" });
    return
  }
  addUserChannel(chatName, username);
  res.send({ success: true });
});

//Leave the channel
app.post("/leave-channel", (req, res) => {
  let parsed = JSON.parse(req.body);

  if (!req.get("token")) {
    res.send({ success: false, reason: "token field missing" });
    return
  }
  if (!parsed.channelName) {
    res.send({ success: false, reason: "channelName field missing" });
    return
  }
  if (!channels.has(parsed.channelName)) {
    res.send({ success: false, reason: "Channel does not exist" });
    return
  }

  let usrs = channels.get(parsed.channelName)["users"];
  let currentToken = req.get("token");
  let username = isValidToken(currentToken);
  if (!username) {
    res.send({ success: false, reason: "Invalid token" });
    return
  }
  if (!usrs.includes(username)) {
    res.send({ success: false, reason: "User is not part of this channel" });
    return
  }
  removeUserChannel(parsed.channelName, username);
  res.send({ success: true });
});

//Get users from Channel
app.get("/joined", (req, res) => {
  if (!req.get("token")) {
    res.send({ success: false, reason: "token field missing" });
    return
  }
  if (!channels.has(req.query.channelName)) {
    res.send({ success: false, reason: "Channel does not exist" });
    return
  }

  let usr = isValidToken(req.get("token"));
  if (!usr) {
    res.send({ success: false, reason: "Invalid token" });
    return
  }

  let usrs = channels.get(req.query.channelName)["users"];
  if (!usrs.includes(usr)) {
    res.send({ success: false, reason: "User is not part of this channel" });
    return
  }
  res.send({ success: true, joined: usrs });
});

//Delete channel
app.post("/delete", (req, res) => {
  let parsed = JSON.parse(req.body);

  if (!req.get("token")) {
    res.send({ success: false, reason: "token field missing" });
    return
  }
  if (!parsed.channelName) {
    res.send({ success: false, reason: "channelName field missing" });
    return
  }

  let usr = isValidToken(req.get("token"));

  if (!usr) {
    res.send({ success: false, reason: "Invalid token" });
    return
  }
  if (!channels.has(parsed.channelName)) {
    res.send({ success: false, reason: "Channel does not exist" });
    return
  }
  deleteChannel(parsed.channelName);
  res.send({ success: true });
});

//Kick User from Channel
app.post("/kick", (req, res) => {
  let parsed = JSON.parse(req.body);

  if (!req.get("token")) {
    res.send({ success: false, reason: "token field missing" });
    return
  }
  if (!parsed.channelName) {
    res.send({ success: false, reason: "channelName field missing" });
    return
  }
  if (!parsed.target) {
    res.send({ success: false, reason: "target field missing" });
    return
  }

  let usr = isValidToken(req.get("token"));
  if (!usr) {
    res.send({ success: false, reason: "Invalid token" });
    return
  }

  let creator = channels.get(parsed.channelName)["creator"];
  if (usr !== creator) {
    res.send({ success: false, reason: "Channel not owned by user" });
    return
  }
  removeUserChannel(parsed.channelName, parsed.target);
  res.send({ success: true });
});

//Ban User from Channel
app.post("/ban", (req, res) => {
  let parsed = JSON.parse(req.body);
  if (!req.get("token")) {
    res.send({ success: false, reason: "token field missing" });
    return
  }
  if (!parsed.channelName) {
    res.send({ success: false, reason: "channelName field missing" });
    return
  }
  if (!parsed.target) {
    res.send({ success: false, reason: "target field missing" });
    return
  }

  let usr = isValidToken(req.get("token"));
  if (!usr) {
    res.send({ success: false, reason: "Invalid token" });
    return
  }

  let creator = channels.get(parsed.channelName)["creator"];
  if (usr !== creator) {
    res.send({ success: false, reason: "Channel not owned by user" });
    return
  }
  banUserChannel(parsed.channelName, parsed.target);
  res.send({ success: true });
});

//Post a message
app.post("/message", (req, res) => {
  let parsed = JSON.parse(req.body);

  if (!req.get("token")) {
    res.send({ success: false, reason: "token field missing" });
    return
  }
  if (!parsed.channelName) {
    res.send({ success: false, reason: "channelName field missing" });
    return
  }
  if (!parsed.contents) {
    res.send({ success: false, reason: "contents field missing" });
    return
  }

  let usr = isValidToken(req.get("token"));
  if (!usr) {
    res.send({ success: false, reason: "Invalid token" });
    return
  }
  
  if (!channels.get(parsed.channelName) || !channels.get(parsed.channelName)["users"].includes(usr)) {
    res.send({ success: false, reason: "User is not part of this channel" });
    return
  }
  postMessage(parsed.channelName, usr, parsed.contents);
  res.send({ success: true });
});

//See messages
app.get("/messages", (req, res) => {
  if (!req.get("token")) {
    res.send({ success: false, reason: "token field missing" });
    return
  }
  
   if (!req.query.channelName) {
    res.send({ success: false, reason: "channelName field missing" });
    return
  }
        
  if (!channels.has(req.query.channelName)) {
    res.send({ success: false, reason: "Channel does not exist" });
    return
  }

  let usr = isValidToken(req.get("token"));
  if (!usr) {
    res.send({ success: false, reason: "Invalid token" });
    return
  }
  let usrs = channels.get(req.query.channelName)["users"];
  if (!usrs.includes(usr)) {
    res.send({ success: false, reason: "User is not part of this channel" });
    return
  }
  let messages = channels.get(req.query.channelName)["messages"];
  res.send({ success: true, messages });
});

app.listen(process.env.PORT || 3000);

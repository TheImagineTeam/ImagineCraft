const electron = require('electron');
const url = require('url');
const path = require('path');

const {app, BrowserWindow} = electron;

let mainWindow;

//Listen for app to ready
app.on('ready', function(){
    mainWindow = new BrowserWindow({});
    //Load HTML into window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'news.html'),
        protocol: 'file',
        slashes: true
    }));
});
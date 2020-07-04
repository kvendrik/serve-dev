#!/usr/bin/env node

const currentDirectoryPath = process.cwd();
process.chdir(currentDirectoryPath);

import Koa from 'koa';
import {join, relative, resolve} from 'path';
import Router from 'koa-router';
import koaSend from 'koa-send';
import watch from 'node-watch';
import websockify from 'koa-websocket';
import chalk from 'chalk';
import {readFileSync, existsSync} from 'fs';
import opn from 'opn';

interface Action {
  test(filePath: string): void;
  action(): void;
}

interface Settings {
  root: string;
  port: number;
  actions?: Action[];
  onStart?(): void;
  liveReload?: boolean;
  watchFiles?: boolean;
  openPageOnStart?: boolean;
  watchTest?(path: string): boolean;
}

const settingsPath = join(currentDirectoryPath, '.dev-serve.js');

let Settings: Settings = {
  root: resolve('static'),
  port: 8080,
  onStart: undefined,
  actions: [],
  liveReload: true,
  watchFiles: true,
  openPageOnStart: true,
  watchTest: (path: string) => !path.includes('/wasm/'),
};

if (existsSync(settingsPath)) {
  const userSettings = require(settingsPath);
  Settings = {...Settings, ...userSettings};
}

const port = process.env.PORT || Settings.port;
const app = websockify(new Koa());
const router = new Router();
const getUniqueSocketId = createUniqueIdFactory('socket');
let currentWebsockets = [];

router.get('/(.*)', handleHttpRequest);

app
  .use(router.routes())
  .use(router.allowedMethods());

if (Settings.liveReload) {
  app.ws.use(handleNewWsConnection);
}

if (Settings.onStart) {
  Settings.onStart();
}

if (Settings.watchFiles) {
  logInfo('Setting up file watcher...');
  watch(
    [Settings.root, ...Settings.actions?.map(({filePath}) => filePath)],
    {
      recursive: true,
      filter: Settings.watchTest,
    },
    handleFileChange
  );
}

if(Settings.openPageOnStart) opn(`http://localhost:${port}`);

app.listen(port);
logSuccess(`Serving ${Settings.root} on *:${port}`);

function handleFileChange(_, filePath) {
  const infoMessage = `${filePath} changed. Running actions...`;
  logInfo(infoMessage);

  for (const {socket} of currentWebsockets) {
    socket.send(
      JSON.stringify({action: 'log', data: infoMessage})
    );
  }

  for (const [path, action] of Object.entries(Settings.actions)) {
    if (filePath.includes(path)) {
      action(chalk);
    }
  }

  for (const {socket} of currentWebsockets) {
    socket.send(
      JSON.stringify({action: 'doReload', data: null})
    );
  }
}

function handleNewWsConnection(ctx, next) {
  logInfo('Client connected');

  const socket = ctx.websocket;
  const socketId = getUniqueSocketId();

  currentWebsockets.push({id: socketId, socket});

  socket.on('close', () => {
    logInfo(`Closing socket ${socketId}`);
    currentWebsockets = currentWebsockets.filter(({id}) => id !== socketId);
  });

  return next(ctx);
}

async function handleHttpRequest(ctx, next) {
  const path = ctx.path;

  if (path === '/') {
    const indexPath = join(Settings.root, 'index.html');
    respondWithHtml(indexPath, Settings.liveReload);
    return next(ctx);
  }

  const requestingHtml = path.includes('.html');
  const requestedFilePath = join(Settings.root, path);

  if (requestingHtml) {
    respondWithHtml(requestedFilePath, Settings.liveReload);
    return next(ctx);
  }

  await koaSend(ctx, relative(currentDirectoryPath, requestedFilePath));
  return next(ctx);

  function respondWithHtml(filePath, insertLiveReloadScript) {
    const html = readFileSync(filePath, 'utf-8');
    const finalHtml = insertLiveReloadScript ? insertLiveReloadScriptIntoHtml(html) : html;
    ctx.type = 'html';
    ctx.body = finalHtml;
  }
}

function insertLiveReloadScriptIntoHtml(html) {
  return html.replace('</body>', `<script>
const webSocket = new WebSocket('ws://localhost:${port}');
webSocket.addEventListener('message', ({data}) => {
  const {action, data: actionData} = JSON.parse(data);
  if (action === 'doReload') location.reload();
  if (action === 'log') console.log(actionData);
});</script></body>`);
}

function logSuccess(message) {
  console.log(chalk.green(message));
}

function logInfo(message) {
  console.info(chalk.blue(message));
}

function createUniqueIdFactory(prefix) {
  let index = 0;
  return () => `${prefix}-${index++}`;
}

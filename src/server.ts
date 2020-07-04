import Koa, {Context as KoaContext, Next as KoaNext} from 'koa';
import {join, relative, resolve} from 'path';
import Router from 'koa-router';
import koaSend from 'koa-send';
import {default as nodeWatch} from 'node-watch';
import websockify from 'koa-websocket';
import * as ws from 'ws';
import chalk from 'chalk';
import {readFileSync, existsSync} from 'fs';
import opn from 'opn';

interface OnChangeResult {
  refreshPage: boolean;
};

interface Settings {
  root: string;
  port: number;
  watch?: {
    paths: string[];
    onChange(filePath: string): OnChangeResult;
  };
  onStart?(): void;
  openPageOnStart?: boolean;
}

export class DevServer {
  private getUniqueSocketId = createUniqueIdFactory('socket');
  private currentWebsockets: {
   id: string;
   socket: ws;
  }[] = [];

  constructor(private settings: Settings){}

  start() {
    const {
      root,
      port,
      watch,
      onStart,
      openPageOnStart
    } = this.settings;

    const app = websockify(new Koa());
    const router = new Router();

    router.get('/(.*)', this.handleHttpRequest);

    app
      .use(router.routes())
      .use(router.allowedMethods());

    app.ws.use(this.handleNewWsConnection);

    if (onStart) onStart();

    if (watch) {
      logInfo('Setting up file watcher...');
      nodeWatch(
        watch.paths,
        {
          recursive: true,
        },
        this.handleFileChange
      );
    }

    if(openPageOnStart) opn(`http://localhost:${port}`);

    app.listen(port);
    logSuccess(`Serving ${root} on *:${port}`);
  }

  private async handleFileChange(_: string, filePath: string) {
    const {watch} = this.settings;

    const infoMessage = `${filePath} changed. Running actions...`;
    logInfo(infoMessage);

    for (const {socket} of this.currentWebsockets) {
      socket.send(
        JSON.stringify({action: 'log', data: infoMessage})
      );
    }

    if (!watch) {
      return;
    }

    const {refreshPage} = await watch.onChange(filePath);

    if (!refreshPage) {
      return;
    }

    for (const {socket} of this.currentWebsockets) {
      socket.send(
        JSON.stringify({action: 'doReload', data: null})
      );
    }
  }

  private handleNewWsConnection(ctx: KoaContext, next: KoaNext) {
    logInfo('Client connected');

    const socket = ctx.websocket;
    const socketId = this.getUniqueSocketId();

    this.currentWebsockets.push({id: socketId, socket});

    socket.on('close', () => {
      logInfo(`Closing socket ${socketId}`);
      this.currentWebsockets = this.currentWebsockets.filter(({id}) => id !== socketId);
    });

    return next();
  }

  private async handleHttpRequest(ctx: KoaContext, next: KoaNext) {
    const path = ctx.path;
    const {root, port} = this.settings;

    if (path === '/') {
      const indexPath = join(root, 'index.html');
      respondWithHtml(indexPath);
      return next();
    }

    const requestingHtml = path.includes('.html');
    const requestedFilePath = join(root, path);

    if (requestingHtml) {
      respondWithHtml(requestedFilePath);
      return next();
    }

    await koaSend(ctx, relative(process.cwd(), requestedFilePath));
    return next();

    function respondWithHtml(filePath: string) {
      const html = readFileSync(filePath, 'utf-8');
      const finalHtml = html.replace('</body>', `<script>
const webSocket = new WebSocket('ws://localhost:${port}');
webSocket.addEventListener('message', ({data}) => {
  const {action, data: actionData} = JSON.parse(data);
  if (action === 'doReload') location.reload();
  if (action === 'log') console.log(actionData);
});</script></body>`);
      ctx.type = 'html';
      ctx.body = finalHtml;
    };
  }
}

function logSuccess(message: string) {
  console.log(chalk.green(message));
}

function logInfo(message: string) {
  console.info(chalk.blue(message));
}

function createUniqueIdFactory(prefix: string) {
  let index = 0;
  return () => `${prefix}-${index++}`;
}

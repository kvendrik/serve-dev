import Koa, {Context as KoaContext, Next as KoaNext} from 'koa';
import {join, relative, resolve} from 'path';
import Router from 'koa-router';
import koaSend from 'koa-send';
import {default as nodeWatch} from 'node-watch';
import websockify from 'koa-websocket';
import * as ws from 'ws';
import chalk from 'chalk';
import {readFileSync, lstatSync, existsSync} from 'fs';
import open from 'open';

interface OnChangeResult {
  replaceModule?: string;
  refreshPage?: boolean;
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

export default class DevServer {
  private uniqueServerKey = Math.random().toString(36).substring(2, 18);
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
    const router = new Router<any, KoaContext>();

    router.get('/(.*)', this.handleHttpRequest.bind(this));
    router.get('/dev/:assetName', this.handleDevAssetRequest.bind(this));

    app
      .use(router.routes())
      .use(router.allowedMethods());

    app.ws.use(this.handleNewWsConnection.bind(this));

    if (onStart) onStart();

    if (watch) {
      logInfo('Setting up file watcher...');
      nodeWatch(
        watch.paths,
        {
          recursive: true,
        },
        this.handleFileChange.bind(this)
      );
    }

    if(openPageOnStart) open(`http://localhost:${port}`);

    app.listen(port);
    logSuccess(`Serving ${root} on *:${port}`);
  }

  private async handleFileChange(_: string, filePath: string) {
    const {root, watch} = this.settings;

    const infoMessage = `${filePath} changed.`;
    logInfo(infoMessage);

    for (const {socket} of this.currentWebsockets) {
      socket.send(
        JSON.stringify({
          action: 'log',
          data: {
            message: infoMessage,
          },
        })
      );
    }

    if (!watch) {
      return;
    }

    const {replaceModule, refreshPage} = await watch.onChange(filePath);

    if (!replaceModule && !refreshPage) {
      return;
    }

    for (const {socket} of this.currentWebsockets) {
      socket.send(
        JSON.stringify({
          action: 'fileChange',
          data: {
            replaceModule,
            refreshPage,
          },
        })
      );
    }
  }

  private handleNewWsConnection(ctx: KoaContext, next: KoaNext) {
    const socket = ctx.websocket;
    const socketId = this.getUniqueSocketId();

    logInfo(`Client connected. Socket ID ${socketId}`);

    this.currentWebsockets.push({id: socketId, socket});

    socket.on('close', () => {
      logInfo(`Closing client connection. Socket ID ${socketId}`);
      this.currentWebsockets = this.currentWebsockets.filter(({id}) => id !== socketId);
    });

    return next();
  }

  private async handleDevAssetRequest(ctx: KoaContext, next: KoaNext) {
    const assetName = ctx.params.assetName;
    const clientJsPath = resolve(import.meta.url.replace('file://', ''), '../../client-js');
    await koaSend(ctx, assetName, {root: clientJsPath});
    ctx.status = 200;
    return next();
  }

  private async handleHttpRequest(ctx: KoaContext, next: KoaNext) {
    const path = ctx.path;
    const {root} = this.settings;
    const requestedFilePath = join(root, path);

    logInfo(`GET ${path}. File path ${requestedFilePath}`);

    if (!existsSync(requestedFilePath)) {
      ctx.status = 400;
      ctx.body = 'Not found';
      return next();
    }

    const stat = lstatSync(requestedFilePath);

    if (stat.isDirectory()) {
      const indexPath = join(requestedFilePath, 'index.html');
      this.respondWithHtml(ctx, indexPath);
      return next();
    }

    const requestingHtml = path.includes('.html');

    if (requestingHtml) {
      this.respondWithHtml(ctx, requestedFilePath);
      return next();
    }

    await koaSend(ctx, relative(process.cwd(), requestedFilePath));
    return next();
  }

  private respondWithHtml(ctx: KoaContext, filePath: string) {
    const {port} = this.settings;
    const html = readFileSync(filePath, 'utf-8');
    const finalHtml = html
      .replace('<head>', `<head><script src="/dev/hmr.js?${this.uniqueServerKey}"></script>`)
      .replace('</body>', `<script src="/dev/receiver.js?${this.uniqueServerKey}" data-ws-port="${port}"></script></body>`);
    ctx.type = 'html';
    ctx.body = finalHtml;
  };
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

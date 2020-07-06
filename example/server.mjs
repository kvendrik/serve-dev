import DevServer from 'serve-dev';
import {readFileSync, writeFileSync} from 'fs';

const server = new DevServer({
  root: 'public',
  port: 9000,
  watch: {
    paths: ['src', 'public/index.html'],
    onChange(filePath) {
      if (filePath.includes('.js')) {
        buildJs();
        return {replaceModule: 'app.js'};
      } else {
        buildCss();
        return {replaceModule: 'app.css'};
      }
    }
  },
  onStart() {
    console.log('Building source...');
    buildJs();
    buildCss();
  },
  openPageOnStart: true,
});

server.start();

function buildCss() {
  const src = `/* Generated file */\n${readFileSync('src/app.css', 'utf-8')}`;
  writeFileSync('public/app.css', src);
}

function buildJs() {
  const src = `// Generated file\n${readFileSync('src/app.js', 'utf-8')}`;
  writeFileSync('public/app.js', src);
}

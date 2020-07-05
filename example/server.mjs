import DevServer from 'serve-dev';
import {readFileSync, writeFileSync} from 'fs';

const server = new DevServer({
  root: 'public',
  port: 9000,
  watch: {
    paths: ['src'],
    onChange(filePath) {
      if (filePath.includes('.js')) {
        buildJs();
      } else {
        buildHtml();
      }
      return {shouldReloadPage: true};
    }
  },
  onStart() {
    console.log('Building source...');
    buildHtml();
    buildJs();
  },
  openPageOnStart: true,
});

server.start();

function buildHtml() {
  const src = `<!-- Generated file -->\n${readFileSync('src/index.html', 'utf-8')}`;
  writeFileSync('public/index.html', src);
}

function buildJs() {
  const src = `// Generated file\n${readFileSync('src/app.js', 'utf-8')}`;
  writeFileSync('public/app.js', src);
}

import DevServer from '../src';
import {join} from 'path';
import {readFileSync, writeFileSync} from 'fs';

const publicPath = join(process.cwd(), 'example', 'public');
const srcPath = join(process.cwd(), 'example', 'src');

const server = new DevServer({
  root: publicPath,
  port: 9000,
  watch: {
    paths: [srcPath],
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
  openPageOnStart: false,
})

server.start();

function buildHtml() {
  const src = `<!-- Generated file -->\n${readFileSync(join(srcPath, 'index.html'), 'utf-8')}`;
  writeFileSync(join(publicPath, 'index.html'), src);
}

function buildJs() {
  const src = `// Generated file\n${readFileSync(join(srcPath, 'app.js'), 'utf-8')}`;
  writeFileSync(join(publicPath, 'app.js'), src);
}

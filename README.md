# serve-dev

🏗️ A very simple but highly customizable server for local web development

- 👀 Watch source files
- 🔁 Live reload when changes occur
- 🏃‍♂️ Quick to set up
- 💪 Unopinionated about how source files get compiled

## Setup

```bash
yarn add --dev serve-dev
```

```tsx
// server.mjs - Simple example that serves and watches a folder at path ./public
// node server.mjs (Node v13+)

import DevServer from 'serve-dev';

new DevServer({
  root: 'public',
  port: 9000,
  watch: {
    paths: ['public'],
    onChange(filePath) {
      console.log(`${filePath} changed.`);
      return {shouldReloadPage: true};
    }
  },
}).start()
```

Check out [`example/server.mjs`](https://github.com/kvendrik/serve-dev/blob/master/example/server.mjs) for a more advanced example.

## Contribute

Make your changes and run `yarn example` to test them using the example setup.

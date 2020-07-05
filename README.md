# serve-dev

🏗️ A very simple but highly customizable server for local web development

- 👀 Watch source files
- 🔁 Live reload when changes occur
- 🏃‍♂️ Quick to set up
- 💪 Unopinionated about how source files get compiled

```bash
yarn add --dev serve-dev
```

```tsx
// server.mjs
// node server.mjs (Node v13+)

import DevServer from 'serve-dev';

new DevServer({
  root: 'public',
  port: 9000,
  watch: {
    paths: ['src'],
    onChange: (filePath) => console.log(`${filePath} changed.`),
  },
}).start()
```

Check out [`example/server.mjs`](https://github.com/kvendrik/serve-dev/blob/master/example/server.mjs) for a more advanced example.

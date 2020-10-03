# serve-dev

🏗️ A very simple but highly customizable server for local web development

- 👀 Watch source files
- 🔁 Live reload when changes occur
- 🏃‍♂️ Quick to set up
- 💪 Unopinionated about how source files get compiled

## Setup

Note: **requires Node >=13 to run properly**

### Global Install

The fastest way to get going is to simply run `npx serve-dev` in your project's
directory to immediately start serving it.

Alternatively you can install it globally with Yarn if you prefer:

```bash
yarn global add serve-dev
```

And then you can run `serve-dev` anywhere you want to serve, or you can specify
a folder you wish to search, such as `serve-dev public`.

For full help and usage examples, run `serve-dev --help`.

### Local Install

Alternatively, you can install serve-dev into your project and customise how it
behaves. For example, compiling your Sass or JSX files on any change.

```bash
yarn add --dev serve-dev
```

```tsx
// server.mjs - Simple example that serves and watches a folder at path ./public
// node server.mjs (Node v13+)

import DevServer from "serve-dev";

new DevServer({
  root: "public",
  port: 9000,
  watch: {
    paths: ["public"],
    onChange(filePath) {
      console.log(`${filePath} changed.`);
      return { shouldReloadPage: true };
    },
  },
}).start();
```

Check out
[`example/server.mjs`](https://github.com/kvendrik/serve-dev/blob/master/example/server.mjs)
for a more advanced example.

## Contribute

Make your changes and run `yarn example` to test them using the example setup.

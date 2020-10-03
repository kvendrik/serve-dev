#!/usr/bin/env node
import { bold, white, blackBright, cyan, magenta, underline } from "colorette";
import getopts from "getopts";
import fs from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import DevServer from "./dev-server";

// Because .mjs doesnt give us access to it normally
const __dirname = dirname(fileURLToPath(import.meta.url));

const options = getopts(process.argv.slice(2), {
  alias: {
    port: "p",
    help: "h",
    version: "v",
  },
  boolean: ["help", "version"],
  default: {
    help: false,
    version: false,
    port: 3000,
  },
  unknown: (opt) => {
    console.error(
      `Unknown or unexpected option \`${opt}\`.\n` +
        blackBright(
          `See \`${white(bold("serve-dev --help"))}\` for all options`
        )
    );
    process.exit(1);
  },
});

if (options.help) {
  console.log(`
serve-dev - Very simple reloading server for web development

${bold(underline('USAGE'))}

  ${cyan('serve-dev')}
  ${cyan('serve-dev')} --help
  ${cyan('serve-dev')} --version
  ${cyan('serve-dev')} public
  ${cyan('serve-dev')} [-p port] [directory]

  By default serves and listens to changes for the
  current working directory on ${bold('0.0.0.0:3000')}.

${bold(underline('OPTIONS'))}

  ${magenta('-h') + ', ' + magenta('--help')}            Show this help 
  ${magenta('-v') + ', ' + magenta('--version')}         Display the currently installed version of serve-dev 
  ${magenta('-p') + ', ' + magenta(`--port ${underline('port')}`)}       Specify what port to serve on
`.trim());
} else if (options.version) {
  const { version } = JSON.parse(
    fs.readFileSync(resolve(__dirname, "../package.json"), "utf-8")
  );

  console.log(version);
} else {
  const {
    port,
    _: [watch = "."], // Maybe watching multiple dirs?
  } = options;

  new DevServer({
    root: watch,
    port,
    watch: {
      paths: [watch],
      /*
       * Super simple, simply just reload on any change
       * If users want to do anything like actual compilation, they should just do a custom server.mjs as it's not too hard.
       * (alternatively we could provide support for like a `serve-dev.config.mjs` or similar for that).
       *
       * Perhaps provide an ignore option that just globs
       */
      onChange: () => ({ shouldReloadPage: true }),
    },
  }).start();
}

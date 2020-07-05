mv build/index.js build/index.mjs
mv build/dev-server.js build/dev-server.mjs

sed -i -e 's/.\/dev-server/.\/dev-server.mjs/' build/index.mjs
rm build/index.mjs-e

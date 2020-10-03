find build -name \*.js | sed 's/^\(.*\)\.js$/mv "\1.js" "\1.mjs"/' | sh
sed -i -e 's/.\/dev-server/.\/dev-server.mjs/' build/*.mjs
rm build/*.mjs-e

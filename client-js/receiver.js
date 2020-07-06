new WebSocket(`ws://localhost:${document.querySelector('[data-ws-port]').dataset.wsPort}`)
.addEventListener('message', ({data}) => {
  const {action, data: actionData} = JSON.parse(data);

  if (action === 'fileChange') {
    const {replaceModule, doReload} = actionData;

    if (doReload) {
      location.reload();
      return;
    }

    const success = hot.replaceModule(replaceModule);
    if (!success) location.reload();
  }

  if (action === 'log') console.log(actionData.message);
});

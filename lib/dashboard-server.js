const { createReadStream, statSync, watch } = require('fs');
const { createServer, get } = require('http');
const { extname, join } = require('path');

const rootDir = join(__dirname, '..');
const dashboardPath = join(rootDir, 'docs', 'progress-dashboard.html');
const port = Number(process.env.DASHBOARD_PORT || 4177);

const clients = new Set();

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function sendDashboardUpdated() {
  for (const response of clients) {
    response.write('event: dashboard-updated\n');
    response.write(`data: ${Date.now()}\n\n`);
  }
}

function serveFile(response, filePath) {
  try {
    statSync(filePath);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'content-type':
      contentTypes[extname(filePath)] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer((request, response) => {
  if (!request.url || request.url === '/') {
    serveFile(response, dashboardPath);
    return;
  }

  if (request.url === '/events') {
    response.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    response.write('\n');
    clients.add(response);
    request.on('close', () => clients.delete(response));
    return;
  }

  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('Not found');
});

function checkExistingDashboard(callback) {
  const request = get(`http://localhost:${port}`, (response) => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => {
      body += chunk;
    });
    response.on('end', () => {
      callback(body.includes('<title>Sqush Progress Dashboard</title>'));
    });
  });

  request.on('error', () => callback(false));
  request.setTimeout(1000, () => {
    request.destroy();
    callback(false);
  });
}

watch(dashboardPath, { persistent: true }, sendDashboardUpdated);

server.on('error', (error) => {
  if (error.code !== 'EADDRINUSE') {
    throw error;
  }

  checkExistingDashboard((isDashboard) => {
    if (isDashboard) {
      console.log(`Dashboard already running: http://localhost:${port}`);
      process.exit(0);
    }

    console.error(
      `Port ${port} is already in use. Set DASHBOARD_PORT to use a different port.`,
    );
    process.exit(1);
  });
});

server.listen(port, () => {
  console.log(`Dashboard: http://localhost:${port}`);
});

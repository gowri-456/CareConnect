const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const requestedPort = Number(process.env.PORT) || 5175;
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (requestUrl.pathname.startsWith("/api/")) {
    const proxyRequest = http.request(
      {
        hostname: "127.0.0.1",
        port: 5000,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        method: request.method,
        headers: { ...request.headers, host: "127.0.0.1:5000" },
      },
      (proxyResponse) => {
        response.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
        proxyResponse.pipe(response);
      }
    );

    proxyRequest.on("error", () => {
      if (!response.headersSent) {
        response.writeHead(502, { "Content-Type": "application/json" });
      }
      response.end(JSON.stringify({ success: false, message: "The API server is unavailable." }));
    });
    request.pipe(proxyRequest);
    return;
  }

  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/favicon.ico") pathname = "/favicon.svg";
  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(contents);
  });
});

function listen(port) {
  const onListening = () => {
    server.removeListener("error", onError);
    console.log(`CareConnect demo running at http://localhost:${port}`);
  };
  const onError = (error) => {
    server.removeListener("listening", onListening);
    if (error.code === "EADDRINUSE" && !process.env.PORT && port < 5190) {
      listen(port + 1);
      return;
    }
    console.error(`Could not start CareConnect demo on port ${port}: ${error.message}`);
    process.exitCode = 1;
  };
  server.once("error", onError);
  server.once("listening", onListening);
  server.listen(port, "0.0.0.0");
}

listen(requestedPort);
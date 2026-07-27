import serverless from "serverless-http";

let app: any;
if (process.env.NODE_ENV === "production") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  app = require("../dist/server.cjs").default;
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  app = require("../server.ts").default;
}

const handler = serverless(app);

export default async function(req: any, res: any) {
  return handler(req, res);
}

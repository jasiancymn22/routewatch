# routewatch

Lightweight Express/Fastify middleware that auto-generates OpenAPI docs from runtime traffic analysis.

## Installation

```bash
npm install routewatch
```

## Usage

### Express

```typescript
import express from "express";
import { routewatch } from "routewatch";

const app = express();

app.use(routewatch({ output: "./openapi.json" }));

app.get("/users/:id", (req, res) => {
  res.json({ id: req.params.id, name: "Jane Doe" });
});

app.listen(3000);
```

### Fastify

```typescript
import Fastify from "fastify";
import { routewatchPlugin } from "routewatch";

const app = Fastify();

await app.register(routewatchPlugin, { output: "./openapi.json" });

app.get("/users/:id", async (request, reply) => {
  return { id: request.params.id, name: "Jane Doe" };
});

await app.listen({ port: 3000 });
```

After receiving traffic, `routewatch` analyzes request and response shapes and writes an `openapi.json` spec to the configured output path.

## Options

| Option     | Type     | Default           | Description                          |
|------------|----------|-------------------|--------------------------------------|
| `output`   | `string` | `./openapi.json`  | Path to write the generated spec     |
| `watch`    | `boolean`| `true`            | Continuously update spec on new traffic |
| `title`    | `string` | `"API Docs"`      | Title used in the OpenAPI spec       |

## License

MIT
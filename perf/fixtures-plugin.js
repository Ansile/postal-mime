import { createReadStream, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Serves perf/fixtures/* to the browser over plain HTTP: large binary fixtures
// must not go through Vite's module pipeline.
export function perfFixturesPlugin() {
    const fixturesDir = fileURLToPath(new URL('./fixtures/', import.meta.url));

    return {
        name: 'perf-fixtures',
        configureServer(server) {
            server.middlewares.use('/__perf_fixtures__', (req, res, next) => {
                const name = decodeURIComponent(req.url.replace(/^\//, '').split('?')[0]);
                if (!/^[\w.-]+$/.test(name)) {
                    return next();
                }
                const filePath = fixturesDir + name;
                if (!existsSync(filePath)) {
                    res.statusCode = 404;
                    return res.end('fixture not found');
                }
                res.setHeader('Content-Type', 'application/octet-stream');
                createReadStream(filePath).pipe(res);
            });
        }
    };
}

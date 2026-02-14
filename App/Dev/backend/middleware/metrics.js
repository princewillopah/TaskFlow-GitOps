import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
} from '../metrics.js';

export function metricsMiddleware(req, res, next) {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;

    const route =
      req.route?.path ||
      req.baseUrl ||
      req.path ||
      'unknown';

    httpRequestDurationSeconds
      .labels(req.method, route, res.statusCode)
      .observe(durationSeconds);

    httpRequestsTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });

  next();
}

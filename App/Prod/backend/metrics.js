import client from 'prom-client';

// Register
const register = new client.Registry();

// Collect default Node.js metrics
client.collectDefaultMetrics({
  register,
  prefix: 'taskflow_backend_',
});

// HTTP request duration histogram
const httpRequestDurationSeconds = new client.Histogram({
  name: 'taskflow_backend_http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});

// HTTP request counter
const httpRequestsTotal = new client.Counter({
  name: 'taskflow_backend_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Register metrics
register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(httpRequestsTotal);

export {
  register,
  httpRequestDurationSeconds,
  httpRequestsTotal,
};

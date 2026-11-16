What you're looking for is essentially a **Local Microservices Playground / Distributed Systems Simulator**.

The idea is to create a small but realistic microservices architecture running entirely on your local machine, with an NGINX API Gateway acting as the reverse proxy, multiple independent services, simulated traffic, and a real-time monitoring dashboard.

The most important part is that you shouldn't just see a dashboard with fake numbers. You should actually see requests travelling through the gateway, reaching different services, getting processed, and returning responses.

Here is a detailed prompt you can give to your coding agent.

## **Master prompt — Build a local microservices playground**

# Build a Local Microservices Architecture Playground with NGINX API Gateway & Real-Time Monitoring

Act as a Senior Backend Architect, Distributed Systems Engineer, DevOps Engineer, and Full-Stack Developer.

I want you to build a fully functional, locally runnable microservices architecture playground. This is an educational and experimental project designed to help me understand how real-world microservices communicate, how reverse proxies and API gateways work, how traffic is distributed, and how services behave under different workloads.

This is NOT a production deployment. Everything should run locally using Docker Compose.

The goal is to make the architecture genuinely functional, observable, interactive, and visually impressive.

## 1. Core Architecture

Create the following architecture:

Client / Browser / Load Generator\
|\
v\
NGINX API Gateway\
(Reverse Proxy)\
|\
+-------------------+\
\| | |\
v v v\
User Product Order\
Service Service Service\
\| | |\
v v v\
Database Database Database

```
    +-------------------+
    |
    v
```

Notification Service\
|\
v\
Background Worker

Additional infrastructure:

- Redis for caching and inter-service coordination.
- PostgreSQL for persistent service data where appropriate.
- Prometheus for metrics collection.
- Grafana (optional) for infrastructure-level monitoring.

Every microservice must be an independently running application with its own port, health endpoint, and responsibilities.

## 2. Microservices to Implement

Create these simple but realistic services:

**1. User Service**

- Create users.
- Retrieve users.
- Update user information.
- Delete users.
- Maintain request counters.

**2. Product Service**

- Create products.
- List products.
- Retrieve individual products.
- Update inventory.
- Simulate product lookup latency.

**3. Order Service**

- Create orders.
- Retrieve orders.
- Communicate with the Product Service.
- Simulate order processing.
- Generate order events.

**4. Notification Service**

- Receive notification requests.
- Simulate sending email/SMS notifications.
- Track successful and failed notifications.

**5. Analytics Service**

- Collect service-level statistics.
- Track incoming requests.
- Track response times.
- Calculate error rates.
- Provide aggregated metrics.

**6. Background Worker**

- Process asynchronous jobs.
- Consume queued tasks from Redis.
- Simulate variable processing times.
- Track completed, pending, and failed jobs.

Keep the services simple. The objective is to understand distributed architecture, not build complex business logic.

## 3. NGINX API Gateway

Implement NGINX as the central reverse proxy.

Requirements:

- All frontend and client requests should enter through NGINX.
- Configure routing based on URL paths.
- `/api/users/*` → User Service.
- `/api/products/*` → Product Service.
- `/api/orders/*` → Order Service.
- `/api/notifications/*` → Notification Service.
- `/api/analytics/*` → Analytics Service.
- Configure upstream services.
- Implement load balancing where multiple instances exist.
- Use round-robin as the default balancing algorithm.
- Add configurable proxy timeouts.
- Configure health-check-aware routing if supported by the chosen NGINX edition or implement a suitable health-check mechanism externally.
- Forward appropriate headers, including X-Forwarded-For and X-Request-ID.
- Enable access logs with upstream response times.
- Add a configurable rate limit.
- Demonstrate what happens when a service becomes unavailable.

Important: NGINX must actually route requests. Do not simulate gateway behavior in the frontend.

## 4. Multiple Service Instances

Run multiple instances of selected services.

For example:

- User Service: 2 instances.
- Product Service: 3 instances.
- Order Service: 2 instances.
- Notification Service: 2 instances.

Use NGINX upstream configurations to distribute traffic between instances.

Each instance must have a unique instance ID.

I want to see exactly which instance handles each request.

For example:

Request #1024\
Gateway → Product Service → product-service-2

Request #1025\
Gateway → Product Service → product-service-1

Request #1026\
Gateway → Product Service → product-service-3

Make this behavior observable in the UI.

## 5. Traffic Generator / Load Testing Engine

This is one of the most important features.

Create an independent load generator that I can execute manually through a command.

Example:

`npm run load-test`

Also provide:

`npm run load-test:light`\
`npm run load-test:medium`\
`npm run load-test:heavy`

Allow configuration through CLI arguments:

`npm run load-test -- --duration 60 --rps 100`

Support:

- Configurable requests per second.
- Configurable test duration.
- Configurable concurrency.
- Configurable target service.
- Configurable traffic distribution.
- Randomized request payloads.
- GET, POST, PUT, and DELETE requests where appropriate.
- Real HTTP requests through the NGINX gateway.
- Request success/failure tracking.
- Response-time measurement.
- Latency percentiles (p50, p90, p95, p99).
- Requests per second.
- Error rate.
- Timeout tracking.

Create realistic traffic patterns:

1. Normal traffic.
2. Random burst traffic.
3. Gradually increasing traffic.
4. Sudden traffic spike.
5. Traffic focused on a single service.
6. Uneven traffic distribution.
7. Mixed traffic across all services.

The load generator must actually send HTTP requests. Do not generate fake monitoring data.

Provide a graceful stop mechanism using Ctrl+C.

## 6. Real-Time Monitoring Dashboard

Build an interactive web dashboard as the main application.

Use a clean, premium, modern developer-tool aesthetic.

Suggested stack:

- Next.js or React.
- TypeScript.
- Tailwind CSS.
- Recharts for charts.
- WebSocket or Server-Sent Events for real-time updates.

The dashboard must contain the following sections.

### A. Architecture Visualization

Build a live architecture diagram.

Display:

- Client.
- Load Generator.
- NGINX API Gateway.
- Individual microservices.
- Individual service instances.
- Redis.
- Databases.
- Background Workers.

Connect the components with animated directional edges.

When an HTTP request travels through the architecture, visually animate a small packet moving along the relevant connection.

Show:

- Incoming request.
- Gateway routing.
- Selected service instance.
- Inter-service communication.
- Response returning to the client.

Use distinct visual states:

- Green: Healthy.
- Yellow: High latency or degraded.
- Red: Unhealthy or unavailable.
- Gray: Idle.

The visualization must reflect actual request and health events, not random animations.

### B. Live Traffic Overview

Display:

- Total requests.
- Requests per second.
- Successful requests.
- Failed requests.
- Average latency.
- P95 latency.
- Active connections.
- Current load-test status.

Update the dashboard in near real time.

### C. Traffic Distribution

Create a chart showing how traffic is distributed across services and their instances.

For example:

Product Service:

- Instance 1: 35%
- Instance 2: 33%
- Instance 3: 32%

These percentages must come from actual observed request counts.

### D. Service Health Monitoring

For every service and instance display:

- Health status.
- CPU usage where available.
- Memory consumption.
- Request count.
- Error count.
- Average response time.
- Current active requests.
- Uptime.

Do not fabricate CPU or memory measurements. Collect them from actual process/container metrics.

### E. Live Request Explorer

Create a real-time request log.

Each entry should show:

- Request ID.
- HTTP method.
- Endpoint.
- Gateway timestamp.
- Target service.
- Selected instance.
- Response status.
- Response time.
- Upstream response time.

Clicking an entry should open a detailed request trace showing the request's journey through the system.

### F. Performance Charts

Include:

- Requests per second over time.
- Response time over time.
- Error rate over time.
- Traffic per service.
- Instance-level traffic distribution.
- Worker queue size.
- Successful vs failed requests.

Allow switching between 10-second, 1-minute, and 5-minute windows.

## 7. Interactive Controls

Add a control panel to the dashboard.

I should be able to:

- Start a load test.
- Stop a running load test.
- Select a target service.
- Select traffic intensity.
- Configure requests per second.
- Configure test duration.
- Choose a traffic pattern.
- Trigger a traffic spike.
- Trigger a service failure.
- Restart a service.
- Add or remove service instances where practical.
- Enable or disable rate limiting.
- Change simulated service processing latency.

Make sure these actions execute real backend operations.

For service failure simulation, provide controlled fault injection:

- Add artificial latency.
- Return HTTP 500 errors.
- Temporarily make a service unavailable.
- Simulate slow downstream dependencies.

Never accidentally terminate the entire Docker environment when simulating a service failure.

## 8. Demonstration Scenarios

Create a dedicated Scenarios section with predefined experiments.

**Scenario 1: Normal Operation**\
Send moderate traffic and observe normal request distribution.

**Scenario 2: Load Balancing**\
Send traffic to a service with three instances and observe how NGINX distributes requests.

**Scenario 3: Traffic Spike**\
Suddenly increase traffic and observe latency, throughput, and error rates.

**Scenario 4: Service Failure**\
Make one service instance unavailable and observe the consequences.

**Scenario 5: Rate Limiting**\
Enable NGINX rate limiting and observe HTTP 429 responses.

**Scenario 6: Slow Service**\
Introduce artificial latency and observe how it affects response times.

**Scenario 7: Cascading Failure**\
Make a downstream dependency slow or unavailable and observe how upstream requests are affected.

**Scenario 8: Recovery**\
Restore the failed service and observe the system returning to normal.

Each scenario should explain:

- What is happening.
- Why it is happening.
- What I should observe.
- What I can learn from it.

## 9. Distributed Tracing and Request Correlation

Implement proper request correlation.

Every request should have a unique request ID.

Pass it through:

- NGINX.
- Microservices.
- Inter-service requests.
- Background jobs where appropriate.

Display the request journey in the dashboard.

Prefer OpenTelemetry instrumentation if practical.

Optionally integrate Jaeger or an OpenTelemetry-compatible tracing backend.

I want to understand how one incoming request can travel through multiple services.

## 10. Docker Compose & Local Development

Everything must run locally.

Provide a Docker Compose configuration containing all required infrastructure.

Requirements:

- Independent containers.
- Internal Docker networking.
- Appropriate health checks.
- Restart policies.
- Persistent database volumes.
- Environment variables.
- Clear port mappings.
- Centralized logging where practical.

Create simple commands:

`npm run dev`\
`npm run docker:up`\
`npm run docker:down`\
`npm run load-test`\
`npm run load-test:stop`\
`npm run logs`

Provide a comprehensive README with setup instructions and architecture documentation.

## 11. Important Engineering Rules

- No fake metrics.
- No hardcoded traffic statistics.
- No simulated request distribution in the dashboard.
- Every displayed metric must originate from actual requests, instrumentation, or system monitoring.
- The load generator must use actual HTTP requests.
- NGINX must perform actual reverse proxying.
- Services must run independently.
- The architecture diagram must reflect actual system state.
- Handle service disconnections gracefully.
- Avoid unnecessary complexity.
- Keep the code modular and maintainable.
- Add meaningful logging.
- Implement proper error handling.
- Use TypeScript where appropriate.

## 12. Final Deliverables

I expect:

1. Complete working source code.
2. Docker Compose configuration.
3. NGINX configuration.
4. All microservices.
5. Multiple service instances.
6. Load-testing CLI tool.
7. Interactive real-time monitoring dashboard.
8. Live architecture visualization.
9. Request tracing.
10. Fault-injection controls.
11. Predefined demonstration scenarios.
12. README with setup and usage instructions.

## 13. Execution Strategy

Do not just generate a project structure and stop.

First inspect the existing repository and understand its current stack, conventions, and architecture.

If a project already exists, integrate this playground without unnecessarily rewriting existing functionality.

Then implement the project incrementally:

Phase 1: Core microservices and NGINX reverse proxy.

Phase 2: Docker Compose and multiple instances.

Phase 3: Real load generator.

Phase 4: Metrics collection and request correlation.

Phase 5: Real-time monitoring backend.

Phase 6: Interactive architecture visualization.

Phase 7: Performance dashboard and request explorer.

Phase 8: Fault injection and demonstration scenarios.

Phase 9: Automated integration and load tests.

Phase 10: Documentation and final verification.

After each phase, run relevant tests and fix failures before moving forward.

At the end, actually start the complete environment, execute load tests, verify NGINX routing, verify instance-level load balancing, simulate a service failure, and confirm that the dashboard accurately reflects the changes.

**Definition of Done:** I should be able to open the dashboard in my browser, start a traffic generator, watch real requests flow through NGINX into different microservice instances, observe live metrics, deliberately break a service, and see how the architecture responds and recovers.

This should feel like a small, professional distributed-systems observability laboratory, not a static demo website.

## **What I particularly recommend for the visualization**

I would make the dashboard look something like a combination of a distributed-systems observability tool and a network topology monitor.

[Demystifying Observability with OpenTelemetry and SigNoz | by Dilip Kumar | Mar, 2026 | Medium](https://images.openai.com/static-rsc-4/Lka7W1L-6txIyTsewEpIaxxI5WJsBuI62sbcK7GH9JoVCUfsg3d_tW9ATn2F9LiTtg4Xnn9m7FfoozAXCm7V1ekZXvvwt8A0V8nN3MGA-UIeU2djvXtUCZW_5wjJItWgsvfUPK1EimOkfUlxiKLd4fad5K9VfyGFDjOUubhiO48?purpose=inline)

[Monitoring and Distributed Tracing with Grafana, Prometheus, Loki & Tempo · Cozi](https://images.openai.com/static-rsc-4/bBv6i6gC2oP8MX11A7H_fz9DGpxOxSTuiw1Y78iNsZeQtidD2XBanWjOx7scaHGWtmN0A0-BmeuInKrYu6fM7w8eBB_8tmP-H017xSA3Y9ytcGEDgcfRQ4hgYsc4U_u1zLOzcP3T4vE8uEdPEB0WIl0z62zq7DdIYfGB85pFeF8?purpose=inline)

[OpenTelemetry on Kubernetes: Collector, Operator, and Auto-Instrumentation (2026) | Coding Protocols](https://images.openai.com/static-rsc-4/xDqtizr1fSK2liJuPdP4kBloEO3kT1v9Gkw6IZ8OdhkhrHVZNDjTwSPPEuv_15_pvWmfhBQA_T0j-U-azZA8TZ05xVduNpe85e5RsH-zxbAN2s02SRQT-hf_7bXGMC0ckcwwu_VuroHWuUp3zD5lDDmeSbxsRwAwbH84kSmzwnY?purpose=inline)

12

Here is how I'd structure the main interface:

**Distributed Systems Playground**

LOCAL ENVIRONMENT

Requests/sec

# **1,240**

Avg latency

# **42ms**

Error rate

# **0.4%**

**Live architecture**

LOAD GENERATOR

**NGINX API GATEWAY**

Reverse proxy · Port 80

USER SERVICE

2 instances

PRODUCT SERVICE

3 instances

ORDER SERVICE

2 instances

NOTIFICATION

2 instances

REDIS

POSTGRESQL

WORKERS

Illustrative layout only — the actual dashboard should show live telemetry, not these example values.

**Live request activity**

● 200 OK

GET /api/products

24ms

● 200 OK

GET /api/users

18ms

● 503 ERROR

POST /api/orders

2.1s

Illustrative dashboard mockup, not connected to running services.

## **My recommended technology choices**

| Component                  | Technology                     |
| -------------------------- | ------------------------------ |
| Gateway                    | NGINX                          |
| Microservices              | Node.js + Express + TypeScript |
| Containers                 | Docker Compose                 |
| Database                   | PostgreSQL                     |
| Cache / Queue              | Redis                          |
| Metrics                    | Prometheus                     |
| System monitoring          | cAdvisor                       |
| Tracing                    | OpenTelemetry                  |
| Dashboard                  | Next.js + Tailwind             |
| Architecture visualization | React Flow                     |
| Real-time updates          | WebSocket                      |
| Charts                     | Recharts                       |
| Load testing               | Custom Node.js generator       |

**Three important things I'd emphasize:**

1\. **React Flow for architecture visualization:** Don't just show boxes and arrows. Show animated request packets moving from NGINX to the actual service instance handling the request.

2\. **Real request tracing:** Every request should have a correlation ID. Clicking a request should reveal its complete journey, including gateway time, upstream time, service processing time, and downstream calls.

3\. **Real load testing:** Don't make the dashboard generate its own traffic statistics. The dashboard should consume metrics collected from the actual services.

One additional recommendation: keep the load generator outside the monitored microservice containers. Otherwise, you can end up measuring the load generator's resource consumption as if it were the services' workload.

**The end result should let you experiment with distributed systems visually:** increase traffic, watch load balancing, kill an instance, observe errors, restart it, and understand exactly what happened at every stage.

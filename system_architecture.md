# System Architecture

## Overview
The Transport and Fleet Management System follows a three-tier architecture:
1. Presentation Layer (Frontend)
2. Application Layer (Backend API)
3. Data Layer (Database)

## Technology Stack
- **Frontend:** React 18+ with Tailwind CSS for responsive UI
- **Backend:** Node.js (v18+) with Express.js framework
- **Database:** PostgreSQL 14+
- **Authentication:** JWT (JSON Web Tokens) with role-based access control
- **Real-time Updates:** WebSocket (Socket.io) for live trip/status updates
- **Deployment:** Docker containers orchestrated with Docker Compose (development) and Kubernetes (production)

## Architecture Components

### 1. Presentation Layer (Client)
- **Framework:** React with functional components and hooks
- **State Management:** React Context API for global state (auth, notifications)
- **Routing:** React Router v6
- **UI Components:** Custom component library built with Tailwind CSS
- **Real-time Features:** Socket.io client for live updates
- **Responsive Design:** Mobile-first approach with breakpoints for tablets and desktops

### 2. Application Layer (Server)
- **Runtime:** Node.js with Express.js
- **API Design:** RESTful API with versioning (/api/v1/)
- **Middleware:**
  - Authentication (JWT verification)
  - Authorization (role-based middleware)
  - Input validation (express-validator)
  - Error handling
  - CORS configuration
  - Rate limiting
- **Services Layer:** Business logic separated into service modules
- **Database Interaction:** PostgreSQL client (pg) with connection pooling
- **Real-time Server:** Socket.io server for pushing updates to clients
- **Background Jobs:** Node-cron for scheduled tasks (maintenance reminders, license expiry checks)

### 3. Data Layer
- **Primary Database:** PostgreSQL with the schema defined in database_schema.sql
- **Connection Management:** Pool of database connections
- **Migrations:** Node-pg-migrate for schema versioning
- **Seeding:** Initial data for roles, admin user, and sample data

## Communication Flow
1. Client sends HTTP requests to REST API endpoints
2. API validates request, authenticates user via JWT, checks permissions
3. Controller processes request and delegates to service layer
4. Service layer interacts with database through model/repository functions
5. Response sent back to client with appropriate status code and data
6. For real-time updates: Server emits events via Socket.io when data changes
7. Clients subscribed to relevant channels receive updates and update UI

## Security Considerations
- Passwords hashed using bcrypt (salt rounds: 12)
- JWT tokens expire in 15 minutes with refresh token mechanism
- HTTPS enforcement in production
- Input sanitization and validation to prevent SQL injection and XSS
- Environment variables for sensitive configuration (database credentials, JWT secrets)
- Helmet.js for HTTP header security
- Rate limiting to prevent brute force attacks

## Scalability Features
- Horizontal scaling of Node.js instances behind a load balancer
- Database read replicas for reporting queries
- Redis caching layer (planned for future) for frequent queries
- CDN for static assets
- Microservices-ready architecture (services can be split later)

## Deployment Architecture
- **Development:** Docker Compose with 3 services (frontend, backend, database)
- **Staging/Production:**
  - Frontend: Served via Nginx or cloud storage (AWS S3 + CloudFront)
  - Backend: Node.js cluster or Kubernetes deployment
  - Database: Managed PostgreSQL service (AWS RDS or Google Cloud SQL)
  - Redis: For caching and session store (optional)
  - Load Balancer: AWS ALB or NGINX Plus
  - Monitoring: Prometheus + Grafana for metrics, ELK stack for logs
  - CI/CD: GitHub Actions for automated testing and deployment

## API Endpoints Overview
### Authentication
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout

### Users
- GET /api/v1/users (admin only)
- GET /api/v1/users/:id
- PUT /api/v1/users/:id
- DELETE /api/v1/users/:id (admin only)

### Vehicles
- GET /api/v1/vehicles
- POST /api/v1/vehicles
- GET /api/v1/vehicles/:id
- PUT /api/v1/vehicles/:id
- DELETE /api/v1/vehicles/:id

### Trips
- GET /api/v1/trips
- POST /api/v1/trips
- GET /api/v1/trips/:id
- PUT /api/v1/trips/:id
- DELETE /api/v1/trips/:id
- PATCH /api/v1/trips/:id/status

### Maintenance Tasks
- GET /api/v1/maintenance
- POST /api/v1/maintenance
- GET /api/v1/maintenance/:id
- PUT /api/v1/maintenance/:id
- DELETE /api/v1/maintenance/:id
- PATCH /api/v1/maintenance/:id/status

### Notifications
- GET /api/v1/notifications
- PATCH /api/v1/notifications/:id/read
- DELETE /api/v1/notifications/:id

### Reports
- GET /api/v1/reports/transport
- GET /api/v1/reports/maintenance
- GET /api/v1/reports/staff

## Data Models (Summary)
Refer to database_schema.sql for complete schema details.

Key relationships:
- Users have one role (admin, driver, mechanic, farm_client)
- Drivers and Mechanics are extensions of Users
- Vehicles have many Trips and MaintenanceTasks
- Trips belong to a Farm, Vehicle, and Driver
- MaintenanceTasks belong to a Vehicle and Mechanic
- Farms can request Trips and Maintenance
- Inventory tracks parts used in maintenance
- Notifications link to Users and related entities

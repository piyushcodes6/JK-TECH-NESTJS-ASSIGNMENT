# NestJS Backend Assignment

A robust NestJS backend application featuring user authentication, document management, and data ingestion capabilities.

## Features

- 🔐 JWT Authentication
- 👤 User Management
- 📄 Document Handling
- 🔄 Data Ingestion Jobs
- 🏥 Health Monitoring
- 🐘 PostgreSQL Database
- 🐳 Docker Containerization

## Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose (for containerized setup)
- PostgreSQL (if running without Docker)

## Quick Start with Docker

1. Clone the repository
```bash
git clone <repository-url>
cd nestjs-backend-assignment
```

2. Create .env file (use .env.example as template)
```bash
cp .env.example .env
```

3. Start the application using Docker Compose
```bash
docker-compose up -d
```

The application will be available at http://localhost:3000
PgAdmin will be available at http://localhost:5050

## Local Development Setup

1. Install dependencies
```bash
npm install
```

2. Configure environment variables
```bash
cp .env.example .env
# Update the .env file with your local configuration
```

3. Start the development server
```bash
npm run start:dev
```

## Environment Variables

The application uses the following environment variables:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Application port (default: 3000)
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port
- `DB_USERNAME` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password
- `DB_NAME` - PostgreSQL database name
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - JWT token expiration
- `JWT_REFRESH_EXPIRES_IN` - JWT refresh token expiration
- `UPLOAD_DIR` - Directory for file uploads
- `MAX_FILE_SIZE` - Maximum file upload size
- `PYTHON_SERVICE_URL` - External Python service URL
- `WEBHOOK_SECRET` - Webhook secret key

## Project Structure

```
src/
├── auth/                 # Authentication module
├── config/              # Configuration module
├── documents/           # Document management module
├── health/              # Health check module
├── ingestion/           # Data ingestion module
├── users/               # User management module
└── main.ts              # Application entry point
```

## API Documentation

### Authentication
- POST /auth/register - Register new user
- POST /auth/login - User login
- POST /auth/refresh - Refresh JWT token

### Users
- GET /users - List users
- GET /users/:id - Get user details
- PUT /users/:id - Update user
- DELETE /users/:id - Delete user

### Documents
- POST /documents - Upload document
- GET /documents - List documents
- GET /documents/:id - Get document
- PUT /documents/:id - Update document
- DELETE /documents/:id - Delete document

### Health
- GET /health - Check application health

## Scripts

- `npm run start:dev` - Start development server
- `npm run build` - Build the application
- `npm run start:prod` - Start production server
- `npm run test` - Run tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Run linter

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[MIT Licensed](LICENSE)

# Technology Stack

## Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui components built on Radix UI
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

## Backend
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with connection pooling
- **External APIs**: Google Sheets API v4 for expense import
- **Scheduled Jobs**: node-cron for automated tasks
- **Authentication**: JWT-based (planned)

## Development Tools
- **Package Manager**: npm (with Bun lockfile present)
- **Testing**: Jest with Testing Library
- **Linting**: ESLint with TypeScript support
- **Type Checking**: TypeScript with strict configuration
- **Code Formatting**: Prettier (implied by project structure)

## Key Libraries
- **Database**: pg (PostgreSQL client)
- **Date Handling**: date-fns
- **Charts**: Recharts for financial visualizations
- **Notifications**: Sonner for toast notifications
- **File Processing**: Google APIs for spreadsheet integration

## Common Commands

### Development
```bash
# Start development server (frontend only)
npm run dev

# Start backend server
npm run server

# Start both frontend and backend
npm run dev:full

# Run tests
npm run test
npm run test:watch
npm run test:coverage
```

### Build & Deploy
```bash
# Production build
npm run build

# Development build
npm run build:dev

# Preview production build
npm run preview
```

### Testing
```bash
# Run all tests
npm test

# Run client tests only
npm run test:client

# Run server tests only
npm run test:server

# Watch mode for development
npm run test:watch
```

## Environment Configuration
- Uses `.env` files for configuration
- Database connection via PostgreSQL environment variables
- Google Sheets API requires `credentials.json` file
- Frontend proxy configured to backend on port 3001

## Architecture Notes
- Frontend runs on port 8091 (development)
- Backend API runs on port 3001
- Database operations use connection pooling
- Scheduled jobs run automated payment processing
- API endpoints follow RESTful conventions under `/api/*`
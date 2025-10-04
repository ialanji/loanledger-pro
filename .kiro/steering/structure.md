# Project Structure

## Root Directory Organization

```
├── src/                    # Frontend source code
├── public/                 # Static assets
├── supabase/              # Database migrations and functions
├── tests/                 # Test files and utilities
├── scripts/               # Utility scripts
├── dist/                  # Build output
├── node_modules/          # Dependencies
├── server.js              # Backend Express server
└── package.json           # Project configuration
```

## Frontend Structure (`src/`)

```
src/
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui base components
│   ├── layout/           # Layout components (AppLayout, etc.)
│   ├── dashboard/        # Dashboard-specific components
│   └── __tests__/        # Component tests
├── pages/                # Route components
│   ├── Dashboard.tsx     # Main dashboard
│   ├── Credits.tsx       # Credit management
│   ├── Expenses.tsx      # Expense tracking
│   ├── CashDesk.tsx      # Cash operations
│   └── ...
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── utils.ts          # General utilities
│   ├── api.ts            # API client functions
│   └── database.ts       # Database utilities
├── types/                # TypeScript type definitions
├── services/             # Business logic services
├── integrations/         # External service integrations
└── utils/                # Helper functions
```

## Backend Structure

- **server.js**: Main Express server with all API routes
- **src/services/**: Business logic (schedule-engine.js, etc.)
- **src/jobs/**: Scheduled background jobs
- **credentials.json**: Google Sheets API credentials

## Database Structure (`supabase/`)

```
supabase/
├── config.toml           # Supabase configuration
├── migrations/           # Database schema migrations
└── functions/            # Edge functions (if any)
```

## Testing Structure (`tests/`)

```
tests/
├── unit/                 # Unit tests
├── integration/          # Integration tests
├── database/             # Database-specific tests
├── utils/                # Test utilities
└── testing-results.md    # Test documentation
```

## Key Files

- **package.json**: Dependencies and scripts
- **tsconfig.json**: TypeScript configuration with path aliases
- **vite.config.ts**: Build configuration with proxy setup
- **tailwind.config.ts**: Styling configuration
- **components.json**: shadcn/ui configuration

## Naming Conventions

- **Components**: PascalCase (e.g., `CreditForm.tsx`)
- **Pages**: PascalCase (e.g., `Dashboard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useCredit.ts`)
- **Types**: PascalCase interfaces/enums (e.g., `Credit`, `PaymentStatus`)
- **API Routes**: kebab-case (e.g., `/api/credit-payments`)
- **Database Tables**: snake_case (e.g., `credit_payment`)

## Import Aliases

- `@/`: Maps to `src/` directory
- `@/components`: UI components
- `@/lib`: Utility libraries
- `@/types`: Type definitions
- `@/hooks`: Custom hooks

## Module Organization

Each major feature follows a consistent structure:
- Page component in `src/pages/`
- Related components in `src/components/`
- Types in `src/types/`
- API functions in `src/lib/api.ts`
- Business logic in `src/services/`

## Configuration Files

- **.env**: Environment variables (not committed)
- **.env.example**: Environment template
- **credentials.json**: Google API credentials
- **babel.config.cjs**: Babel configuration for testing
- **jest.config.cjs**: Jest test configuration
- **postcss.config.js**: PostCSS configuration
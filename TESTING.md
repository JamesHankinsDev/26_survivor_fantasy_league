# Testing Guide

This project uses **Vitest** and **React Testing Library** for comprehensive test coverage.

## Test Structure

```
src/
├── components/
│   ├── CastawayCard.tsx
│   └── CastawayCard.test.tsx    # Component tests
├── utils/
│   ├── scoring.ts
│   └── scoring.test.ts          # Utility function tests
├── types/
│   ├── league.ts
│   └── league.test.ts           # Type helper tests
└── test/
    └── setup.ts                 # Global test configuration
```

## Running Tests

### Development Mode (Watch)
```bash
npm test
```
Runs tests in watch mode - automatically re-runs tests when files change.

### Run Once
```bash
npm run test:run
```
Runs all tests once and exits. Used in CI/CD.

### With UI
```bash
npm run test:ui
```
Opens Vitest UI for interactive test exploration.

### Coverage Report
```bash
npm run test:coverage
```
Generates a code coverage report in the `coverage/` directory.

## Test Categories

### 1. Unit Tests (Utils & Types)
- **Location**: `src/utils/*.test.ts`, `src/types/*.test.ts`
- **Purpose**: Test pure functions and business logic
- **Examples**:
  - Scoring calculations
  - Input validation
  - Helper functions

```typescript
// Example: src/utils/scoring.test.ts
describe("calculateTribeTotalPoints", () => {
  it("should calculate total points correctly", () => {
    const result = calculateTribeTotalPoints(tribeMember, episodeScores);
    expect(result).toBe(150);
  });
});
```

### 2. Component Tests
- **Location**: `src/components/*.test.tsx`
- **Purpose**: Test React component rendering and behavior
- **Examples**:
  - CastawayCard
  - TribeCard
  - Modal dialogs

```typescript
// Example: src/components/CastawayCard.test.tsx
describe("CastawayCard", () => {
  it("should render castaway name", () => {
    render(<CastawayCard castaway={mockCastaway} />);
    expect(screen.getByText("Test Castaway")).toBeInTheDocument();
  });
});
```

## Writing Tests

### Best Practices

1. **Test File Naming**: Use `.test.ts` or `.test.tsx` extension
2. **Co-location**: Place test files next to the code they test
3. **Descriptive Names**: Use clear, descriptive test names
4. **AAA Pattern**: Arrange, Act, Assert

```typescript
it("should calculate points correctly", () => {
  // Arrange
  const input = createTestData();

  // Act
  const result = calculatePoints(input);

  // Assert
  expect(result).toBe(expected);
});
```

### Component Testing

```typescript
import { render, screen } from "@testing-library/react";
import MyComponent from "./MyComponent";

describe("MyComponent", () => {
  it("should render with props", () => {
    render(<MyComponent name="Test" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
```

### Testing Hooks

```typescript
import { renderHook } from "@testing-library/react";
import { useMyHook } from "./useMyHook";

it("should return correct value", () => {
  const { result } = renderHook(() => useMyHook());
  expect(result.current.value).toBe(expected);
});
```

## Mocking

### Firebase Mocking
Firebase is automatically mocked in `src/test/setup.ts`:

```typescript
vi.mock("@/lib/firebase", () => ({
  auth: null,
  googleProvider: null,
  db: null,
}));
```

### Next.js Router Mocking
The Next.js router is also mocked globally:

```typescript
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));
```

### Custom Mocks
For component-specific mocks:

```typescript
import { vi } from "vitest";

const mockFunction = vi.fn();
mockFunction.mockReturnValue("mocked value");
```

## Coverage Goals

- **Target**: 80%+ coverage for critical paths
- **Priority Areas**:
  - ✅ Utils (scoring, validation) - 90%+
  - ✅ Type helpers - 90%+
  - 🎯 Components - 70%+
  - 🎯 Contexts - 60%+

View coverage report:
```bash
npm run test:coverage
open coverage/index.html
```

## CI/CD Integration

Tests run automatically on:
- ✅ Push to `main` or `dev`
- ✅ Pull requests to `main` or `dev`

See [.github/workflows/test.yml](.github/workflows/test.yml) for configuration.

### GitHub Actions Workflow
- Runs on Node.js 20.x
- Executes linter
- Runs full test suite
- Generates coverage report
- Uploads to Codecov (optional)

## Current Test Stats

```
Test Files: 5 passed (5)
Tests:      86 passed (86)
Duration:   ~700ms
```

### Test Coverage by Area

| Area | Files | Tests | Status |
|------|-------|-------|--------|
| Utils | 2 | 51 | ✅ Complete |
| Types | 1 | 17 | ✅ Complete |
| Components | 2 | 18 | ✅ Complete |

## Troubleshooting

### Tests not running?
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Import errors?
Check that path aliases are configured in both:
- `tsconfig.json` (for TypeScript)
- `vitest.config.ts` (for Vitest)

### Mocking issues?
Ensure mocks are defined in `src/test/setup.ts` for global mocks.

## Next Steps

Areas to expand test coverage:
1. Context providers (AuthContext, ThemeContext)
2. Page components
3. Firebase integration tests (with emulators)
4. E2E tests (consider Playwright)
5. API route tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

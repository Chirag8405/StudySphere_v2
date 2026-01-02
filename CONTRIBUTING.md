# Contributing to StudySphere

Thank you for your interest in contributing to StudySphere! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all backgrounds and experience levels.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/studysphere.git
   cd studysphere
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/studysphere.git
   ```

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev
```

The application will be available at `http://localhost:8080`.

### Project Structure

```
studysphere/
├── client/           # React frontend
│   ├── components/   # UI components
│   ├── lib/          # Utilities and API
│   └── pages/        # Route components
├── server/           # Express backend
│   ├── database/     # Database logic
│   ├── middleware/   # Express middleware
│   ├── models/       # Data models
│   └── routes/       # API routes
└── shared/           # Shared types
```

## Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our [coding standards](#coding-standards)

3. **Test your changes**:
   ```bash
   npm run test
   npm run typecheck
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Pull Request Process

1. **Update your branch** with the latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what and why
   - Reference to any related issues

4. **Address review feedback** if requested

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types/interfaces
- Avoid `any` type when possible

### React

- Use functional components with hooks
- Keep components focused and small
- Use proper prop typing

### API

- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Return appropriate status codes
- Validate all inputs

### Styling

- Use TailwindCSS utility classes
- Follow existing component patterns
- Ensure responsive design

## Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck

# Linting
npm run format
```

## Questions?

If you have questions, feel free to:
- Open an issue on GitHub
- Check existing documentation in `/docs`

Thank you for contributing! 🎓

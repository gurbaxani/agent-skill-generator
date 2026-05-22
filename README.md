# Agent Skill Generator (ASG)

Agent Skill Generator is a modern web application built with SvelteKit that allows you to create, browse, and manage skills for AI agents.

## Features

- **Create Skills:** Interface to define and generate new agent skills.
- **Browse Skills:** View and discover existing skills.
- **Manage Keys:** API key management.

## Tech Stack

This project is built using:
- [Svelte 5](https://svelte.dev/) - UI Framework (using Runes)
- [SvelteKit](https://kit.svelte.dev/) - Application Framework
- [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first styling
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm, npm, or yarn

### Installation

1. Clone the repository and navigate to the project directory:
   ```sh
   cd asg
   ```

2. Install dependencies:
   ```sh
   npm install
   # or
   pnpm install
   ```

### Development

Start the development server:

```sh
npm run dev
# or
pnpm run dev
```

The app will be available at `http://localhost:5173/`.

### Building for Production

To create a production build:

```sh
npm run build
# or
pnpm run build
```

You can preview the built app with:

```sh
npm run preview
```

## Project Structure

- `src/routes/` - SvelteKit pages and API routes (browse, contact, create, keys)
- `src/lib/` - Reusable components and utilities

## Code Quality & Standards

This project uses:
- Strict Type Safety: No `:any` types allowed.
- Svelte 5 Runes: Exclusively uses `$state`, `$derived`, `$props` for reactivity.
- Biome for linting.


# Decision 001: Initial backend technology stack

**Date:** 29 July 2026  

## Context

The project requires a backend API and relational database capable of modelling clinician availability, appointment slots, bookings, cancellation and double-booking prevention.

I had previous experience with web development and TypeScript, but no previous practical experience with ASP.NET Core Web API, Entity Framework Core or SQLite.

## Alternatives considered

### Node.js and Express

This would reduce implementation risk because TypeScript is already familiar. However, it would provide less evidence of extending my technical knowledge into a new backend ecosystem.

### ASP.NET Core Web API

This supports a controller-based layered architecture, dependency injection, validation and automated testing. It also provides an opportunity to extend my knowledge beyond previous module work.

### Direct SQL

Direct SQL would provide explicit control over database operations but would require more manual mapping and database-access code.

### Entity Framework Core

Entity Framework Core supports entity mapping, relationships, migrations and database access while still allowing database constraints and transactions to be investigated.

### PostgreSQL

PostgreSQL would provide stronger production and concurrency capabilities but would add infrastructure and administration that are unnecessary for a local proof of concept.

### SQLite

SQLite provides a lightweight local relational database with minimal setup. It is suitable for a reproducible proof of concept, although its production concurrency limitations must be acknowledged.

## Decision

The initial implementation will use:

- ASP.NET Core Web API;
- Entity Framework Core;
- SQLite;
- xUnit.

React and TypeScript will remain the planned frontend technologies.

## Inital commit

The inital commit demonstrated that:

- the ASP.NET Core solution builds successfully;
- the API runs locally;
- an endpoint can be accessed;
- the xUnit test project runs successfully;
- Entity Framework Core tooling is installed;
- the SQLite provider is configured;
- identified vulnerable dependencies were investigated and updated.
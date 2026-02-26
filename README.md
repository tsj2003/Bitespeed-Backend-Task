# Bitespeed Identity Reconciliation

This is my solution for the Bitespeed backend task. The idea behind it is pretty straightforward - customers can place orders with different email/phone combinations, and this service figures out that they're actually the same person and links them together.

## What I used

- **Node.js + TypeScript** for the backend
- **Express** for routing
- **TypeORM** for database stuff
- **PostgreSQL** in production, **SQLite** locally for quick testing

## Project structure

```
src/
  entity/Contact.ts         - the Contact table definition
  config/database.ts        - db connection config
  services/contact.service.ts - the main linking/merging logic
  routes/identify.ts        - POST /identify handler
  index.ts                  - app entry point
```

## How the linking logic works

Every request to `/identify` sends an email and/or phone number. The service checks what's already in the database and handles it based on what it finds:

- If there's no matching email or phone at all, it creates a new primary contact.
- If it finds a match on one of them (say the phone exists but the email is new), it creates a new secondary contact linked to the existing primary.
- If both already exist under the same primary, nothing new gets created -- it just returns the consolidated info.
- If the email belongs to one primary and the phone belongs to a different primary, that means they're actually the same person. The older primary keeps its status, the newer one gets turned into a secondary, and all its linked contacts move over too.

## The Contact table

| Field | Type | Notes |
|-------|------|-------|
| id | Int | Auto-increment PK |
| phoneNumber | String? | Can be null |
| email | String? | Can be null |
| linkedId | Int? | Points to another Contact's id |
| linkPrecedence | "primary" \| "secondary" | |
| createdAt | DateTime | Auto-set |
| updatedAt | DateTime | Auto-set |
| deletedAt | DateTime? | Soft delete |

## API

### POST `/identify`

Send a JSON body like:
```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

Both fields are optional but you need at least one of them.

Response:
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

The primary contact's email and phone always come first in their arrays.

## How to run locally

```bash
git clone https://github.com/tsj2003/Bitespeed-Backend-Task.git
cd bitespeed-identity-reconciliation
npm install
npm run build
npm start
```

Starts on port 3000. Change it with `PORT` env variable if needed.

For development:
```bash
npm run dev
```

## Deployed endpoint

Hosted on Render with a PostgreSQL database.

**Base URL:** `https://bitespeed-identity-2fna.onrender.com`

Hit `https://bitespeed-identity-2fna.onrender.com/identify` with a POST request to test it out.

The `DATABASE_URL` env var is set automatically when you attach a Postgres instance on Render.

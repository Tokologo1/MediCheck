# 🏥 MediCheck

A secure web application to check medication availability across dispensaries in real-time. Built with Next.js 15, PostgreSQL, Prisma, JWT authentication, and strong security practices.

## ✨ Features

### For Users
- 🔐 **Secure Authentication** — Register/Login with JWT + bcrypt-hashed passwords
- 🔍 **Real-Time Medication Search** — Search across all partner dispensaries
- 📦 **Live Stock Tracking** — See stock levels, prices, and dispensary details
- 🏪 **Dispensary Info** — Address, operating hours, phone numbers
- 📊 **Dashboard** — Overview of available medications and dispensaries

### For Admins
- 🛡️ **Admin Panel** — Manage medications, dispensaries, and inventory
- 💊 **Medication CRUD** — Add, edit, delete medications
- 🏥 **Dispensary Management** — Manage partner dispensaries
- 📈 **Dashboard Stats** — Overview of system data

## 🔒 Security Features

| Feature | Implementation |
|---|---|
| Password Hashing | bcrypt (12 salt rounds) |
| Authentication | JWT access (15min) + refresh (7d) tokens in httpOnly cookies |
| CSRF Protection | Double-submit cookie pattern |
| Rate Limiting | Login: 5/15min, Search: 30/15min, Register: 3/15min |
| Input Validation | Zod schemas on all API inputs |
| SQL Injection Prevention | Prisma ORM (parameterized queries) |
| XSS Protection | React auto-escaping + CSP headers |
| Security Headers | HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| Role-Based Access | USER / ADMIN roles enforced in middleware + API |

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes (Route Handlers)
- **Database**: PostgreSQL 16 + Prisma ORM
- **Auth**: JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`)
- **Validation**: Zod
- **Icons**: Lucide React
- **Containerization**: Docker + Docker Compose

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Copy environment file
cp .env.example .env.local

# 2. Build and start containers
docker-compose up --build

# 3. In a new terminal, set up the database
docker exec medicheck-web npx prisma db push
docker exec medicheck-web npm run db:seed
```

App runs at **http://localhost:3000**

### Option 2: Local Development

#### Prerequisites
- Node.js 20+
- PostgreSQL 16+ (or Docker just for the DB)

#### Steps

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL (option A: standalone, option B: Docker)
# Option B - just the database:
docker-compose up db -d

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your database URL and JWT secrets

# 4. Push schema and seed database
npm run db:setup

# 5. Start development server
npm run dev
```

App runs at **http://localhost:3000**

## 📝 Demo Credentials

After seeding the database, you can log in with:

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@medicheck.com | Admin@123 |
| **User** | john@example.com | User@123 |

## 📁 Project Structure

```
medicheck/
├── docker-compose.yml          # PostgreSQL + Next.js containers
├── Dockerfile                  # Multi-stage production build
├── prisma/
│   ├── schema.prisma           # Database models (User, Dispensary, Medication, Inventory)
│   └── seed.ts                 # Seed data
├── src/
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── (auth)/             # Login & Register pages
│   │   ├── (dashboard)/        # User dashboard & search
│   │   ├── admin/              # Admin panel
│   │   └── api/                # REST API routes
│   ├── components/             # Reusable UI components
│   ├── lib/                    # Utilities (prisma, jwt, auth, validators)
│   ├── middleware.ts           # Security headers, CSRF, route protection
│   └── types/                  # TypeScript definitions
```

## 🗄️ Database Schema

- **User** — Authentication & roles (USER / ADMIN)
- **Dispensary** — Partner pharmacies with location data
- **Medication** — Drug catalog with categories and prescription flags
- **Inventory** — Junction table linking medications to dispensaries with stock levels

## 🧪 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:setup` | Push schema + seed database |
| `npm run db:push` | Push schema changes to DB |
| `npm run db:seed` | Seed sample data |
| `npm run db:generate` | Regenerate Prisma client |

## ⚠️ Production Notes

1. **Change JWT secrets** — Generate strong random strings for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
2. **Use HTTPS** — Set `NODE_ENV=production` to enable HSTS and secure cookies
3. **Use Redis for rate limiting** — The in-memory limiter resets on restart and doesn't share state across instances
4. **Set up proper logging** — Configure a log aggregation service
5. **Database backups** — Set up automated PostgreSQL backups

## 📜 License

This project is for educational/demonstration purposes.

## Branch workflow

See [BRANCHING.md](BRANCHING.md) for pull-request flow: short-lived feature branches, `dev` integration, then protected `main` production releases.

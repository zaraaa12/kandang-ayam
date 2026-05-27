# Login System Setup Guide

## Overview

The login system has been successfully connected to the PostgreSQL database. Users are now authenticated against the `users` table instead of hardcoded credentials.

## Database Schema

### Users Table

```sql
create table if not exists users (
  id serial primary key,
  username text not null unique,
  password text not null,
  name text not null,
  role text not null check (role in ('Admin', 'Karyawan', 'Farm Manager')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Default Users

Three default users are created during database initialization:

| Username | Password     | Name           | Role         |
|----------|--------------|----------------|--------------|
| admin    | kandang2025  | Admin Kandang  | Admin        |
| warist   | warist123    | Warist         | Karyawan     |
| manager  | manager2025  | Farm Manager   | Farm Manager |

## API Endpoint

### POST `/api/auth/login`

Authenticates a user against the database.

**Request Body:**
```json
{
  "username": "admin",
  "password": "kandang2025"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "username": "admin",
    "name": "Admin Kandang",
    "role": "Admin"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Username atau password salah. Coba lagi."
}
```

## Implementation Details

### Files Modified/Created

1. **`database/schema.sql`** - Added users table schema
2. **`lib/db.ts`** - Updated `initDatabase()` to include users table
3. **`app/api/auth/login/route.ts`** - New API route for authentication
4. **`app/login/page.tsx`** - Updated to use API instead of hardcoded credentials
5. **`scripts/init-db.ts`** - Updated to show users table in initialization output

### Authentication Flow

1. User enters credentials on login page
2. Frontend sends POST request to `/api/auth/login`
3. API queries database for user with matching username
4. API validates password (plain text comparison)
5. On success, API returns user data (excluding password)
6. Frontend sets authentication cookie
7. Middleware validates cookie on protected routes

### Cookie-Based Session

The system uses cookie-based sessions:
- Cookie name: `fc_auth`
- Contains: `{ username, name, role }`
- Session expires when browser closes
- Middleware checks cookie on protected routes

## Testing

### Manual Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/login`

3. Test with default credentials:
   - Username: `admin`, Password: `kandang2025`
   - Username: `warist`, Password: `warist123`
   - Username: `manager`, Password: `manager2025`

### API Testing

Test the login API directly:

```powershell
# Success case
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body '{"username":"admin","password":"kandang2025"}' -ContentType "application/json"

# Error case
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body '{"username":"admin","password":"wrong"}' -ContentType "application/json"
```

## Security Notes

⚠️ **IMPORTANT**: This implementation uses plain text passwords for demonstration purposes. For production use, you should:

1. **Hash passwords** using bcrypt or similar library
2. **Use HTTPS** in production
3. **Implement rate limiting** to prevent brute force attacks
4. **Add CSRF protection**
5. **Use secure session management** (consider NextAuth.js or similar)

### Recommended Improvements

```typescript
// Example: Using bcrypt for password hashing
import bcrypt from 'bcryptjs'

// Hash password before storing
const hashedPassword = await bcrypt.hash(plainPassword, 12)

// Compare password during login
const isValid = await bcrypt.compare(plainPassword, hashedPassword)
```

## Database Initialization

To set up the database with the users table:

```bash
npm run init-db
```

This will:
- Create all database tables including `users`
- Insert default users
- Display success message with credentials

## Troubleshooting

### Connection Issues

If you see database connection errors:
1. Check `DATABASE_URL` in `.env.local`
2. Verify Supabase project is running
3. Ensure network connectivity to Supabase

### Login Not Working

1. Verify database is initialized: `npm run init-db`
2. Check API endpoint is responding
3. Review browser console for errors
4. Check server logs for database errors

### Middleware Issues

If redirected to login unexpectedly:
1. Check cookie is set correctly
2. Verify middleware configuration in `middleware.ts`
3. Clear browser cookies and try again

## Future Enhancements

Consider implementing:
- [ ] Password reset functionality
- [ ] Email verification
- [ ] Two-factor authentication (2FA)
- [ ] Password strength requirements
- [ ] Account lockout after failed attempts
- [ ] Session timeout
- [ ] Remember me functionality
- [ ] User management admin panel
# Split Payment App

A backend API for managing group expenses, splitting payments, and settlements.

## Features
- User registration and login (JWT, bcrypt, 2FA/OTP)
- Group management (CRUD, roles, activity log, budget limits)
- Expense tracking and split logic (equal, unequal, shares, exact)
- Real-time balance calculation and optimization (who owes whom, minimal settlements)
- Manual and partial settlements
- File upload for receipts (Multer)
- Comments/emoji reactions on expenses
- Automatic locking of expenses after 7 days
- Monthly group summary (spending, top contributors)
- Filter/search expenses by category, date, amount
- Budget limit alerts
- Export expenses to CSV

## Tech Stack
- Node.js, Express.js
- MongoDB (Mongoose)
- JWT, bcrypt

## Getting Started
1. Clone the repo
2. Run `npm install`
3. Set up your `.env` file (see example below)
4. Run `npm start`

## Example .env
```
MONGO_URI=mongodb://localhost:27017/splitpayment
JWT_SECRET=your_jwt_secret
PORT=5000
```

## Authentication
All endpoints (except `/api/auth/register` and `/api/auth/login`) require a valid JWT token in the `Authorization` header as `Bearer <token>`.

## API Endpoints

### Auth
- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login user (returns OTP)
- `POST /api/auth/verify-otp` — Verify OTP and get JWT
- `GET /api/auth/me` — Get current user (auth required)

### Groups
- `POST /api/groups` — Create group (auth required)
- `GET /api/groups` — List user groups (auth required)
- `PUT /api/groups/:id` — Update group (auth required, admin only, can set budgetLimit)
- `DELETE /api/groups/:id` — Delete group (auth required, admin only)
- `POST /api/groups/:id/add-member` — Add member (auth required, admin only)
- `POST /api/groups/:id/remove-member` — Remove member (auth required, admin only)

### Expenses
- `POST /api/expenses` — Add expense (auth required, supports receipt upload)
- `GET /api/expenses/:groupId` — List group expenses (auth required, supports filters)
- `GET /api/expenses/:groupId/balances` — Get group balances (who owes whom)
- `GET /api/expenses/:groupId/optimize` — Get minimal settlements
- `POST /api/expenses/:expenseId/comment` — Add comment (text/emoji) to an expense (auth required)
- `POST /api/expenses/settle` — Record manual/partial settlement
- `GET /api/expenses/:groupId/summary?year=YYYY&month=M` — Monthly summary
- `GET /api/expenses/:groupId/export` — Export expenses as CSV

## Example Requests

> **Note:** In all sample requests, replace `12345` with your actual group ID, `abc.def.ghi` with your JWT token, and user IDs (like `u1`, `u2`) with real user IDs from your database. Replace file paths with actual paths on your system.

### Register
```http
POST /api/auth/register
Content-Type: application/json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "password123"
}
```

### Login (Step 1: Get OTP)
```http
POST /api/auth/login
Content-Type: application/json
{
  "email": "alice@example.com",
  "password": "password123"
}
```

### Verify OTP (Step 2: Get JWT)
```http
POST /api/auth/verify-otp
Content-Type: application/json
{
  "userId": "<user_id>",
  "otp": "123456"
}
```

### Add Expense with Receipt Upload
```sh
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer abc.def.ghi" \
  -F "groupId=12345" \
  -F "payer=u1" \
  -F "amount=100" \
  -F "category=Food" \
  -F "description=Lunch" \
  -F "splitType=equal" \
  -F "splits[0][user]=u1" \
  -F "splits[0][amount]=50" \
  -F "splits[1][user]=u2" \
  -F "splits[1][amount]=50" \
  -F "receipt=@C:/Users/you/Pictures/receipt.jpg"
```

### Add Comment to Expense
```http
POST /api/expenses/<expenseId>/comment
Authorization: Bearer abc.def.ghi
Content-Type: application/json
{
  "text": "Great dinner!",
  "emoji": "🍕"
}
```

### Get Group Balances
```sh
curl -X GET "http://localhost:5000/api/expenses/12345/balances" \
  -H "Authorization: Bearer abc.def.ghi"
```

### Optimize Debts (Minimal Settlements)
```sh
curl -X GET "http://localhost:5000/api/expenses/12345/optimize" \
  -H "Authorization: Bearer abc.def.ghi"
```

### Record Manual/Partial Settlement
```sh
curl -X POST http://localhost:5000/api/expenses/settle \
  -H "Authorization: Bearer abc.def.ghi" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "12345",
    "from": "u1",
    "to": "u2",
    "amount": 40,
    "note": "Partial payment for dinner"
  }'
```

### Monthly Group Summary
```sh
curl -X GET "http://localhost:5000/api/expenses/12345/summary?year=2025&month=6" \
  -H "Authorization: Bearer abc.def.ghi"
```

### Filter/Search Expenses
```sh
curl -X GET "http://localhost:5000/api/expenses/12345?category=Food&minAmount=50&startDate=2025-06-01" \
  -H "Authorization: Bearer abc.def.ghi"
```

### Export Expenses to CSV
```sh
curl -X GET "http://localhost:5000/api/expenses/12345/export" \
  -H "Authorization: Bearer abc.def.ghi" \
  -o expenses.csv
```

## Advanced Features
- Expenses lock automatically after 7 days (no further comments/edits allowed)
- Comments on expenses (text and emoji supported)
- Budget limit alerts when adding expenses
- Export expenses to CSV
- 2FA/OTP login flow

## Error Handling
- Returns standard HTTP status codes (400, 401, 403, 404, 500)
- Error messages are returned as `{ "message": "..." }`

## Deployment (Docker)

### Build and Run with Docker

```sh
# Build the Docker image
# (Run this from the project root)
docker build -t split-payment-app .

# Run the container (default port 5000)
docker run -d -p 5000:5000 --env-file split-payment/.env split-payment-app
```

- Make sure your `.env` file is set up and accessible to Docker (see example above).
- The app will be available at `http://localhost:5000` by default.

### Deploying to Render or Railway
- Create a new web service and connect your GitHub repo.
- Set environment variables in the platform dashboard (do not commit secrets).
- Use the Dockerfile for deployment, or let the platform auto-detect Node.js if preferred.
- For MongoDB, use a managed database service and update your `mongodb://localhost:27017/splitpayment`.

## License
MIT

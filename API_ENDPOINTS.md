# API Endpoints Documentation

## Base URL
`http://localhost:5000/api`

## Authentication (`/auth`)
* `POST /auth/register` - Creates a new Organization and Admin user.
* `POST /auth/login` - Authenticates user and returns JWT + Refresh Token.
* `POST /auth/google` - Verifies Google idToken and logs in (or creates) user.
* `POST /auth/refresh` - Issues a new JWT using a valid Refresh Token.

## Invites (`/invites`)
* `GET /invites/:token` - (Open) Verifies an invitation token and returns Org details.
* `POST /invites/accept` - (Open) Consumes a token and registers a new MEMBER.
* `POST /invites` - (Admin Only) Generates a secure invitation token for a provided email.

## Tasks (`/tasks`)
* `GET /tasks` - Fetch tasks. Supports `?status=...&priority=...&limit=20&offset=0`. Multi-tenant & RBAC isolated natively.
* `POST /tasks` - Create task. Admins can assign to anyone; Members assign to themselves.
* `PUT /tasks/:id` - Update task attributes safely.
* `DELETE /tasks/:id` - Logically soft-delete a task.

## Dashboard (`/dashboard`)
* `GET /dashboard/stats` - Returns aggregated Task stats and per-user performance arrays.

## Notifications (`/notifications`)
* `GET /notifications` - Returns the authenticated user's audit log/system notifications.
* `PUT /notifications/:id/read` - Marks a notification as read.

## Activity Logs (`/logs`)
* `GET /logs` - Returns paginated activity log. Admin sees all events in the organization; Members see events specifically bound to their workloads.

# Admin Panel Documentation

## Overview
The admin panel is a comprehensive management dashboard for the Upwork-like platform. It provides administrators with tools to manage users, projects, and view platform analytics.

## Features

### 1. Dashboard
- **Real-time Statistics**: View total users, projects, applications, and messages
- **User Overview**: Break down between clients and companies
- **Active Projects**: Track open and completed projects
- **Recent Activity**: View latest users and projects in the system

### 2. User Management
- **Search & Filter**: Find users by name, email, or filter by role (Client/Company)
- **Pagination**: Navigate through user lists efficiently
- **User Status**: View and manage user activity status
- **Block/Unblock**: Suspend user accounts with custom reasons
- **Delete**: Remove users from the platform
- **User Details**: Access individual user profiles and statistics

### 3. Project Management
- **Project Catalog**: View all projects on the platform
- **Search & Filter**: Find projects by title or filter by status
- **Status Control**: Update project status (Open, In Progress, Closed)
- **Admin Notes**: Add reasons/notes for status changes
- **Delete Projects**: Remove inappropriate or duplicate projects
- **Project Details**: View budget, deadline, and posted by information

### 4. Reports & Analytics
- **User Growth**: 30-day user registration trends
- **Project Growth**: 30-day project posting trends
- **Category Analytics**: View most popular project categories
- **Visual Charts**: Bar charts and percentage breakdowns
- **Export Reports**: Print reports for documentation

### 5. Admin Profile
- **Profile View**: See logged-in admin information
- **Secure Logout**: End session safely

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Backend running on http://localhost:5000
- MongoDB connection configured

### Installation Steps

1. **Navigate to admin-app directory**:
```bash
cd admin-app
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start the admin panel**:
```bash
npm start
```

The admin panel will open at `http://localhost:3002`

## Default Admin Credentials

### Super Admin Account
- **Email**: admin@upwork.com
- **Password**: Admin@123456
- **Role**: super_admin
- **Permissions**: All (full access)

### Moderator Account
- **Email**: moderator@upwork.com
- **Password**: Moderator@123
- **Role**: moderator
- **Permissions**: Manage users, projects, disputes

## Role & Permission System

### Super Admin
- Manage all users
- Manage all projects
- Handle disputes and complaints
- View all analytics and reports
- Access system settings
- Manage transactions

### Moderator
- Manage users (block/unblock)
- Approve/reject projects
- Handle disputes
- Cannot access system settings
- Cannot view financial reports

### Analyst
- View reports and analytics
- Cannot manage users or projects
- Read-only access

## API Integration

The admin panel communicates with the backend via REST APIs:

### Authentication
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/auth/profile` - Get admin profile
- `POST /api/admin/auth/logout` - Logout

### Dashboard
- `GET /api/admin/dashboard` - Fetch dashboard statistics

### User Management
- `GET /api/admin/users` - Get users list with pagination
- `GET /api/admin/users/:userId` - Get user details
- `PUT /api/admin/users/:userId/status` - Block/unblock user
- `DELETE /api/admin/users/:userId` - Delete user

### Project Management
- `GET /api/admin/projects` - Get projects list
- `PUT /api/admin/projects/:projectId/status` - Update project status
- `DELETE /api/admin/projects/:projectId` - Delete project

### Reports
- `GET /api/admin/reports` - Get platform reports and analytics

## Security Best Practices

1. **Strong Passwords**: Use complex passwords for admin accounts
2. **Regular Updates**: Keep credentials updated
3. **Session Management**: Admin sessions timeout after 24 hours
4. **Activity Logging**: All admin actions are logged
5. **Token-based Auth**: Uses JWT for secure authentication

## Troubleshooting

### Port Already in Use
If port 3002 is already in use:
```bash
npm start -- --port 3003
```

### Backend Connection Issues
- Ensure backend server is running on http://localhost:5000
- Check MongoDB connection
- Verify API routes are properly configured

### Module Not Found
```bash
npm install --legacy-peer-deps
```

### Clear Cache & Reinstall
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm start
```

## Project Structure

```
admin-app/
├── src/
│   ├── components/          # Reusable components
│   │   ├── Navbar.js
│   │   ├── Navbar.css
│   │   └── PrivateRoute.js
│   ├── context/            # React context for state management
│   │   └── AdminContext.js
│   ├── pages/              # Page components
│   │   ├── Login.js
│   │   ├── Dashboard.js
│   │   ├── Users.js
│   │   ├── Projects.js
│   │   ├── Reports.js
│   │   └── *.css           # Page styles
│   ├── utils/              # Utility functions
│   │   └── api.js          # API calls
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── public/
│   └── index.html
├── package.json
└── .gitignore
```

## Future Enhancements

- [ ] Two-factor authentication
- [ ] Email notifications for admin actions
- [ ] Advanced filtering and sorting
- [ ] Data export to CSV/Excel
- [ ] Real-time notifications via WebSocket
- [ ] Admin action audit logs
- [ ] Custom report builder
- [ ] Payment/Transaction management
- [ ] Dispute resolution system
- [ ] Automated moderation rules

## Support

For issues or questions:
1. Check the backend server logs
2. Verify API connectivity
3. Review admin credentials
4. Check browser console for errors

## License

ISC

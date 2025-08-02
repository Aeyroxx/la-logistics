# L&A Logistic Services

A comprehensive logistics management system for tracking parcels and managing employees with automated PDF/Excel report generation.

## Features

- **User Authentication**: Secure login system with role-based access (Admin/Employee)
- **Admin Panel**: Employee account management and system administration
- **Parcel Tracking**: Track dropped off parcels with courier-specific pricing
- **Automated Reports**: Generate PDF and Excel reports with date filtering
- **Dashboard**: Interactive dashboard with summary statistics
- **Date Filtering**: View data by day, week, month, or year

## Courier Pricing System

### SPX Courier
- **0-100 parcels per Seller ID per day**: ₱0.5 each + ₱1 bonus if picked up same day
- **100+ parcels per Seller ID per day**: ₱1 each + ₱1 bonus if picked up same day

### Flash Courier
- **Maximum 30 parcels per Seller ID per day**: ₱3 each (regardless of pickup timing)

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Authentication**: JWT
- **Export**: jsPDF, ExcelJS

## Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development servers**:
   ```bash
   # Start both frontend and backend
   npm run dev:full
   
   # Or start them separately:
   # Frontend only
   npm run dev
   
   # Backend only
   npm run backend
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Default Credentials

**Admin Account**:
- Email: `admin@lalogistics.com`
- Password: `admin123`

## Usage

### Admin Functions
1. Login with admin credentials
2. Navigate to Admin Panel
3. Create employee accounts
4. Monitor system usage

### Employee Functions
1. Login with employee credentials
2. Add parcel entries with required fields:
   - Task ID
   - Seller ID
   - Courier (SPX/Flash)
   - Quantity
   - Date
   - Pickup status (SPX only)
3. View dashboard with earnings summary
4. Export reports in PDF/Excel format
5. Filter data by time periods

### Data Fields
- **Task ID**: Unique identifier for each task
- **Seller ID**: Identifier for the seller
- **Courier**: SPX or Flash delivery service
- **Amount/Quantity**: Number of parcels
- **Total Earning per day**: Automatically calculated based on courier pricing
- **Pickup Status**: Whether parcels were picked up same day (SPX only)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Admin
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create new user
- `DELETE /api/admin/users/:id` - Delete user

### Parcels
- `GET /api/parcels` - Get parcels with filtering
- `POST /api/parcels` - Create new parcel entry

### Export
- `GET /api/export/pdf` - Export PDF report
- `GET /api/export/excel` - Export Excel report

## Development

### Project Structure
```
├── src/
│   ├── app/
│   │   ├── admin/          # Admin panel
│   │   ├── dashboard/      # Employee dashboard
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Login page
├── backend/
│   └── server.js           # Express server
├── .github/
│   └── copilot-instructions.md
└── package.json
```

### Database Schema

**Users Table**:
- id, name, email, password, role, created_at

**Parcels Table**:
- id, task_id, seller_id, courier, quantity, picked_up_same_day, date, total_earning, user_id, created_at

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software for L&A Logistic Services.

## Support

For technical support or questions, please contact the development team.

---

**Made with ❤️ by aewon.sebastian**

*Professional logistics management solution designed for efficiency and growth.*

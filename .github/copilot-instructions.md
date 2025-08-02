# Copilot Instructions for L&A Logistic Services

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a full-stack logistics management application for L&A Logistic Services with the following key features:

## Project Architecture
- Frontend: Next.js with TypeScript and Tailwind CSS
- Backend: Node.js with Express
- Database: SQLite for local development
- Authentication: JWT-based auth system
- File Export: PDF and Excel generation capabilities

## Key Features
1. User Authentication System (Admin and Employee roles)
2. Admin Panel for Employee Management
3. Parcel Tracking System with Courier-specific Pricing
4. Automated PDF/Excel Report Generation
5. Date-based Filtering (Day/Week/Month/Year)
6. Dashboard with Summary Views
7. Admin-only Entry Deletion (for data management)

## Courier Pricing Logic
### SPX Courier (Updated based on official memo):
- **Order Cap**: Only first 100 parcels per Shop ID per day are eligible for incentives
- **Base Rate (Guaranteed)**: ₱0.50 per parcel for incentivized parcels
- **Bonus Rate (SLA Compliance)**: ₱0.50 per parcel for incentivized parcels (if picked up same day)
- **Total possible earning per Shop ID**: ₱1.00 per parcel (Base + Bonus) for up to 100 parcels
- **Example**: 150 parcels with same-day pickup = (100 × ₱0.50) + (100 × ₱0.50) = ₱100.00

### Flash Courier:
- Maximum 30 parcels per Seller ID per day: ₱3 each (regardless of pickup timing)

## Data Fields
- Task ID
- Seller ID
- Courier (Flash or SPX)
- Amount/Quantity
- Total Earning per day
- Pickup Status (for SPX bonus calculation)

## Code Style Guidelines
- Use TypeScript for type safety
- Follow Next.js App Router conventions
- Use Tailwind CSS for styling
- Implement proper error handling
- Include proper loading states
- Use server components where appropriate
- Implement proper data validation

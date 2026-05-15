# UI Wireframes Description

## 1. Login Page
- Centered card with form fields
- Fields: Email/Username, Password
- Buttons: Login, Forgot Password?
- Links: Register as new user (redirects to registration)
- Responsive: Stacked on mobile, side-by-side on desktop (with background image)

## 2. Admin Dashboard
- Sidebar navigation (collapsible on mobile)
- Header with user profile and notifications icon
- Main content area with widgets:
  * Fleet Overview: Total vehicles, active, under maintenance
  * Transport Overview: Trips today, completed, pending
  * Maintenance Overview: Tasks scheduled, in progress
  * Recent Activity: Log of recent trips and maintenance
- Quick action buttons: Add Vehicle, Schedule Trip, Log Maintenance

## 3. Vehicles Management (Admin/Mechanic)
- Search and filter bar (by status, type, license plate)
- Table of vehicles with columns: License Plate, Make/Model, Status, Capacity, Last Service, Actions
- Actions: Edit, View Details, Schedule Maintenance
- Add Vehicle button (top right)
- Vehicle detail modal/form with all fields from schema

## 4. Trip Management
- Calendar view (week/month) and list view toggle
- Filter by date, driver, vehicle, status
- Table/List of trips with: Date, Route, Vehicle, Driver, Status, Actions
- Actions: Edit, Assign Driver/Vehicle, Mark as Completed/Cancelled
- Schedule Trip form: Farm selection, route details, vehicle/driver assignment, date/time

## 5. Driver Management
- Table of drivers with: Name, License Number, License Expiry, Hire Date, Status, Actions
- Actions: Edit, View Profile, Assign to Trip
- Driver profile shows: License details, trip history, performance metrics

## 6. Mechanic Management (similar to Driver)
- Table of mechanics with: Name, Specialization, Certification, Hire Date, Status, Actions
- Actions: Edit, View Profile, Assign to Maintenance Task

## 7. Maintenance Tasks
- Calendar and list view
- Filter by date, vehicle, mechanic, status
- Table with: Date, Vehicle, Task Type, Assigned Mechanic, Status, Actions
- Actions: Edit, Start Task, Complete Task, Log Parts Used
- Schedule Maintenance form: Vehicle selection, task type, description, scheduled date, parts estimation

## 8. Staff Dashboard (Driver/Mechanic)
- Sidebar with limited navigation (based on role)
- Header with notifications
- Main content:
  * For Driver: Today's trips, upcoming trips, trip history
  * For Mechanic: Today's tasks, upcoming maintenance, task history
- Each item shows status and allows updating (start, complete, report issues)

## 9. Farm/Client Portal (Optional)
- Login page for farm clients
- Dashboard showing: Active transport requests, maintenance requests, history
- Request Transport form: Date, pickup/drop-off locations, number of workers
- Request Maintenance form: Vehicle details, issue description, preferred date
- Track status of requests

## 10. Notifications Panel
- Dropdown or page showing list of notifications
- Each notification: Title, time, mark as read button
- Types: Trip assigned, maintenance scheduled, task update, vehicle breakdown alert

## 11. Reports Section (Admin)
- Date range selector
- Report type selector (transport, maintenance, staff, financial)
- Charts and tables displaying data
- Export options (CSV, PDF)

## Responsive Design Notes
- Mobile: Sidebar collapses to hamburger menu, cards stack vertically
- Tablet: Sidebar may remain icons-only, main content adapts
- Desktop: Full sidebar with text labels

## Color Scheme (Suggested)
- Primary: Blue (#2563EB) for trust and professionalism
- Secondary: Green (#10B981) for success/status
- Warning: Amber (#F59E0B) for maintenance alerts
- Danger: Red (#EF4444) for critical issues
- Neutral: Gray palette for background and text

## Typography
- Headings: Sans-serif (e.g., Inter, Roboto)
- Body: Sans-serif for readability
- Monospace for codes/IDs where needed

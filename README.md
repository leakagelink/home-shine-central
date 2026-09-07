# Home Sparkle

Build a complete, modern, premium, responsive Home Cleaning Service Booking application with three user roles: Customer, Partner, and Admin.

The app must have a clean, attractive, high-conversion UI similar to modern service marketplaces. Use a premium design system, smooth micro-interactions, responsive layouts, optimized images, fast loading, and mobile-first UX.

IMPORTANT: Build this as a production-ready architecture foundation. Do NOT use fake payment success, fake authentication security, or fake production security flows.

====================================================
APP STRUCTURE

Create three role-based dashboards:

Customer

Partner

Admin

Use strict role-based access control.

====================================================
LOGIN SCREEN

The login screen must display EXACTLY these 3 roles:

Customer

Partner

Admin

Do not add any additional roles.

CUSTOMER LOGIN:

First-time login using Mobile Number + OTP.

After successful OTP verification, require the customer to create a secure numeric PIN.

PIN confirmation required.

Future login should allow secure PIN login.

Include forgot/reset PIN flow using OTP verification.

PIN must NEVER be stored as plain text.

Use secure server-side authentication architecture.

PARTNER LOGIN:

Secure PIN login.

Forgot/reset PIN flow with secure verification.

Role authorization required.

ADMIN LOGIN:

Secure PIN login.

Strong role authorization.

Admin routes must never be accessible to customers or partners.

Add:

OTP expiry

OTP resend timer

OTP rate limiting

PIN attempt rate limiting

Session expiry

Secure logout

====================================================
CUSTOMER DASHBOARD

The Customer Dashboard must have EXACTLY these 5 main options:

Bathroom

Kitchen

Flat

Other

Account

Do not add additional main dashboard categories.

Use attractive cards/icons and a premium modern layout.

====================================================

BATHROOM SERVICES
====================================================

Display the following services and prices EXACTLY:

Bathroom Intense (1) — ₹450
Bathroom Intense (2) — ₹850
Bathroom Intense (3) — ₹1250

Move In Cleaning (1) — ₹550
Move In Cleaning (2) — ₹950
Move In Cleaning (3) — ₹1350

Hard Water Cleaning (1) — ₹700
Hard Water Cleaning (2) — ₹1250
Hard Water Cleaning (3) — ₹1500

Glass Cleaning — ₹200

Create an intuitive service selection experience.

Allow:

Service selection

Quantity selection where applicable

Price summary

Relevant add-ons

Special instructions

====================================================
2. KITCHEN SERVICES

Display the following prices EXACTLY:

Kitchen Base — ₹1300
Upper Cabinet — ₹200
Trolley — ₹300

Allow users to select combinations where appropriate.

Show:

Selected services

Quantity

Add-ons

Total price calculation

Booking summary

====================================================
3. FLAT SERVICES

Display the following services and prices EXACTLY:

1BHK Flat Cleaning — ₹3500
2BHK Flat Cleaning — ₹5000
3BHK Flat Cleaning — ₹7000
4BHK Flat Cleaning — ₹9200

Each service page should clearly display:

Service name

Price

What's included

Add-ons

Booking button

====================================================
4. OTHER SERVICES

Display the following services and prices EXACTLY:

Balcony Small — ₹500
Balcony Big — ₹700
Fan Cleaning — ₹65
Bathroom Exhaust — ₹70
Kitchen Exhaust — ₹90
Windows — ₹300
Glass Doors — ₹450

Allow multiple services to be added to the same booking.

====================================================
BOOKING FLOW

Implement a complete professional home-cleaning booking experience.

Booking flow:

Select Category

Select Service

Select Quantity / Add-ons

Review Price Summary

Select or Add Address

Select Date

Select Available Time Slot

Add Special Instructions

Booking Review

Payment

Server Payment Verification

Booking Confirmation

Address management should include:

Add address

Edit address

Delete address

Set default address

House/Flat number

Building

Street

Landmark

Area

City

State

Pincode

Do not require continuous GPS tracking.

Location access should only be requested when genuinely necessary.

====================================================
CUSTOMER FEATURES

Inside the relevant sections, implement:

Service Selection

Add-ons

Address Management

Date Selection

Time Slot Selection

Booking Confirmation

Booking History

Upcoming Bookings

Completed Bookings

Cancelled Bookings

Booking Cancellation

Booking Rescheduling

Cancellation Status

Refund Status

Download/View Invoice

Notifications

Customer Support

Help & FAQ

Ratings & Reviews

Offers

Coupons

Profile Management

Saved Addresses

Payment History

====================================================
ACCOUNT SECTION

The Account section should contain:

Profile

Mobile Number

Saved Addresses

Booking History

Invoices

Offers & Coupons

Notifications

Support

Ratings & Reviews

Privacy

Security

Change/Reset PIN

Logout

Maintain Account as one of the EXACT 5 main Customer Dashboard options.

====================================================
PARTNER DASHBOARD

Create a separate Partner Dashboard optimized for service professionals.

Partner features:

Assigned Bookings

Booking Details

Accept Booking

Reject Booking

Customer Address

Customer Contact Controls

Scheduled Date & Time

Navigation / Open Map only when needed

Job Status Updates

Job statuses:

Assigned

Accepted

Rejected

On The Way

Arrived

Work Started

Work Completed

Cancelled

Partner must be able to upload:

Before Cleaning Photos

After Cleaning Photos

Images should be compressed and optimized before upload.

Partner Earnings section:

Total Earnings

Pending Earnings

Available Balance

Commission Details

Completed Jobs

Earnings History

Partner Withdrawal section:

Withdrawal Request

Withdrawal Status

Withdrawal History

Payout History

Do not implement fake payouts.

Structure the architecture so a real payout system can be integrated before production release.

====================================================
ADMIN DASHBOARD

Create a powerful responsive Admin Dashboard.

Admin features:

CUSTOMERS

Customer List

Customer Details

Booking History

Account Status

PARTNERS

Partner List

Partner Profile

Partner Status

Performance

KYC

Pending KYC

Approved KYC

Rejected KYC

KYC Review

Document Status

BOOKINGS

All Bookings

Upcoming

Assigned

In Progress

Completed

Cancelled

Rescheduled

SERVICES & PRICING

Manage Services

Manage Service Availability

Manage Add-ons

Manage Prices

PAYMENTS

Payment Records

Payment Status

Payment Verification Status

REFUNDS

Refund Requests

Approved Refunds

Rejected Refunds

Refund Status

COMMISSIONS

Partner Commission Rules

Commission History

WITHDRAWALS

Pending Withdrawals

Approved Withdrawals

Rejected Withdrawals

Payout History

COUPONS

Create Coupon

Edit Coupon

Expiry Date

Usage Limit

Discount Rules

NOTIFICATIONS

Send Notifications

Booking Notifications

Promotional Notifications

REPORTS

Total Revenue

Booking Revenue

Completed Bookings

Cancelled Bookings

Active Customers

Active Partners

Partner Earnings

Refund Statistics

Commission Reports

Use professional analytics cards, charts and tables.

====================================================
PAYMENT ARCHITECTURE

Do NOT create fake payment success.

Prepare the system for integration with a real payment gateway.

Payment architecture requirements:

Payment order created from secure backend

Payment secret keys must NEVER exist in the Flutter/mobile application

Client receives only safe payment information

Payment completion must be verified server-side

Booking payment status must be updated only after verified backend confirmation

Handle payment failures

Handle pending payments

Handle duplicate payment callbacks safely using idempotency

Support future refunds

Use a clean Payment Service abstraction so gateways can be replaced or changed later.

====================================================
SECURITY REQUIREMENTS

Security is extremely important.

Implement architecture according to these requirements:

AUTHENTICATION:

Firebase Authentication or equivalent secure authentication

OTP authentication for Customer onboarding

Secure PIN authentication architecture

Never store PINs as plain text

PIN hashing/secure credential verification must happen securely

Secure session management

Session expiry

Secure logout

AUTHORIZATION:

Strict server-side role authorization

Customer cannot access Partner data

Customer cannot access Admin APIs

Partner cannot access Admin APIs

Users can only access their own authorized data

DATABASE SECURITY:

Protect database using authentication and authorization rules

Do not allow unrestricted public database access

Validate user ownership on sensitive records

Secure bookings, payments and personal data

API SECURITY:

All sensitive APIs require authentication

Role-based authorization middleware

Input validation

Rate limiting

OTP rate limiting

PIN login rate limiting

Abuse prevention

Secure error responses

Do not expose secrets

PAYMENT SECURITY:

Never put payment secret keys in Flutter/mobile application

Verify payments on the backend

Never trust only client-side payment success

====================================================
TECHNICAL ARCHITECTURE

Build the project with a clean architecture that can support:

Frontend:

Flutter mobile application architecture OR a clean cross-platform mobile-ready architecture depending on project environment

Backend:

Secure backend API layer

Firebase Cloud Functions, Supabase Edge Functions, Node.js/NestJS, or another secure backend abstraction

Backend must handle sensitive operations

Database:
Structure the database for:

Users

id

role

mobile number

profile details

authentication metadata

timestamps

Customer Profiles

Partner Profiles

Partner KYC

Addresses

Services

Service Categories

Add-ons

Bookings

Booking Items

Booking Status History

Payments

Refunds

Coupons

Coupon Usage

Partner Earnings

Partner Commissions

Withdrawal Requests

Payout History

Notifications

Ratings & Reviews

Support Tickets

Audit Logs for sensitive administrative actions

====================================================
BOOKING STATUS SYSTEM

Use a clear booking lifecycle:

Pending Payment
Payment Verified
Booking Confirmed
Partner Assigned
Partner Accepted
On The Way
Arrived
Work Started
Work Completed
Customer Review Pending
Completed
Cancelled
Refund Initiated
Refund Completed

Keep status transitions controlled by the backend.

====================================================
IMAGE & PERFORMANCE OPTIMIZATION

Optimize the application for:

Low battery usage

Smooth performance

Fast loading

Low network consumption

Requirements:

Compress images before upload

Generate optimized image sizes

Lazy load images

Cache appropriate API responses

Paginate booking history and admin lists

Avoid unnecessary API calls

Use efficient state management

Minimize background services

No continuous background GPS

Request location only when needed

Optimize network retries

Handle offline/poor network gracefully

====================================================
NOTIFICATIONS

Prepare notification architecture for:

Customer:

Booking Confirmation

Partner Assigned

Partner On The Way

Booking Reminder

Completion

Offers

Partner:

New Assigned Booking

Booking Changes

Withdrawal Updates

Payout Updates

Admin:

New Booking

Payment Issue

Withdrawal Request

KYC Request

Use Firebase Cloud Messaging or an equivalent notification architecture.

====================================================
UI/UX DESIGN REQUIREMENTS

Create an attractive and premium modern interface.

Design style:

Clean

Modern

Professional

Premium

Trustworthy

Home-service focused

High conversion focused

Use:

Beautiful service cards

Modern rounded components

Subtle shadows

Clean typography

Responsive spacing

Smooth transitions

Clear booking progress

Attractive empty states

Loading states

Error states

Success states

Do not overcrowd screens.

Mobile-first design is mandatory.

Also make layouts responsive for:

Android phones

iPhones

Tablets

Web Admin Dashboard

====================================================
IMPORTANT BUSINESS LOGIC

Prices must initially use EXACTLY the following values:

BATHROOM:

Bathroom Intense (1) ₹450
Bathroom Intense (2) ₹850
Bathroom Intense (3) ₹1250

Move In Cleaning (1) ₹550
Move In Cleaning (2) ₹950
Move In Cleaning (3) ₹1350

Hard Water Cleaning (1) ₹700
Hard Water Cleaning (2) ₹1250
Hard Water Cleaning (3) ₹1500

Glass Cleaning ₹200

KITCHEN:

Kitchen Base ₹1300
Upper Cabinet ₹200
Trolley ₹300

FLAT:

1BHK Flat Cleaning ₹3500
2BHK Flat Cleaning ₹5000
3BHK Flat Cleaning ₹7000
4BHK Flat Cleaning ₹9200

OTHER:

Balcony Small ₹500
Balcony Big ₹700
Fan Cleaning ₹65
Bathroom Exhaust ₹70
Kitchen Exhaust ₹90
Windows ₹300
Glass Doors ₹450

Do not modify these default prices.

====================================================
FINAL DEVELOPMENT REQUIREMENTS

Build a complete working application prototype with:

Clean component structure

Reusable UI components

Role-based routing

Responsive layouts

Proper database schema

Secure authentication architecture

Backend-ready API structure

Real payment gateway integration placeholders only where credentials are unavailable

No fake production payment confirmation

No fake security implementation

No hardcoded secrets

Proper loading states

Proper error handling

Empty states

Production-ready scalability foundation

Before release, the system must be structured so the following can be connected and configured properly:

Firebase Authentication

Secure Backend

Secure Database Rules

Real Payment Gateway

Server-side Payment Verification

Partner Payout System

Push Notifications

Production KYC System

Start by creating the complete Customer application UI and booking flow, then Partner Dashboard, then Admin Dashboard, while maintaining a shared secure data architecture and consistent design system.

The Customer Dashboard must always contain EXACTLY these 5 main options:

Bathroom
Kitchen
Flat
Other
Account

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9fe19a99-7d17-43da-a110-ad976b93dd69).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

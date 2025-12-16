# 📊 Google Sheets Database Setup Guide

## Step 1: Create Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new spreadsheet, name it "Millionaires Club Database"
3. Create 4 sheets (tabs at bottom):
   - `Members`
   - `Loans`
   - `Transactions`
   - `Applications`

## Step 2: Create Sheets Headers

### Members Sheet
Add these column headers in row 1:
```
id | name | nickname | email | phone | address | beneficiary | join_date | accountStatus | totalContribution | activeLoanId | lastLoanPaidDate
```

### Loans Sheet
```
id | borrowerId | cosignerId | originalAmount | remainingBalance | termMonths | status | startDate | nextPaymentDue | issuedBy
```

### Transactions Sheet
```
id | memberId | type | amount | date | description | paymentMethod | receivedBy | status
```

### Applications Sheet
```
id | memberId | amount | term | purpose | proposedCosignerId | date | status
```

## Step 3: Create Google Apps Script
1. In your Google Sheet, click **Extensions** > **Apps Script**
2. Replace the code with [google-apps-script.js](backend/google-apps-script.js) from your project
3. Click **Deploy** > **New Deployment**
4. Select type: **Web app**
5. Execute as: Your email
6. Who has access: **Anyone**
7. Click **Deploy**
8. Copy the deployment URL (looks like `https://script.google.com/macros/s/...`)

## Step 4: Update Your App Config
1. Go to `services/sheetService.ts`
2. Replace the `SHEET_API_URL` with your Google Apps Script URL:
```typescript
const SHEET_API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

## Step 5: Add Sample Data to Google Sheets
Copy your existing members from the app and paste into the Members sheet.

## Done! 🎉
Your app will now sync all data directly to Google Sheets. No backend needed!

## How It Works
- When you create/update/delete records in the app, they go to Google Sheets
- All changes are saved in the spreadsheet for easy viewing
- You can edit directly in Google Sheets too (it syncs with the app)

## Troubleshooting
- **Getting CORS errors?** Make sure your Apps Script is deployed as "Anyone"
- **Data not syncing?** Check that your Google Apps Script URL is correct in `sheetService.ts`
- **Need to test?** Use the "Bulk Sync Members" button in your app dashboard

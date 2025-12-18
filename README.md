# Millionaires Club Management System

A comprehensive club management application for tracking members, loans, contributions, and financial data with Google Sheets integration.

**Live App:** https://millionaires-club.github.io/Millionaires-Club/

## Features

- 👥 **Member Management** - Track members, contributions, and account status
- 💰 **Loan Management** - Process loan applications, disbursements, and repayments
- 📊 **Financial Reports** - View dashboards, projections, and transaction history
- 📋 **Google Sheets Sync** - Automatic data synchronization with Google Sheets
- 🔐 **Authentication** - Secure admin and member portals with role-based access
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🌙 **Dark Mode** - Built-in dark/light theme toggle
- 📑 **Export to CSV** - Download member and loan data

## Run Locally

**Prerequisites:** Node.js 18+

1. **Clone the repository:**
   ```bash
   git clone https://github.com/millionaires-club/Millionaires-Club.git
   cd Millionaires-Club
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   - Create a `.env.local` file in the root directory
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   - Navigate to http://localhost:3000

## Google Sheets Setup (Optional)

For database functionality using Google Sheets:

1. Follow the guide in [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md)
2. Update `services/sheetService.ts` with your Google Apps Script URL
3. Test sync from the admin dashboard

## Deploy to GitHub Pages

Deployment is automatic via GitHub Actions. Every push to `main` triggers a build and deploy.

**Manual deployment:**
```bash
npm run build
```

## Project Structure

```
├── components/          # React components
├── services/           # API and service integrations
├── backend/            # Node.js backend (optional)
├── .github/workflows/  # GitHub Actions deployment
└── types.ts            # TypeScript type definitions
```

## Technologies

- React 19
- TypeScript
- Vite
- Google Sheets API
- Google Gemini AI
- Tailwind CSS
- Lucide Icons

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## License

MIT

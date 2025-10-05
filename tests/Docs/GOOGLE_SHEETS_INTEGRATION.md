# Google Sheets Integration Documentation

## Overview

The Google Sheets integration allows LoanLedger Pro to import expense data directly from Google Sheets spreadsheets. This feature enables automated data synchronization and reduces manual data entry.

## Features

- **Source Configuration**: Configure multiple Google Sheets sources with custom settings
- **Data Import**: Import expense data from configured Google Sheets
- **Import Testing**: Test connections and data parsing before actual import
- **Import History**: Track all import operations with detailed logs
- **Error Handling**: Comprehensive error reporting and validation

## Setup

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Google Sheets API Configuration
VITE_GOOGLE_SHEETS_API_KEY='your_google_api_key_here'

# Supabase Configuration (required)
VITE_SUPABASE_URL="your_supabase_url"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"
```

### 2. Google Sheets API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API
4. Create credentials (API Key)
5. Add the API key to your environment variables

### 3. Google Sheets Permissions

Ensure your Google Sheets are either:
- Public (anyone with the link can view)
- Shared with the service account (if using service account authentication)

## Usage

### Configuring Sources

1. Navigate to the Expenses page
2. Click on "Источники" (Sources) tab
3. Click "Добавить источник" (Add Source)
4. Fill in the required information:
   - **Name**: Descriptive name for the source
   - **Category**: Expense category (Salary, Office, Equipment, etc.)
   - **Sheet URL**: Full Google Sheets URL
   - **Sheet Name**: Name of the specific sheet tab
   - **Range**: Data range (e.g., "A2:E100")
   - **Active**: Enable/disable the source

### Testing Imports

1. Select a configured source
2. Click "Тест импорта" (Test Import)
3. Review the test results to ensure data is parsed correctly
4. Fix any configuration issues if needed

### Performing Imports

1. Select a configured source
2. Switch to "История импорта" (Import History) tab
3. Click "Импортировать данные" (Import Data)
4. Monitor the import progress and results

### Viewing Import History

The Import History tab shows:
- Import timestamp
- Number of imported records
- Success/failure status
- Error messages (if any)
- Import duration

## Data Format

### Expected Google Sheets Format

Your Google Sheets should have the following columns (order matters):

| Column A | Column B | Column C | Column D | Column E |
|----------|----------|----------|----------|----------|
| Date     | Amount   | Description | Department | Supplier |

### Data Types

- **Date**: Any valid date format (YYYY-MM-DD, DD/MM/YYYY, etc.)
- **Amount**: Numeric value (positive numbers)
- **Description**: Text description of the expense
- **Department**: Department name (will be matched with aliases)
- **Supplier**: Supplier name (will be matched with aliases)

## Technical Implementation

### Key Components

1. **ExpenseSourcesConfig.tsx**: Main UI component for source management
2. **googleSheets.ts**: Google Sheets API integration
3. **expenseImport.ts**: Import logic and data processing
4. **Database Tables**:
   - `expense_sources`: Source configurations
   - `import_logs`: Import history and status
   - `expenses`: Imported expense data

### API Endpoints

The integration uses the Google Sheets API v4:
- **Endpoint**: `https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}`
- **Authentication**: API Key
- **Response Format**: JSON with values array

### Error Handling

The system handles various error scenarios:
- Invalid Google Sheets URLs
- Network connectivity issues
- API rate limiting
- Data parsing errors
- Database insertion failures

### Data Validation

Before importing, the system validates:
- Date format and validity
- Numeric amount values
- Required field presence
- Data type consistency

## Troubleshooting

### Common Issues

1. **"Invalid Google Sheets URL"**
   - Ensure the URL is a valid Google Sheets link
   - Check that the sheet is publicly accessible

2. **"API Key Error"**
   - Verify the Google Sheets API is enabled
   - Check that the API key is correctly set in environment variables

3. **"No data found"**
   - Verify the sheet name and range are correct
   - Ensure the sheet contains data in the specified range

4. **"Import failed"**
   - Check the import logs for specific error messages
   - Verify database connectivity
   - Ensure data format matches expectations

### Debug Steps

1. Test the source configuration using "Тест импорта"
2. Check browser console for JavaScript errors
3. Verify environment variables are loaded
4. Check network tab for API request/response details

## Security Considerations

- API keys should be kept secure and not exposed in client-side code
- Consider using service account authentication for production
- Implement rate limiting to avoid API quota exhaustion
- Validate and sanitize all imported data

## Future Enhancements

- Support for custom column mapping
- Scheduled automatic imports
- Data transformation rules
- Multi-sheet import support
- Advanced filtering options
- Export functionality

## Support

For issues or questions regarding the Google Sheets integration:
1. Check this documentation
2. Review the troubleshooting section
3. Check the application logs
4. Contact the development team
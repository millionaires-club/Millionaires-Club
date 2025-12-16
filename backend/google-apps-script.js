
// =========================================================
// PASTE THIS CODE INTO GOOGLE SHEETS > EXTENSIONS > APPS SCRIPT
// =========================================================

const SHEETS = {
  MEMBERS: 'Members',
  LOANS: 'Loans',
  TRANSACTIONS: 'Transactions',
  APPLICATIONS: 'Applications'
};

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const params = e.parameter.action ? e.parameter : JSON.parse(e.postData.contents);
    const action = params.action;
    const sheetName = params.sheet;
    const data = params.data;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return response({ status: 'error', message: 'Sheet not found: ' + sheetName });
    }

    if (action === 'read') {
      const rows = sheet.getDataRange().getValues();
      const headers = rows.shift(); // Remove header row
      const result = rows.map(row => {
        let obj = {};
        headers.forEach((header, i) => obj[header] = row[i]);
        return obj;
      });
      return response({ status: 'success', data: result });
    }

    if (action === 'create') {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const newRow = headers.map(header => {
        // Handle dates specifically if needed, otherwise pass raw
        return data[header] || '';
      });
      sheet.appendRow(newRow);
      return response({ status: 'success', message: 'Row added' });
    }

    if (action === 'update') {
      // Assumes column A is always the unique 'id'
      const id = data.id;
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      const headers = values[0];
      
      let rowIndex = -1;
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] == id) {
          rowIndex = i + 1; // 1-based index
          break;
        }
      }

      if (rowIndex === -1) {
        return response({ status: 'error', message: 'ID not found' });
      }

      const rowToUpdate = [];
      headers.forEach(header => {
        // If the data object has the key, use new value, else keep old value
        // Note: This logic assumes 'data' contains fields to update. 
        // If you want partial updates, you need to read current row value.
        // For simplicity in this starter script, we expect full object or we overwrite.
        // Better approach for partial:
        const colIndex = headers.indexOf(header);
        const currentValue = values[rowIndex - 1][colIndex];
        rowToUpdate.push(data.hasOwnProperty(header) ? data[header] : currentValue);
      });

      sheet.getRange(rowIndex, 1, 1, rowToUpdate.length).setValues([rowToUpdate]);
      return response({ status: 'success', message: 'Row updated' });
    }
    
    if (action === 'delete') {
       const id = data.id;
       const dataRange = sheet.getDataRange();
       const values = dataRange.getValues();
       
       for (let i = 1; i < values.length; i++) {
        if (values[i][0] == id) {
          sheet.deleteRow(i + 1);
          return response({ status: 'success', message: 'Row deleted' });
        }
      }
      return response({ status: 'error', message: 'ID not found' });
    }

    return response({ status: 'error', message: 'Invalid action' });

  } catch (err) {
    return response({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function response(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Initial Setup Helper (Run this once in Apps Script editor to create headers)
function setupHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const membersHeaders = ['id', 'name', 'nickname', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'beneficiary', 'accountStatus', 'joinDate', 'totalContribution', 'activeLoanId', 'lastLoanPaidDate', 'password'];
  const loansHeaders = ['id', 'borrowerId', 'cosignerId', 'originalAmount', 'remainingBalance', 'termMonths', 'status', 'startDate', 'nextPaymentDue', 'issuedBy', 'borrowerSignature', 'signedDate', 'cosignerSignature', 'cosignerSignedDate', 'interestRate', 'interestType', 'totalInterestAccrued', 'lastInterestCalculation', 'autoPayEnabled', 'gracePeriodDays', 'missedPayments', 'lastPaymentDate'];
  const transactionsHeaders = ['id', 'memberId', 'type', 'amount', 'date', 'description', 'paymentMethod', 'receivedBy', 'status'];
  const applicationsHeaders = ['id', 'memberId', 'amount', 'term', 'purpose', 'proposedCosignerId', 'date', 'status'];

  createSheetIfNeeded(ss, 'Members', membersHeaders);
  createSheetIfNeeded(ss, 'Loans', loansHeaders);
  createSheetIfNeeded(ss, 'Transactions', transactionsHeaders);
  createSheetIfNeeded(ss, 'Applications', applicationsHeaders);
}

function createSheetIfNeeded(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
}

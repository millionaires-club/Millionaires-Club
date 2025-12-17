/**
 * BULK IMPORT HELPER
 * This script helps you import all members from constants.ts to Google Sheets
 * 
 * HOW TO USE:
 * 1. Open your browser console while on the app (F12 > Console)
 * 2. Copy and paste the content of this file
 * 3. Run: await bulkImportMembers()
 */

import { INITIAL_MEMBERS } from './constants';
import { sheetService } from './services/sheetService';

export async function bulkImportMembers() {
  console.log('🚀 Starting bulk import of members to Google Sheets...');
  console.log(`📊 Found ${INITIAL_MEMBERS.length} members to import`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const memberData of INITIAL_MEMBERS) {
    try {
      // Format member data from constants array
      const member = {
        id: `MC-${memberData[0]}`,
        name: memberData[1],
        nickname: memberData[2],
        accountStatus: memberData[3],
        email: memberData[4],
        phone: memberData[5],
        totalContribution: memberData[6],
        joinDate: memberData[7],
        address: '',
        city: '',
        state: '',
        zipCode: '',
        beneficiary: '',
        photoUrl: '',
        lastLoanPaidDate: '',
        activeLoanId: ''
      };

      await sheetService.createMember(member);
      successCount++;
      console.log(`✅ Imported: ${member.name} (${member.id})`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to import member at index ${INITIAL_MEMBERS.indexOf(memberData)}:`, error);
    }
  }

  console.log(`\n✨ Import Complete!`);
  console.log(`✅ Success: ${successCount} members`);
  console.log(`❌ Errors: ${errorCount} members`);
  
  if (errorCount === 0) {
    console.log(`\n🎉 All members imported successfully to Google Sheets!`);
  }
}

// Quick test function
export async function testGoogleSheetsConnection() {
  console.log('🧪 Testing Google Sheets connection...');
  try {
    const members = await sheetService.getMembers();
    console.log(`✅ Connection successful! Found ${members?.length || 0} members in Sheets`);
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return false;
  }
}

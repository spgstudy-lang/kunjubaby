const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const getDBPattern = /let updated = false;/;
const arrayInitializers = `  let updated = false;
  const arrays = [
    "users_profile", "users_auth", "scans", "appointments", "finances",
    "shopping_list", "hospital_bag_checklist", "journal_notes", "reminders",
    "baby_gallery", "activity_logs", "general_folders", "general_notes"
  ];
  arrays.forEach(key => {
    if (!dbData[key]) {
      dbData[key] = [];
      updated = true;
    }
  });`;

code = code.replace(getDBPattern, arrayInitializers);
fs.writeFileSync('server.ts', code);

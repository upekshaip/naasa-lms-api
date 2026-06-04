// Basic
// export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
// JWT
// export const ACCESS_TOKEN_SECRET =
//   process.env.ACCESS_TOKEN_SECRET || 'default_access_token_secret';
// export const REFRESH_TOKEN_SECRET =
//   process.env.REFRESH_TOKEN_SECRET || 'default_refresh_token_secret';

// db
// export const DATABASE_URL = process.env.DATABASE_URL || '';

// Google Drive File Id
// export const DRIVE_PARENT_FOLDER_ID = process.env.DRIVE_PARENT_FOLDER_ID || '';

// OAUTH2
// export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
// export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
// export const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
// export const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

// Google Sheets
// export const GOOGLE_SHEETS_USERS = process.env.GOOGLE_SHEETS_USERS || '';
// export const GOOGLE_SHEETS_ENROLLMENTS =
//   process.env.GOOGLE_SHEETS_ENROLLMENTS || '';
// export const GOOGLE_SHEETS_PAYMENTS = process.env.GOOGLE_SHEETS_PAYMENTS || '';

// Google Service Account (for Google Sheets only)
// export const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
//   process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
// export const GOOGLE_SERVICE_ACCOUNT_EMAIL =
//   process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';

// file uploads
export const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',

  // Documents
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx

  // Audio
  'audio/mpeg', // .mp3
  'audio/aac',
  'audio/wav',
];
export const ALLOWED_RECIEPT_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',

  // Documents
  'application/pdf',
];

export const INSTITUTION_NAME = 'Naasa LMS';
export const INSTITUTION_SUPPORT_EMAIL = 'support@deamoz.com';
export const INSTITUTION_COURSES_URL =
  'https://class.deamoz.com/student/courses';

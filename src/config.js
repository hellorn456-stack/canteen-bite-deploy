// ============================================================
// CANTEENBITE – CENTRAL CONFIGURATION
// ============================================================
// Change these values to reuse this app for any college.
// All references to college name, logo, and email suffix
// come from this single file.
// ============================================================

const config = {
  // College display name (shown in headers, login screen, etc.)
  collegeName: 'IBIT College',

  // Short name used in compact UI areas
  collegeShortName: 'IBIT',

  // College logo — place your logo in src/assets/ and update the path
  // Example: import logo from './assets/my_college_logo.png'
  // Then set: collegeLogo: logo
  // If null, falls back to a text-based logo
  collegeLogo: null,

  // Email domain suffix for institutional email validation
  // Set to null to allow any email domain
  emailSuffix: null, // e.g. 'icoe.ac.in' to restrict to college emails

  // App name
  appName: 'CanteenBite',

  // App tagline
  appTagline: 'Order in Class. Eat in Break. Skip the Queue.',

  // Welcome bonus amount (₹) given to every new user on registration
  // Set to 0 to disable welcome bonus
  welcomeBonus: 400,
};

export default config;

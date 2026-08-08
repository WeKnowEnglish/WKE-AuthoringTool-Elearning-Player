/** English parent-portal UI copy (Phase 1: shell, login, settings). */
export const parentMessagesEn = {
  "brand.parentPortal": "Parent portal",
  "brand.tagline": "We Know English",

  "nav.stream": "Class stream",
  "nav.streamShort": "Stream",
  "nav.progress": "Progress",
  "nav.children": "Children",
  "nav.alerts": "Alerts",
  "nav.settings": "Parent settings",
  "nav.signOut": "Sign out",
  "nav.notifications": "Notifications",
  "nav.notificationsUnread": "Notifications, {count} unread",
  "nav.child": "Child",
  "nav.chooseChild": "Choose a child",
  "nav.parentPortal": "Parent portal",

  "login.title": "Parent portal",
  "login.subtitle":
    "See teacher-approved class updates and a clear story of your child's learning.",
  "login.modeSignIn": "Sign in",
  "login.modeCreate": "Create account",
  "login.name": "Your name",
  "login.email": "Email address",
  "login.password": "Password",
  "login.submitSignIn": "Sign in to parent portal",
  "login.submitCreate": "Create parent account",
  "login.submitSignInInvite": "Sign in and continue",
  "login.submitCreateInvite": "Create account and continue",
  "login.busy": "Please wait…",
  "login.errorEmail": "Enter a valid email address.",
  "login.errorPassword": "Password must contain at least 8 characters.",
  "login.errorName": "Enter your name.",
  "login.errorCredentials": "Email or password is incorrect.",
  "login.errorGeneric": "We could not connect to the sign-in service. Please try again.",
  "login.checkEmail":
    "Check your email to verify your account, then return to this invitation and sign in.",
  "login.inviteHint":
    "Use the exact email address that received the invitation. Your email must be verified before student access can be activated.",
  "login.language": "Language",
  "login.languageEn": "English",
  "login.languageVi": "Tiếng Việt",

  "settings.eyebrow": "Account",
  "settings.title": "Parent settings",
  "settings.subtitle":
    "Choose how the portal keeps you informed. Student learning details are never placed in notification emails.",
  "settings.name": "Your name",
  "settings.language": "Preferred language",
  "settings.languageEn": "English",
  "settings.languageVi": "Tiếng Việt",
  "settings.notifications": "Notifications",
  "settings.inAppTitle": "In-app notifications",
  "settings.inAppBody":
    "Show new progress-report and family-access alerts in the parent portal.",
  "settings.emailTitle": "Important email alerts",
  "settings.emailBody":
    "Receive a generic email when a report is published or family access changes. Emails never contain student learning details.",
  "settings.save": "Save settings",
  "settings.saving": "Saving...",
  "settings.errorName": "Enter your name.",
  "settings.saved": "Settings saved.",
} as const;

export type ParentMessageKey = keyof typeof parentMessagesEn;

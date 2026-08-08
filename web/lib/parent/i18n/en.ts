/** English parent-portal UI copy (Phase 1–2). */
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

  "home.welcomeTitle": "Welcome, parents",
  "home.welcomeBody":
    "You can book a trial before your child has a student account. If a teacher already invited you, use that email invitation to link an enrolled child.",
  "home.findTeacher": "Find a teacher & book a trial",
  "home.howItWorks": "How it works",
  "home.inviteTitle": "Already received a class invitation?",
  "home.inviteBody":
    "Return to that email and use its private invitation link with this verified address.",
  "home.viewChildren": "View linked children",
  "home.yourChild": "Your child",

  "children.eyebrow": "Family access",
  "children.title": "Linked children",
  "children.subtitle":
    "These are the children whose teachers have approved access for this account.",
  "children.activeConnection": "Active family connection",
  "children.activeAccess": "Active access",
  "children.viewUpdates": "View updates",
  "children.emptyTitle": "No active connections",
  "children.emptyBody": "A teacher invitation is needed to link a child.",
  "children.changeTitle": "Need to change or remove access?",
  "children.changeBody":
    "Contact the child's teacher. For student privacy, family relationships cannot be added or transferred from this page.",

  "alerts.eyebrow": "Updates",
  "alerts.title": "Notifications",
  "alerts.subtitle":
    "Important report and family-access notices. Detailed learning information stays inside the secure portal.",
  "alerts.emptyTitle": "No notifications yet",
  "alerts.emptyBody": "Important report and family-access updates will appear here.",
  "alerts.unreadCount": "{count} unread notification",
  "alerts.unreadCountPlural": "{count} unread notifications",
  "alerts.markAll": "Mark all as read",
  "alerts.updating": "Updating...",
  "alerts.new": "New",
  "alerts.recent": "Recent",

  "stream.emptyTitle": "Updates will appear here",
  "stream.emptyBody":
    "{name}'s teacher has not shared a parent update yet. Only information deliberately chosen for families will appear in this stream.",
  "stream.openResource": "Open shared resource",
  "stream.type.teacher_update": "Teacher update",
  "stream.type.teacher_link": "Shared resource",
  "stream.type.homework_update": "Homework update",
  "stream.type.learning_activity": "Learning activity",
  "stream.type.student_highlight": "Learning highlight",
  "stream.type.milestone": "Milestone",
  "stream.type.progress_report": "Progress report",

  "schedule.eyebrow": "Class schedule",
  "schedule.nextLesson": "Next lesson",
  "schedule.nextLessonLabel": "Next lesson: {label}",
  "schedule.classTimezone": "Class timezone: {zone}",
  "schedule.yourTime": "Your time: {time} ({zone})",
  "schedule.noWeekly":
    "No weekly class time is set yet. Ask the teacher if you are unsure when lessons meet.",
  "schedule.notLinked": "This child is not linked to an active class schedule yet.",
  "schedule.minutes": "{count} min",

  "trial.eyebrow": "Trial lesson",
  "trial.confirmedTitle": "Confirmed trial",
  "trial.classroomReady":
    "Classroom access is ready once your child has a student login and enrollment.",
  "trial.pendingTitle": "Pending request",
  "trial.pendingTitlePlural": "Pending requests",
  "trial.awaiting": "Awaiting teacher response",
  "trial.cancel": "Cancel",

  "pref.eyebrow": "Choose availability",
  "pref.titleWithClass": "{classTitle} · preferred times",
  "pref.title": "Preferred class times",
  "pref.body":
    "Tap the times that work for your family, then use up/down to rank them. First choice helps the teacher group the class.",
  "pref.timezoneNote": " Times shown in class timezone ({zone}).",
  "pref.minutes": "{count} minutes",
  "pref.up": "Up",
  "pref.down": "Down",
  "pref.tapToAdd": "Tap to add",
  "pref.save": "Save preferences",
  "pref.saving": "Saving…",
  "pref.saved": "Preferences saved. The teacher will choose the class time.",
} as const;

export type ParentMessageKey = keyof typeof parentMessagesEn;

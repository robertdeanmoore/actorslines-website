// Pure email strings for the beta-decide function (no Deno APIs, so node --test can import them).
// Wording: WIP #269 plan section 4 (approved by Robert, D9); in-app report form timing: D7.

import { firstName, oneLine, REPLY_TO } from "../beta-apply/policy.ts";

export const SIGN_OFF = "Rob Moore, You Never Know Productions";
export const IN_APP_REPORT_FORM_AVAILABLE = false; // WIP #269 D7: in-app form ships in the first app update

export type Email = { subject: string; text: string };

const SUBJECT_IN = "You're in: Actors Lines beta testing";
const SUBJECT_REJECTION = "Your Actors Lines beta application";
const SUBJECT_GROUP_ADDED = "You can now join the Actors Lines beta on Google Play";

function greeting(name: string): string {
  return `Hello ${oneLine(firstName(name), 60)},`;
}

/** The "How to report something" body: in-app instructions first when the form exists, else website only. */
export function reportParagraph(inApp: boolean): string {
  if (inApp) {
    return `In the app, go to Settings, then Diagnostics, then "Report a problem or suggestion". Write a short subject and a description, choose Support (something's wrong) or Enhancement (something to improve), and add a screenshot if it helps. If something isn't working, include what you did just before it happened. You can also send reports from actorslines.app after signing in.`;
  }
  return `You can send reports from actorslines.app after signing in: choose Support (something's wrong) or Enhancement (something to improve), write a short subject and a description, and say what you did just before it happened if something isn't working.`;
}

const WHAT_I_WANT =
  `What I'd like from you\n` +
  `Use the app the way you really would: learning lines, rehearsing with a partner or on your own, importing scripts. Tell me what's confusing, what breaks and what you wish it did. Small things count. Honest, specific feedback is the most useful thing you can give.`;

const HOW_TO_REPORT = `How to report something\n${reportParagraph(IN_APP_REPORT_FORM_AVAILABLE)}`;

const IF_YOU_NEED = `If you need anything\nReply to this email or write to ${REPLY_TO}. This is a small, hands-on beta, so I read everything myself.`;

const PLAY_JOIN =
  `The app is shared through Google Play's closed testing. For this you need the Google account you gave on the form: {GOOGLE_EMAIL}. It must be the same account that is signed in to Google Play on your Android phone.\n` +
  `I will add that address to the testers' list, and I'll email you the link to join as soon as it is done (it can take up to a day). Please do not uninstall the app during the testing period if you can avoid it; Google counts how long testers stay opted in.`;

export function acceptanceEmail(
  p: { name: string; googleEmail: string; accountEmail: string; inviteLink: string; expiryDate: string },
): Email {
  const text =
    `${greeting(p.name)}\n\n` +
    `Thank you for applying to test Actors Lines. I'm pleased to say you have a place.\n\n` +
    `What you get\n` +
    `Your account comes with full access to every feature, including Cast Export, for six months. That starts when you create your account using the link below, so there's no rush to the first day, but the link only works once and expires in 14 days (${p.expiryDate}).\n\n` +
    `Step 1: Create your Actors Lines account\n` +
    `Use this link to choose a password: ${p.inviteLink}\n` +
    `(If it has expired, reply to this email and I'll send a fresh one.)\n\n` +
    `Step 2: Join the beta on Google Play\n` +
    `${PLAY_JOIN.replaceAll("{GOOGLE_EMAIL}", () => p.googleEmail)}\n\n` +
    `Step 3: Sign in\n` +
    `Open Actors Lines on your phone and sign in with the email and password from Step 1: ${p.accountEmail}. Your full access appears automatically.\n\n` +
    `${WHAT_I_WANT}\n\n` +
    `${HOW_TO_REPORT}\n\n` +
    `${IF_YOU_NEED}\n\n` +
    `Thank you for helping to shape Actors Lines.\n\n` +
    `${SIGN_OFF}\n`;
  return { subject: SUBJECT_IN, text };
}

export function acceptanceExistingAccountEmail(
  p: { name: string; googleEmail: string; accountEmail: string },
): Email {
  const text =
    `${greeting(p.name)}\n\n` +
    `Thank you for applying to test Actors Lines. I'm pleased to say you have a place.\n\n` +
    `What you get\n` +
    `You already have an Actors Lines account with this email, so there is nothing to create. Full access to every feature, including Cast Export, for six months has been added to it and starts today. Sign in as usual and it will appear: ${p.accountEmail}.\n\n` +
    `Step 1: Join the beta on Google Play\n` +
    `${PLAY_JOIN.replaceAll("{GOOGLE_EMAIL}", () => p.googleEmail)}\n\n` +
    `${WHAT_I_WANT}\n\n` +
    `${HOW_TO_REPORT}\n\n` +
    `${IF_YOU_NEED}\n\n` +
    `Thank you for helping to shape Actors Lines.\n\n` +
    `${SIGN_OFF}\n`;
  return { subject: SUBJECT_IN, text };
}

export function rejectionEmail(p: { name: string }): Email {
  const text =
    `${greeting(p.name)}\n\n` +
    `Thank you for applying to test Actors Lines, and for taking the time to tell me about yourself.\n\n` +
    `I have a limited number of places for this first round, and I'm sorry that I'm not able to offer you one this time. This isn't a judgement of you or of your interest.\n\n` +
    `You're very welcome to apply again later, as places open or as the beta grows. Meanwhile, news about Actors Lines will be at actorslines.app.\n\n` +
    `Thank you again, and good luck with your acting.\n\n` +
    `${SIGN_OFF}\n`;
  return { subject: SUBJECT_REJECTION, text };
}

export function groupAddedEmail(p: { name: string; googleEmail: string; optInLink: string }): Email {
  const text =
    `${greeting(p.name)}\n\n` +
    `I've added ${p.googleEmail} to the testers' list. Please open this link on your Android phone and tap "Become a tester": ${p.optInLink}\n\n` +
    `If it doesn't work straight away, wait a few minutes and try again, and check that you are signed in to Google Play with ${p.googleEmail}.\n\n` +
    `${SIGN_OFF}\n`;
  return { subject: SUBJECT_GROUP_ADDED, text };
}

/**
 * iCalendar export, ported from endpoints/subscription/exportcalendar.php.
 */

import { parseDate } from './dates';
import type { SubscriptionView } from './types';

/**
 * Escape a value for an iCalendar property.
 *
 * The backslash must be escaped first, before the other substitutions add
 * backslashes of their own. Real newlines become a literal `\n` escape: an
 * unescaped newline would terminate the property and let a subscription name
 * or note inject arbitrary calendar content.
 */
export function icalEscape(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** Fold a content line to RFC 5545's 75-octet limit, splitting on code points. */
export function icalFold(line: string): string {
  const limit = 75;
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= limit) return line;

  let folded = '';
  let lineLength = 0;
  for (const character of line) {
    const characterLength = encoder.encode(character).length;
    if (lineLength + characterLength > limit) {
      folded += '\r\n ';
      lineLength = 0;
    }
    folded += character;
    lineLength += characterLength;
  }
  return folded;
}

export function buildIcs(subscription: SubscriptionView): string {
  const uid = `wallos-subscription-${subscription.id}@wallos`;
  const summary = icalEscape(subscription.name);
  const description = [
    `Price: ${subscription.currency_symbol}${subscription.price.toFixed(2)}`,
    `Category: ${icalEscape(subscription.category_name)}`,
    `Payment Method: ${icalEscape(subscription.payment_method_name)}`,
    `Payer: ${icalEscape(subscription.payer_name)}`,
    '',
    `Notes: ${icalEscape(subscription.notes)}`,
  ].join('\\n');

  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const paymentDate = parseDate(subscription.next_payment) ?? new Date();
  const dt =
    `${paymentDate.getFullYear()}` +
    `${String(paymentDate.getMonth() + 1).padStart(2, '0')}` +
    `${String(paymentDate.getDate()).padStart(2, '0')}`;
  const trigger = subscription.notify_days_before || 1;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wallos//Subscription Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    icalFold(`SUMMARY:${summary}`),
    icalFold(`DESCRIPTION:${description}`),
    `DTSTART;VALUE=DATE:${dt}`,
    `DTEND;VALUE=DATE:${dt}`,
    icalFold(`LOCATION:${icalEscape(subscription.url)}`),
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    `TRIGGER:-P${trigger}D`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Build the .ics for a subscription and hand it to the browser as a download. */
export function buildIcsFile(subscription: SubscriptionView) {
  const blob = new Blob([buildIcs(subscription)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${subscription.name.replace(/[^\w\-]+/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

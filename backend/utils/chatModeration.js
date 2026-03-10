/**
 * Chat Moderation Utility
 * Detects messages where users try to arrange meetings outside the platform,
 * share personal contact info, addresses, phone numbers, etc.
 */

// Keywords/phrases that suggest arranging outside meetings
const OUTSIDE_MEETING_PHRASES = [
  'meet in person',
  'meet up',
  'meetup',
  'meet outside',
  'offline meeting',
  'face to face',
  'face-to-face',
  'in-person meeting',
  'in person meeting',
  'come to my office',
  'come to our office',
  'visit our office',
  'visit my office',
  'let\'s meet at',
  'meet me at',
  'meet us at',
  'coffee shop',
  'grab coffee',
  'grab a coffee',
  'let\'s grab',
  'outside this platform',
  'outside the platform',
  'off platform',
  'off-platform',
  'bypass the platform',
  'directly contact',
  'contact me directly',
  'contact us directly',
  'reach me at',
  'reach us at',
  'call me at',
  'call us at',
  'text me',
  'text us',
  'whatsapp',
  'whats app',
  'telegram',
  'signal app',
  'google meet',
  'zoom meeting',
  'zoom call',
  'zoom link',
  'teams meeting',
  'teams call',
  'skype',
  'facetime',
  'my number is',
  'my phone',
  'my cell',
  'my mobile',
  'here is my number',
  'here\'s my number',
  'personal email',
  'personal mail',
  'my email is',
  'email me at',
  'mail me at',
  'send me an email',
  'my address is',
  'our address is',
  'office address',
  'home address',
  'street address',
  'located at',
  'our location',
  'my location',
  'come over',
  'visit us at',
  'drop by',
  'stop by',
  'swing by',
  'discuss privately',
  'talk privately',
  'private discussion',
  'off the record',
  'deal outside',
  'pay outside',
  'payment outside',
  'pay directly',
  'pay me directly',
  'venmo',
  'paypal me',
  'cash app',
  'zelle',
  'wire transfer',
  'bank transfer directly',
];

// Regex patterns for detecting contact info
const PHONE_PATTERN = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const ADDRESS_PATTERN = /\d{1,5}\s+[\w\s]{2,30}(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|place|pl|way|circle|cir|highway|hwy)\b/i;
const ZIP_CODE_PATTERN = /\b\d{5}(?:-\d{4})?\b/;

/**
 * Analyzes a message for policy violations (outside meeting arrangements, contact sharing)
 * @param {string} content - The message content to analyze
 * @returns {{ flagged: boolean, reasons: string[], severity: string }}
 */
function analyzeMessage(content) {
  if (!content || typeof content !== 'string') {
    return { flagged: false, reasons: [], severity: 'none' };
  }

  const lowerContent = content.toLowerCase();
  const reasons = [];
  let severityScore = 0;

  // Check for outside meeting phrases
  for (const phrase of OUTSIDE_MEETING_PHRASES) {
    if (lowerContent.includes(phrase)) {
      reasons.push(`Contains phrase: "${phrase}"`);
      severityScore += 2;
    }
  }

  // Check for phone numbers
  if (PHONE_PATTERN.test(content)) {
    reasons.push('Contains what appears to be a phone number');
    severityScore += 3;
  }

  // Check for email addresses
  if (EMAIL_PATTERN.test(content)) {
    reasons.push('Contains an email address');
    severityScore += 3;
  }

  // Check for physical addresses
  if (ADDRESS_PATTERN.test(content)) {
    reasons.push('Contains what appears to be a physical address');
    severityScore += 3;
  }

  // Check for ZIP codes (in context with address-like content)
  if (ZIP_CODE_PATTERN.test(content) && severityScore > 0) {
    reasons.push('Contains a ZIP/postal code');
    severityScore += 1;
  }

  // Determine severity
  let severity = 'none';
  if (severityScore >= 5) severity = 'high';
  else if (severityScore >= 3) severity = 'medium';
  else if (severityScore >= 1) severity = 'low';

  return {
    flagged: reasons.length > 0,
    reasons,
    severity,
  };
}

module.exports = { analyzeMessage };

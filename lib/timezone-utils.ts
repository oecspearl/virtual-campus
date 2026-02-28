/**
 * Timezone utilities for video conference scheduling
 */

/**
 * Get list of common timezones
 */
export function getTimezones() {
  return [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona (MST)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
    { value: 'America/Toronto', label: 'Eastern Time - Toronto' },
    { value: 'America/Vancouver', label: 'Pacific Time - Vancouver' },
    { value: 'America/Mexico_City', label: 'Central Time - Mexico City' },
    { value: 'America/Sao_Paulo', label: 'Brasilia Time (BRT)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Europe/Berlin', label: 'Central European Time - Berlin' },
    { value: 'Europe/Rome', label: 'Central European Time - Rome' },
    { value: 'Europe/Madrid', label: 'Central European Time - Madrid' },
    { value: 'Europe/Amsterdam', label: 'Central European Time - Amsterdam' },
    { value: 'Europe/Athens', label: 'Eastern European Time (EET)' },
    { value: 'Europe/Moscow', label: 'Moscow Time (MSK)' },
    { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
    { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
    { value: 'Asia/Seoul', label: 'Korea Standard Time (KST)' },
    { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
    { value: 'Australia/Melbourne', label: 'Australian Eastern Time - Melbourne' },
    { value: 'Pacific/Auckland', label: 'New Zealand Time (NZST)' },
  ];
}

/**
 * Get user's timezone (browser default)
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York'; // Default fallback
  }
}

/**
 * Convert local datetime string to UTC ISO string
 * @param localDateTime - Local datetime string (YYYY-MM-DDTHH:mm format)
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns UTC ISO string
 */
export function localToUTC(localDateTime: string, timezone: string): string {
  if (!localDateTime) return '';
  
  try {
    // Parse the local datetime components
    const [datePart, timePart] = localDateTime.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Create a date object in UTC with the specified date/time
    // This represents the time as if it were UTC
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    
    // Now we need to adjust for the timezone offset
    // Get what this UTC time would be in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(utcDate);
    const tzYear = parseInt(parts.find(p => p.type === 'year')!.value);
    const tzMonth = parseInt(parts.find(p => p.type === 'month')!.value);
    const tzDay = parseInt(parts.find(p => p.type === 'day')!.value);
    const tzHour = parseInt(parts.find(p => p.type === 'hour')!.value);
    const tzMinute = parseInt(parts.find(p => p.type === 'minute')!.value);
    
    // Create a date representing what the UTC time would show in the target timezone
    const tzDateUTC = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute));
    
    // Calculate the offset: how much we need to adjust
    // If the timezone shows a different time, we need to adjust
    const offset = utcDate.getTime() - tzDateUTC.getTime();
    
    // Apply the offset to get the correct UTC time
    const correctedUTC = new Date(utcDate.getTime() + offset);
    
    return correctedUTC.toISOString();
  } catch (error) {
    console.error('Error converting local to UTC:', error);
    // Fallback: treat the input as UTC
    const date = new Date(localDateTime + 'Z');
    return date.toISOString();
  }
}

/**
 * Convert UTC ISO string to local datetime string for a specific timezone
 * @param utcISOString - UTC ISO string
 * @param timezone - IANA timezone string
 * @returns Local datetime string (YYYY-MM-DDTHH:mm format)
 */
export function utcToLocal(utcISOString: string, timezone: string): string {
  if (!utcISOString) return '';
  
  try {
    const date = new Date(utcISOString);
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')!.value;
    const month = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;
    const hour = parts.find(p => p.type === 'hour')!.value;
    const minute = parts.find(p => p.type === 'minute')!.value;
    
    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch (error) {
    console.error('Error converting UTC to local:', error);
    return '';
  }
}

/**
 * Format datetime for display in a specific timezone
 * @param utcISOString - UTC ISO string
 * @param timezone - IANA timezone string
 * @returns Formatted string
 */
export function formatDateTimeInTimezone(utcISOString: string, timezone: string): string {
  if (!utcISOString) return '';
  
  try {
    const date = new Date(utcISOString);
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    
    return formatter.format(date);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return new Date(utcISOString).toLocaleString();
  }
}

/**
 * Get timezone abbreviation (e.g., EST, PST)
 */
export function getTimezoneAbbreviation(timezone: string): string {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(date);
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value || '';
    return tzName;
  } catch {
    return '';
  }
}


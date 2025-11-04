import type { CalEvent } from '../types';

const API_BASE = 'https://www.googleapis.com/calendar/v3';

export interface MeetingDetails {
    title: string;
    description?: string;
    startDateTime: string; // ISO format
    endDateTime: string; // ISO format
    attendees?: string[]; // array of emails
}

// Maps a Google Calendar event to our CalEvent type
const mapGCalEventToMeeting = (item: any): CalEvent => ({
    id: `gcal-${item.id}`,
    gcalId: item.id,
    title: item.summary || 'No Title',
    date: item.start.date || item.start.dateTime.split('T')[0],
    time: item.start.dateTime ? item.start.dateTime.split('T')[1].substring(0, 5) : '00:00',
    isGoogleEvent: true,
    color: 'cyan',
    meetLink: item.hangoutLink,
});

export const createMeeting = async (accessToken: string, details: MeetingDetails): Promise<any> => {
    const event = {
        summary: details.title,
        description: details.description,
        start: { dateTime: details.startDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: details.endDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        attendees: details.attendees?.map(email => ({ email })),
        conferenceData: {
            createRequest: {
                requestId: `focusmeet-${Date.now()}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
        },
    };

    const response = await fetch(`${API_BASE}/calendars/primary/events?conferenceDataVersion=1`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Google Calendar API error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to create the meeting.');
    }
    return response.json();
};

export const fetchUpcomingMeetings = async (accessToken: string): Promise<CalEvent[]> => {
    const timeMin = new Date().toISOString();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 30); // Next 30 days

    const response = await fetch(`${API_BASE}/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error('Permission denied. Please reconnect your Google Account.');
        }
        throw new Error('Failed to fetch upcoming meetings.');
    }

    const data = await response.json();
    const meetings = (data.items || [])
        .filter((item: any) => !!item.hangoutLink)
        .map(mapGCalEventToMeeting);

    return meetings;
};
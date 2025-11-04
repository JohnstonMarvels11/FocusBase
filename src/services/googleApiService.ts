import type { Email } from '../types';

// Helper to decode base64url which is used by Gmail API
function base64UrlDecode(str: string): string {
    try {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) {
            str += '=';
        }
        return atob(str);
    } catch (e) {
        console.error("Base64 decode failed:", e);
        return ""; // Return empty string if decoding fails
    }
}

// Recursively find the body content from the email payload parts
function getBody(payload: any): string {
    if (payload.body && payload.body.data) {
        return payload.body.data;
    }
    if (payload.parts) {
        // Prioritize HTML body
        const htmlPart = payload.parts.find((part: any) => part.mimeType === 'text/html');
        if (htmlPart && htmlPart.body && htmlPart.body.data) {
            return htmlPart.body.data;
        }
        // Fallback to plain text
        const plainPart = payload.parts.find((part: any) => part.mimeType === 'text/plain');
        if (plainPart && plainPart.body && plainPart.body.data) {
            // Convert plain text to simple HTML
            const decoded = base64UrlDecode(plainPart.body.data);
            return btoa(decoded.replace(/\n/g, '<br>'));
        }
        // Recursive search for multipart emails
        for (const part of payload.parts) {
            const body = getBody(part);
            if (body) return body;
        }
    }
    return '';
}

export const fetchUnreadEmails = async (accessToken: string): Promise<Email[]> => {
    try {
        const listResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=3`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!listResponse.ok) {
            if (listResponse.status === 401 || listResponse.status === 403) {
                 throw new Error('Permission denied. Please reconnect your Google Account.');
            }
            throw new Error('Failed to fetch email list.');
        }

        const listData = await listResponse.json();
        if (!listData.messages) {
            return [];
        }

        const emailPromises = listData.messages.map(async (message: { id: string, threadId: string }) => {
            const msgResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (!msgResponse.ok) {
                console.error(`Failed to fetch email with id ${message.id}`);
                return null;
            }
            const msgData = await msgResponse.json();
            const { payload } = msgData;
            const headers = payload.headers;
            
            const from = headers.find((h: any) => h.name === 'From')?.value || '';
            const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
            const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();
            
            const rawBody = getBody(payload);
            const body = base64UrlDecode(rawBody);

            return {
                id: msgData.id,
                threadId: msgData.threadId,
                from: from.replace(/<.*>/, '').trim(),
                subject,
                snippet: msgData.snippet,
                body,
                date,
            };
        });

        const emails = await Promise.all(emailPromises);
        return emails.filter((email): email is Email => email !== null);

    } catch (error) {
        console.error('Error fetching unread emails:', error);
        throw error;
    }
};

export const markEmailAsRead = async (accessToken: string, messageId: string): Promise<void> => {
    try {
        const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                removeLabelIds: ['UNREAD']
            })
        });

        if (!response.ok) {
            throw new Error("Failed to mark email as read.");
        }
    } catch (error) {
        console.error("Error marking email as read:", error);
        throw error;
    }
};
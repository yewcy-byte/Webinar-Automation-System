# Webinar Automation System
Doing this project for intern preperation


Question Features:
✅ Set timestamp for each question
✅ Choose question type: Text, Yes/No, Multiple Choice
✅ Set importance level: High (red), Medium (yellow), Low (green)
✅ Visual markers on timeline below video
✅ Click marker to expand and view question
✅ Full CRUD operations
✅ Auto-save to Supabase

📱 WhatsApp Bulk Messaging Feature
Components Created:
WhatsApp Service (lib/whatsapp.ts)

Send individual text messages
Send template messages
Send bulk messages with personalization
Excel Processing (app/api/whatsapp/send-bulk/route.ts)

Auto-detects phone and name columns in Excel
Validates phone numbers
Sends personalized messages to all recipients
UI Page (app/whatsapp/page.tsx)

Upload Excel file (.xlsx)
Customize message template with placeholders
Set webinar link
Real-time preview of personalized message
View send results (successful/failed count)
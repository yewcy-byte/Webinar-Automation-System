# Webinar Automation System

Webinar Automation System is a Next.js application for managing webinar videos, creating timestamped questions, and collecting responses. It is designed as a practical intern-preparation project that combines video upload, question workflows, Supabase persistence, and AI-assisted question generation.

## What the project does

The app lets you upload a webinar video, share a watch link, attach questions to specific timestamps, and store everything in Supabase-backed data models.

## Core features

### Webinar video workflow

- Upload webinar videos from the admin UI.
- Preview a selected video locally before upload.
- Generate a public watch link after upload.
- Browse previously uploaded videos from the sidebar.
- Stream the uploaded video from CloudFront.

### Question management

- Create questions tied to exact timestamps.
- Choose question types: text, yes/no, or multiple choice.
- Mark question importance as high, medium, or low.
- Show question markers on the timeline under the video.
- Click timeline markers to inspect each question.
- Create, edit, and delete questions.
- Save questions as drafts before the video is uploaded.
- Sync draft questions to Supabase after upload.

### AI question generation

- Generate transcript-based questions automatically from an uploaded webinar.
- Control how many AI questions are generated.
- Pull the uploaded video from CloudFront, transcribe it, and store generated questions in the database.


## UI Screenshots

### Upload Webinar Dashboard

![Upload Webinar Dashboard](public/upload%20Webinar%20Dashboard.png)

### Gemini AI Transcription and Auto Question Generation

![Gemini API transcription and auto question generation with HR context](public/Gemini%20API%20transcription%20and%20auto%20question%20generation%20with%20HR%20context.png)

### View Webinar Page

![View Webinar Page](public/View%20Webinar%20Page.png)

### Google Sign In

![Google Sign In](public/Google%20Sign%20In.png)

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Prisma
- Supabase
- Amazon S3 for video storage
- CloudFront for video delivery

## Main pages

- `/uploadWebinar` - upload videos, manage questions, and generate AI questions.
- `/watch/[key]` - watch a webinar video through a shareable link.


## API routes

- `POST /api/upload` - upload a webinar video.
- `GET /api/videos` - list uploaded videos.
- `GET /api/webinar-questions` - fetch questions for a video.
- `POST /api/webinar-questions` - create a question.
- `DELETE /api/webinar-questions/[id]` - delete a question.
- `POST /api/webinar-ai-questions` - generate AI-based questions.
- `GET /api/interview-availability` - read interview availability.
- `POST /api/interview-availability` - store interview availability.
- `GET /api/webinar-responses` - read question responses.
- `POST /api/webinar-responses` - store question responses.
- `GET /api/webinar-submissions` - read webinar submissions.
- `POST /api/webinar-submissions` - create a submission.
- `POST /api/auth/session` - manage session data.
- `POST /api/webhook` - receive webhook events.

## Data models

- `WebinarQuestion` - stores timestamped questions, question type, options, and keywords.
- `WebinarResponse` - stores answers from users.
- `WebinarSubmission` - stores submission details, scores, and resume links.
- `InterviewAvailability` - stores webinar interview availability windows.

## Environment variables

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - fallback key used by the server helper
- `SUPABASE_SERVICE_ROLE_KEY`

### Database

- `DATABASE_URL`

### Video storage and delivery

- `AWS_REGION`
- `AWS_BUCKET_NAME`
- `NEXT_PUBLIC_CLOUDFRONT_URL`

### AI generation

- `OPENAI_API_KEY`

### Optional storage

- `SUPABASE_RESUME_BUCKET`

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Add the required environment variables to your `.env.local` file.

3. Run the development server:

```bash
npm run dev
```

4. Open the app in your browser and start uploading videos or managing webinar questions.

## Notes

- The project uses Supabase for server-side data access and persistence.
- Uploaded webinar videos are stored in S3 and served through CloudFront.
- AI question generation depends on an uploaded video and a valid OpenAI key.

## Project goal

This project was built as an intern-preparation exercise to demonstrate a complete workflow around webinar management, automated question generation, and response tracking in a single application.
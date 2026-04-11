# CVPilot Backend API Documentation

## Project Overview

CVPilot is a resume management and parsing platform that enables users to upload, store, and analyze their resumes with intelligent parsing capabilities. The backend provides a complete REST API for resume management, user preferences, and authentication integration with Clerk.

**Key Features:**
- Secure resume upload and storage via Cloudinary
- User preference management (seniority level, location preferences)
- File validation and duplicate detection via hash-based comparison
- Asynchronous resume parsing pipeline (stub for future queue integration)
- Clerk authentication integration for secure user access

---

## Base URL

```
http://localhost:3000
```

For development:
```
http://localhost:3000
```

For production:
```
https://api.cvpilot.com
```

---

## Authentication

### Authentication Mechanism

CVPilot uses **Clerk** for authentication. All protected endpoints require a valid Clerk JWT token in the `Authorization` header.

### Required Headers for Protected Routes

```json
{
  "Authorization": "Bearer <clerk_token>",
  "Content-Type": "application/json"
}
```

### Getting a Clerk Token

1. User authenticates on the frontend (via Clerk UI)
2. Clerk issues a session token
3. Frontend includes this token in the `Authorization` header for all API requests
4. Backend validates the token via `@clerk/express` middleware

### User ID in Requests

Once authenticated, the user's `userId` (from Clerk) is available as `req.auth.userId` in protected route handlers. This is automatically injected into request parameters.

---

## Global Request/Response Format

### Standard Headers (All Requests)

| Header | Value | Required |
| ------ | ----- | -------- |
| `Content-Type` | `application/json` (except file uploads) | Yes |
| `Authorization` | `Bearer <token>` | Yes (protected routes) |
| `Origin` | `http://localhost:5173` (dev) or your domain | Automatically handled by CORS |

### CORS Configuration

The server accepts requests from:
- **Default:** `http://localhost:5173`
- **Configurable via:** `FRONTEND_URL` environment variable
- **Methods Allowed:** GET, POST, PUT, DELETE, OPTIONS
- **Credentials:** Enabled

### Standard Error Response Format

All error responses follow this structure:

```json
{
  "error": "Error message describing the issue",
  "message": "Additional context (if applicable)"
}
```

---

## API Endpoints

### 1. Health Check

#### Description

System health check endpoint. Used to verify that the API server is running and healthy. No authentication required.

#### Method & Route

- **Method:** GET
- **Route:** `/health`

#### Headers

None required (public endpoint)

#### Request

No request body or parameters.

#### Success Response

- **Status Code:** 200 OK

```text
OK
```

#### Notes

- Useful for monitoring and load balancer health checks
- No JSON response—returns plain text "OK"

---

### 2. Get Authenticated User Info

#### Description

Returns information about the currently authenticated user from the Clerk authentication context. Used by the frontend to verify the user's session and retrieve user metadata.

#### Method & Route

- **Method:** GET
- **Route:** `/auth/me`

#### Headers

```json
{
  "Authorization": "Bearer <clerk_token>"
}
```

#### Request

No request body or query parameters.

#### Success Response

- **Status Code:** 200 OK

```json
{
  "success": true,
  "user": {
    "userId": "user_2abc123def456",
    "sessionId": "sess_2xyz789uvw012",
    "orgId": "org_123abc456def"
  }
}
```

#### Error Responses

##### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Valid Clerk token required"
}
```

#### Notes

- Requires valid Clerk JWT in `Authorization` header
- `sessionId` and `orgId` may be `null` if user is not in an organization
- Used to verify authentication status on frontend app load
- Lightweight endpoint—useful for session validation

---

### 3. Upload Resume

#### Description

Uploads a resume file (PDF or DOCX) for the authenticated user. The system:
1. Validates the file type and magic bytes (prevents spoofed files)
2. Generates a hash of the file to detect duplicates
3. Uploads to Cloudinary for storage
4. Stores metadata in PostgreSQL
5. Triggers asynchronous resume parsing (for future use)
6. Deletes the previous resume if a new one is uploaded

**Async Behavior:** Parsing is triggered asynchronously and does not block the response.

#### Method & Route

- **Method:** POST
- **Route:** `/resume`

#### Headers

```json
{
  "Authorization": "Bearer <clerk_token>",
  "Content-Type": "multipart/form-data"
}
```

#### Request

#### Form Data

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `file` | File (binary) | Yes | Resume file (PDF or DOCX format). Max supported size: limited by server configuration |

#### Allowed File Types

| MIME Type | Extension | Magic Bytes |
| --------- | --------- | ----------- |
| `application/pdf` | `.pdf` | `25 50 44 46` (hex) — `%PDF` |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.docx` | `50 4B 03 04` (hex) — `PK..` |

#### Success Response

##### 200 OK (New Resume or Changed Resume)

```json
{
  "message": "Resume uploaded",
  "changed": true,
  "fileUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/resume_abc123.pdf"
}
```

##### 200 OK (Duplicate Resume—No Changes)

```json
{
  "message": "Resume unchanged",
  "changed": false
}
```

#### Error Responses

##### 400 Bad Request (No File)

```json
{
  "error": "No file uploaded"
}
```

##### 400 Bad Request (Invalid File Type)

```json
{
  "error": "Only PDF and DOCX files are allowed!!"
}
```

##### 400 Bad Request (Invalid Magic Bytes)

```json
{
  "error": "File validation failed"
}
```

##### 401 Unauthorized

```json
{
  "error": "Unauthorized"
}
```

##### 500 Internal Server Error (Cloudinary Upload Failure)

```json
{
  "error": "File upload failed"
}
```

##### 500 Internal Server Error (Database Error)

```json
{
  "error": "Database error - please try again"
}
```

##### 500 Internal Server Error (Parsing Trigger Failure)

```json
{
  "error": "Internal server error"
}
```

#### Notes

- **File Validation:** Magic bytes are checked to prevent spoofed files (renamed executables, etc.)
- **Duplicate Detection:** Files with identical content (same hash) are rejected, and the response indicates `changed: false`
- **Cloudinary Integration:** Files are uploaded to Cloudinary; the `fileUrl` in the response is the secure Cloudinary URL
- **Rollback:** If database insertion fails after Cloudinary upload, the file is deleted from Cloudinary (rollback mechanism)
- **User Sync:** Clerk user data is synced to the database before processing
- **Old File Cleanup:** Previous resume is deleted from Cloudinary when a new one is uploaded (if `changed: true`)
- **Parsing Trigger:** A job is queued (non-blocking) to parse the resume asynchronously. Currently a stub; future integration with BullMQ or similar
- **Storage Location:** Files are stored in Cloudinary with a generated public ID; metadata is stored in PostgreSQL `Resume` table
- **Constraints:** Only one resume per user (previous resume is replaced)

---

### 4. Get Resume with Parsed Data

#### Description

Retrieves the authenticated user's resume along with parsed data (if available). The endpoint supports polling for resume parsing completion—initially returns 202 (Accepted) while parsing is in progress, then returns 200 (OK) once parsing completes.

**Polling Behavior:**
- Immediately after upload: Returns 202 (parsing still in progress)
- After parsing completes: Returns 200 with `parsedData` object
- No resume uploaded: Returns 404

#### Method & Route

- **Method:** GET
- **Route:** `/resume`

#### Headers

```json
{
  "Authorization": "Bearer <clerk_token>"
}
```

#### Request

No request body or query parameters.

#### Success Response (Parsing Complete)

- **Status Code:** 200 OK

```json
{
  "message": "Resume parsed successfully",
  "parsedData": {
    "name": "John Doe",
    "skills": ["JavaScript", "TypeScript", "React", "Node.js"],
    "currentRole": "Senior Software Engineer",
    "experienceYears": 5,
    "seniority": "Senior",
    "location": "San Francisco, CA",
    "remote": true,
    "techStack": {
      "languages": ["JavaScript", "TypeScript", "Python"],
      "frameworks": ["React", "Express", "Django"],
      "tools": ["Docker", "Kubernetes", "AWS"]
    },
    "projects": [
      {
        "name": "Project A",
        "description": "Description of project A",
        "technologies": ["React", "Node.js"]
      }
    ],
    "keywords": ["fullstack", "cloud-native", "agile"],
    "education": {
      "degree": "B.S. Computer Science",
      "school": "University of California",
      "year": "2019"
    }
  },
  "uploadedAt": "2026-04-10T14:22:33.456Z",
  "fileUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/resume_abc123.pdf"
}
```

#### Success Response (Parsing In Progress)

- **Status Code:** 202 Accepted

```json
{
  "message": "Resume uploaded but still parsing. Try again in a few seconds.",
  "fileUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/resume_abc123.pdf",
  "uploadedAt": "2026-04-10T14:22:33.456Z"
}
```

#### Error Responses

##### 401 Unauthorized

```json
{
  "error": "Unauthorized"
}
```

##### 404 Not Found

```json
{
  "error": "No resume found. Please upload a resume first."
}
```

##### 500 Internal Server Error

```json
{
  "error": "Internal server error"
}
```

#### Notes

- **Polling Strategy:** Frontend should poll this endpoint after uploading a resume to check for parsing completion
- **Status 202:** Indicates the resume is being processed asynchronously
- **Parsed Data Format:** See `ParsedResume` data model below for schema details
- **Null Fields:** Fields in `parsedData` may be `null` if the parser couldn't extract that information
- **Retry Logic:** Recommended polling interval is 2-3 seconds until `parsedData` is populated
- **Cloudinary URL:** The `fileUrl` is a permanent Cloudinary secure URL that can be used for downloading the original resume

---

### 5. Create User Preferences

#### Description

Creates user preferences for the first time. This endpoint initializes preferences for job search (seniority level and location preferences).

**Note:** This endpoint will fail if preferences already exist. Use PATCH to update existing preferences.

#### Method & Route

- **Method:** POST
- **Route:** `/preferences`

#### Headers

```json
{
  "Authorization": "Bearer <clerk_token>",
  "Content-Type": "application/json"
}
```

#### Request Body

```json
{
  "seniority": "FULLTIME",
  "locationPreferences": ["REMOTE", "HYBRID"]
}
```

#### Request Schema

| Field | Type | Required | Allowed Values | Description |
| ----- | ---- | -------- | -------------- | ----------- |
| `seniority` | String | Yes | `INTERN`, `FULLTIME` | Employment level sought |
| `locationPreferences` | Array<String> | Yes | `REMOTE`, `ONSITE`, `HYBRID` | At least one location preference required |

#### Success Response

- **Status Code:** 201 Created

```json
{
  "userId": 42,
  "seniority": "FULLTIME",
  "locationPreferences": ["REMOTE", "HYBRID"],
  "createdAt": "2026-04-10T12:34:56.789Z",
  "updatedAt": "2026-04-10T12:34:56.789Z"
}
```

#### Error Responses

##### 400 Bad Request (Invalid Seniority)

```json
{
  "error": "Invalid enum value. Expected 'INTERN' | 'FULLTIME'"
}
```

##### 400 Bad Request (Invalid Location Type)

```json
{
  "error": "Invalid enum value. Expected 'REMOTE' | 'ONSITE' | 'HYBRID'"
}
```

##### 400 Bad Request (Empty Location Preferences)

```json
{
  "error": "At least one location preference is required"
}
```

##### 400 Bad Request (Extra Fields)

```json
{
  "error": "Unexpected property"
}
```

##### 401 Unauthorized

```json
{
  "error": "Unauthorized"
}
```

##### 500 Internal Server Error

```json
{
  "message": "Internal server error"
}
```

#### Notes

- **Validation:** All fields are strictly validated using Zod schema
- **Strict Mode:** Extra fields in the request body are rejected
- **Constraints:** At least one location preference must be provided
- **Idempotency:** POST may fail if preferences already exist (use PATCH for updates)
- **User Association:** Preferences are linked to the authenticated user's ID

---

### 5. Get User Preferences

#### Description

Fetches the authenticated user's existing preferences. Returns 404 if no preferences have been created yet.

#### Method & Route

- **Method:** GET
- **Route:** `/preferences`

#### Headers

```json
{
  "Authorization": "Bearer <clerk_token>"
}
```

#### Request

No request body or query parameters.

#### Success Response

- **Status Code:** 200 OK

```json
{
  "userId": 42,
  "seniority": "FULLTIME",
  "locationPreferences": ["REMOTE", "HYBRID"],
  "createdAt": "2026-04-10T12:34:56.789Z",
  "updatedAt": "2026-04-10T12:35:10.123Z"
}
```

#### Error Responses

##### 401 Unauthorized

```json
{
  "error": "Unauthorized"
}
```

##### 404 Not Found

```json
{
  "message": "Preferences not found"
}
```

##### 500 Internal Server Error

```json
{
  "message": "Internal server error"
}
```

#### Notes

- Returns 404 if user hasn't created preferences yet (use POST `/preferences` first)
- Lightweight endpoint—no complex processing
- `createdAt` and `updatedAt` timestamps indicate when preferences were initially created and last modified

---

### 6. Update User Preferences

#### Description

Partially updates user preferences. Any omitted fields retain their current values. Both `seniority` and `locationPreferences` are optional.

#### Method & Route

- **Method:** PATCH
- **Route:** `/preferences`

#### Headers

```json
{
  "Authorization": "Bearer <clerk_token>",
  "Content-Type": "application/json"
}
```

#### Request Body (All Fields Optional)

```json
{
  "seniority": "INTERN",
  "locationPreferences": ["REMOTE"]
}
```

**Or update only seniority:**

```json
{
  "seniority": "INTERN"
}
```

**Or update only location preferences:**

```json
{
  "locationPreferences": ["REMOTE", "ONSITE"]
}
```

#### Request Schema

| Field | Type | Required | Allowed Values | Description |
| ----- | ---- | -------- | -------------- | ----------- |
| `seniority` | String | No | `INTERN`, `FULLTIME` | Update employment level (optional) |
| `locationPreferences` | Array<String> | No | `REMOTE`, `ONSITE`, `HYBRID` | Update location preferences; if provided, must have at least one value |

#### Success Response

- **Status Code:** 200 OK

```json
{
  "userId": 42,
  "seniority": "INTERN",
  "locationPreferences": ["REMOTE"],
  "createdAt": "2026-04-10T12:34:56.789Z",
  "updatedAt": "2026-04-10T12:35:45.456Z"
}
```

#### Error Responses

##### 400 Bad Request (Invalid Seniority)

```json
{
  "error": "Invalid enum value. Expected 'INTERN' | 'FULLTIME'"
}
```

##### 400 Bad Request (Empty Location Preferences Array)

```json
{
  "error": "At least one location preference is required"
}
```

##### 400 Bad Request (Extra Fields)

```json
{
  "error": "Unexpected property"
}
```

##### 401 Unauthorized

```json
{
  "error": "Unauthorized"
}
```

##### 500 Internal Server Error

```json
{
  "message": "Internal server error"
}
```

#### Notes

- **Partial Updates:** Only provided fields are updated; omitted fields are unchanged
- **Validation:** If `locationPreferences` is provided, it must contain at least one value
- **Strict Mode:** Extra fields are rejected
- **Timestamp Update:** `updatedAt` is automatically incremented
- **Atomic:** All updates are atomic; partial failures are not possible
- **Empty Endpoint:** Sending `{}` is valid but will result in no changes

---

## Data Models

### User

```json
{
  "id": "integer (primary key)",
  "clerkId": "string (unique, from Clerk)",
  "email": "string (unique)",
  "name": "string (optional)",
  "resume": "Resume | null",
  "preferences": "UserPreferences | null"
}
```

### Resume

```json
{
  "id": "UUID (primary key)",
  "userId": "string (Clerk user ID, unique foreign key to User.clerkId)",
  "fileUrl": "string (Cloudinary secure URL)",
  "publicId": "string (Cloudinary public ID for deletion)",
  "fileHash": "string (SHA-256 hash for duplicate detection)",
  "parsedData": "ParsedResume | null (null until parsing completes)",
  "uploadedAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp"
}
```

### ParsedResume

The structure of parsed resume data extracted by the AI parser:

```json
{
  "name": "string | null",
  "skills": "string[] | null",
  "currentRole": "string | null",
  "experienceYears": "number | null",
  "seniority": "enum('Intern', 'Junior', 'Mid', 'Senior') | null",
  "location": "string | null",
  "remote": "boolean | null",
  "techStack": "object (map of strings) | null",
  "projects": "any[] | null",
  "keywords": "string[] | null",
  "education": "object (map of strings) | null"
}
```

### UserPreferences

```json
{
  "userId": "integer (primary key, foreign key to User.id)",
  "seniority": "enum: INTERN | FULLTIME",
  "locationPreferences": "array: ONSITE | HYBRID | REMOTE",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp"
}
```

---

## Resume Upload Pipeline

The resume upload process follows this sequence:

```
1. User sends file
   ↓
2. Clerk middleware validates JWT
   ↓
3. Multer (memoryStorage) buffers file
   ↓
4. validateFileMagicBytes checks file signature (is it really PDF/DOCX?)
   ↓
5. uploadResumeHandler in controller:
   a. Sync Clerk user to database
   b. Generate file hash
   c. Check for existing resume
   d. Compare file hash (if exists) → skip if unchanged
   e. Upload to Cloudinary
   f. Upsert into PostgreSQL Resume table
   g. Delete old resume from Cloudinary (if successful)
   h. Trigger parsing asynchronously (non-blocking)
   ↓
6. Return success response
```

### Key Features

- **Hash-based Duplicate Detection:** Prevents re-uploading identical files
- **Transactional Safety:** Rollback Cloudinary upload if database fails
- **Async Parsing:** Parsing job is queued non-blockingly; response returns immediately
- **File Cleanup:** Old files are automatically removed from Cloudinary
- **Magic Byte Validation:** Prevents spoofed file uploads

---

## Authentication Flow

```
1. User authenticates via Clerk on frontend
   ↓
2. Clerk issues JWT token
   ↓
3. Frontend stores token in session/cookies
   ↓
4. Frontend includes token in Authorization header:
   Authorization: Bearer <token>
   ↓
5. Backend @clerk/express middleware validates token
   ↓
6. protectedRoute middleware checks if userId exists
   ↓
7. userId injected into req.auth.userId
   ↓
8. Controller uses req.auth.userId for DB operations
```

---

## Error Handling Strategy

### Response Format

All error responses include:
- **Status Code:** HTTP status (400, 401, 404, 500)
- **Error Message:** Brief description of the issue
- **Message Field:** Additional context (for some endpoints)

### Common Status Codes

| Status | Meaning | Typical Cause |
| ------ | ------- | ------------- |
| 200 | OK | Successful request |
| 201 | Created | Resource successfully created (POST) |
| 202 | Accepted | Request accepted; processing asynchronously (parsing in progress) |
| 400 | Bad Request | Invalid input, validation failure |
| 401 | Unauthorized | Missing/invalid JWT token |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server-side error or database failure |

### Validation

- **Zod Schemas:** All request bodies are validated using Zod
- **Type Checking:** Enum values are strictly checked
- **Strict Mode:** Extra fields are rejected (`strict()`)
- **Array Validation:** Minimum length constraints are enforced

---

## Environment Variables

### Required Variables

| Variable | Type | Example | Description |
| -------- | ---- | ------- | ----------- |
| `DATABASE_URL` | string | `postgresql://user:pass@localhost:5432/cvpilot` | PostgreSQL connection string |
| `CLOUDINARY_CLOUD_NAME` | string | `your-cloud-name` | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | string | `123456789` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | string | `secret123abc` | Cloudinary API secret |
| `CLERK_SECRET_KEY` | string | `sk_test_...` | Clerk secret key for token validation |

### Optional Variables

| Variable | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `FRONTEND_URL` | string | `http://localhost:5173` | Frontend URL for CORS origin |
| `NODE_ENV` | string | `development` | Environment (development, production) |
| `PORT` | number | `3000` | Server port |

### Setup

Create a `.env` file in the backend root:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cvpilot"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud"
CLOUDINARY_API_KEY="12345"
CLOUDINARY_API_SECRET="secret"

# Clerk
CLERK_SECRET_KEY="sk_test_abc123"

# Frontend
FRONTEND_URL="http://localhost:5173"

# Node
NODE_ENV="development"
PORT="3000"
```

---

## Setup & Running Locally

### Prerequisites

- **Node.js:** v18+ (check with `node --version`)
- **PostgreSQL:** v13+ (local or remote)
- **pnpm:** v8+ (or npm/yarn as alternative)

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/yb175/CVPilot.git
cd CVPilot/backend
```

2. **Install dependencies:**

```bash
pnpm install
```

3. **Set up environment variables:**

```bash
cp .env.example .env
# Edit .env with your database, Cloudinary, and Clerk credentials
```

4. **Create PostgreSQL database:**

```bash
createdb cvpilot
```

5. **Run Prisma migrations:**

```bash
pnpm exec prisma migrate dev
```

This will:
- Apply all pending migrations
- Generate Prisma client code in `generated/prisma`

6. **Verify setup:**

```bash
pnpm exec prisma studio
```

Opens Prisma Studio to view the database schema and records.

### Running the Server

#### Development

```bash
pnpm dev
```

Server runs on `http://localhost:3000` with hot reload (via tsx).

#### Production Build

```bash
pnpm build
```

Compiles TypeScript and runs the Prisma import fix script.

#### Production Run

```bash
pnpm start
```

Runs the compiled JavaScript from `dist/server.js`.

### Testing the API

#### Test Health Check

```bash
curl http://localhost:3000/health
```

Expected response: `OK`

#### Test Auth Endpoint (with Clerk token)

```bash
curl -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  http://localhost:3000/auth/me
```

Expected response:

```json
{
  "success": true,
  "user": {
    "userId": "user_...",
    "sessionId": "sess_...",
    "orgId": null
  }
}
```

#### Test Resume Upload

```bash
curl -X POST http://localhost:3000/resume \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -F "file=@/path/to/resume.pdf"
```

Expected response (new file):

```json
{
  "message": "Resume uploaded",
  "changed": true,
  "fileUrl": "https://res.cloudinary.com/..."
}
```

#### Test Get Parsed Resume

```bash
curl -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  http://localhost:3000/resume
```

Expected response (if parsing complete):

```json
{
  "message": "Resume parsed successfully",
  "parsedData": { ... },
  "uploadedAt": "2026-04-10T14:22:33.456Z",
  "fileUrl": "https://res.cloudinary.com/..."
}
```

Expected response (if parsing in progress):

```json
{
  "message": "Resume uploaded but still parsing. Try again in a few seconds.",
  "fileUrl": "https://res.cloudinary.com/...",
  "uploadedAt": "2026-04-10T14:22:33.456Z"
}
```

---

## Project Structure

```
backend/
├── config/              # Configuration files (Cloudinary, etc.)
├── controller/          # Route handlers (business logic)
├── generated/           # Auto-generated Prisma client code
├── lib/                 # Utility functions (hashing, Prisma client)
├── middleware/          # Express middleware (auth, upload, validation)
├── prisma/              # Prisma schema and migrations
├── route/               # Express route definitions
├── scripts/             # Build scripts (Prisma import fix)
├── service/             # Service layer (database, Cloudinary, parsing)
├── validators/          # Zod validation schemas
├── server.ts            # Express app entry point
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript configuration
└── README.md            # Project documentation
```

---

## Future Enhancements

### Recently Implemented

- ✅ **Get Parsed Resume Data:** `GET /resume` endpoint now available to retrieve parsed resume with polling support
- ✅ **User Preference Management:** Full CRUD for user preferences (seniority level, location preferences)
- ✅ **Resume Upload Pipeline:** Complete upload, validation, and async parsing trigger

### Planned Features

- **Resume Parsing Queue:** Integration with BullMQ for managed async parsing jobs
- **Resume Deletion:** `DELETE /resume` endpoint for removing resumes
- **Batch Operations:** Support multiple resumes per user (portfolio/history)
- **Analytics:** Endpoint for tracking resume updates and parsing success rates
- **GraphQL API:** Alternative to REST for complex queries
- **Webhooks:** Event notifications for parsing completion and other lifecycle events

### Known Limitations

- **Single Resume:** Only one resume per user (previous one is overwritten)
- **Parsing Timeout:** Parsing jobs are fire-and-forget (no timeout enforcement yet)
- **File Size Limits:** Constrained by multer and Cloudinary tier limits
- **No Resume History:** Previous resumes are deleted after new upload
- **Manual Job Triggers:** Parsing is triggered ad-hoc (no scheduled re-parsing)

---

## Support & Troubleshooting

### Common Issues

**CORS Errors**
- Ensure `FRONTEND_URL` matches your frontend origin
- Check browser console for specific origin
- Update `.env` if frontend is running on a different port

**Database Connection Error**
- Verify `DATABASE_URL` in `.env`
- Check PostgreSQL is running (`sudo service postgresql status`)
- Run `pnpm exec prisma db push` to sync schema

**Cloudinary Upload Fails**
- Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Check Cloudinary account is active and not rate-limited
- Ensure file size is within Cloudinary limits

**Clerk Token Invalid**
- Verify `CLERK_SECRET_KEY` matches your Clerk project
- Check token is being sent in `Authorization: Bearer <token>` format
- Ensure token is not expired

### Debugging

Enable verbose logging:

```bash
DEBUG=* pnpm dev
```

Monitor database queries:

```bash
pnpm exec prisma studio
```

Check Cloudinary uploads:

```bash
# In Cloudinary dashboard → Media Library
```

---

## License

This project is proprietary. All rights reserved.

---

## Contact

For API support or questions, contact the team at: `backend@cvpilot.dev`

---

**Last Updated:** April 11, 2026  
**API Version:** 1.1.0  
**Status:** Production-Ready

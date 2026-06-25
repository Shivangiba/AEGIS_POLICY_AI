# Security Policy

## ⚠️ Credential Rotation Required

Credentials were previously committed in plaintext in `backend/.env`. Even though `.env` is now in `.gitignore`, the secrets exist in **git history** and must be rotated immediately.

### Action Items

#### 1. Rotate Your GROQ API Key
1. Go to [https://console.groq.com](https://console.groq.com) → **API Keys**
2. Revoke the exposed key
3. Create a new key
4. Update `backend/.env` with the new value

#### 2. Rotate Your MongoDB Atlas Password
1. Go to [MongoDB Atlas](https://cloud.mongodb.com) → **Database Access**
2. Edit the user `Shivangiba`
3. Set a new strong password (16+ chars, mixed case, symbols)
4. Update `backend/.env` with the new connection string

#### 3. Remove Secrets from Git History

After rotating credentials, purge the old secrets from git history using `git-filter-repo`:

```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove backend/.env from ALL commits in history
git filter-repo --path backend/.env --invert-paths --force

# Re-add your remote (filter-repo removes it as a safety measure)
git remote add origin <your-remote-url>

# Force-push all branches to overwrite remote history
git push origin --force --all
git push origin --force --tags
```

> **Warning:** Force-pushing rewrites history. Notify all collaborators to re-clone the repository after this operation.

---

## Environment Variable Security

### Backend (`backend/.env`)

| Variable | Source | Notes |
|---|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys | Rotate immediately if exposed |
| `MONGODB_URI` | MongoDB Atlas → Connect → Drivers | Change password if exposed |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Settings → API → JWT Secret | Required — no fallback |
| `EMBEDDING_MODEL` | HuggingFace model name | Safe to share |
| `CHUNK_SIZE` | Integer | Safe to share |
| `CHUNK_OVERLAP` | Integer | Safe to share |
| `ALLOWED_ORIGINS` | Comma-separated URLs | Safe to share |

### Frontend (`frontend/.env.local`)

| Variable | Source | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | Safe to expose in browser (NEXT_PUBLIC_ prefix) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon/public key | Safe to expose (anon key, not secret key) |
| `BACKEND_URL` | Your FastAPI server URL | Server-side only — not exposed to browser |
| `NEXT_PUBLIC_API_URL` | Your FastAPI server URL | Exposed to browser via SSR fallback |

---

## Supabase Row Level Security (RLS)

The current application uses MongoDB for conversation data storage and Supabase only for authentication. If you ever migrate conversation or document storage to Supabase tables, **enable RLS on every table before writing a single row of user data**.

### RLS Checklist (for future Supabase table usage)
- [ ] Enable RLS on the table: `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
- [ ] Create a `SELECT` policy: users can only read their own rows (`auth.uid() = user_id`)
- [ ] Create an `INSERT` policy: users can only insert rows with their own `user_id`
- [ ] Create an `UPDATE` policy: users can only update their own rows
- [ ] Create a `DELETE` policy: users can only delete their own rows
- [ ] Test with a second user account to verify isolation

### Example RLS Policy

```sql
-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own conversations
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
USING (auth.uid()::text = user_id);

-- Allow users to insert only for themselves
CREATE POLICY "Users can insert own conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid()::text = user_id);
```

---

## In-Memory Session Warning

`VectorStoreManager` in `backend/app/services/vector_store.py` stores all document sessions in a Python dictionary (`self.sessions`) in process memory.

**Consequences:**
- A server **restart** wipes all active sessions → users get "Session expired" errors mid-chat
- **Horizontal scaling** (multiple backend workers) means sessions are not shared → users randomly hit workers that don't have their session

**Current mitigation:** The UI requires a document upload to start a new chat. If a session is lost, users see a clear error and can re-upload.

**Future fix:** Persist sessions to Redis or disk-backed ChromaDB for resilience.

---

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please do **not** open a public GitHub issue. Instead, email the maintainer directly with details of the vulnerability. We will acknowledge receipt within 48 hours and provide a fix timeline.

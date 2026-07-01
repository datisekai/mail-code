# Gmail OAuth2 Setup Guide

Follow these steps once to get your Gmail credentials.

---

## Step 1: Create a Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click **Select a project** → **New Project**
3. Name it (e.g. `shared-inbox`) → **Create**

---

## Step 2: Enable the Gmail API

1. In the project, go to **APIs & Services** → **Library**
2. Search for **Gmail API** → Click it → **Enable**

---

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** → **Create**
3. Fill in:
   - App name: `Shared Inbox`
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue** through all steps (scopes, test users)
5. On **Test users** step → **Add Users** → add the Gmail address you want to read from
6. Finish setup

---

## Step 4: Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Application type: **Desktop app**
4. Name: `shared-inbox-client` → **Create**
5. Copy your **Client ID** and **Client Secret** — you'll need them

---

## Step 5: Get the Refresh Token (OAuth2 Playground)

1. Open https://developers.google.com/oauthplayground/
2. Click the gear icon (⚙️) top-right → check **Use your own OAuth credentials**
3. Enter your **Client ID** and **Client Secret** → Close
4. In **Step 1** (left panel), find and select:
   ```
   Gmail API v1 → https://www.googleapis.com/auth/gmail.readonly
   ```
5. Click **Authorize APIs** → Sign in with the Gmail account you want to read from → Allow
6. In **Step 2**, click **Exchange authorization code for tokens**
7. Copy the **Refresh token** value

---

## Step 6: Generate a Secret Access Token

Run this command to generate a strong 32-byte token:

```bash
openssl rand -hex 32
```

Copy the output — this becomes your `ACCESS_TOKEN`.

---

## Step 7: Configure Your .env File

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
GMAIL_CLIENT_ID=<your client ID from Step 4>
GMAIL_CLIENT_SECRET=<your client secret from Step 4>
GMAIL_REFRESH_TOKEN=<your refresh token from Step 5>
ACCESS_TOKEN=<your generated token from Step 6>
NEXT_PUBLIC_API_URL=http://YOUR_VPS_IP:3001
```

---

## Step 8: Share the Inbox URL

Your team's inbox URL will be:

```
http://YOUR_VPS_IP:3000/inbox/<ACCESS_TOKEN>
```

Share this URL with your team. Anyone with the link can view the inbox.

To revoke access, change `ACCESS_TOKEN` in `.env` and redeploy.

---

## Firewall Notes (VPS)

Make sure these ports are open:

```bash
# Example for Ubuntu with ufw
sudo ufw allow 3000/tcp   # Frontend
sudo ufw allow 3001/tcp   # Backend
```

Or better: put both behind an nginx reverse proxy on port 80/443.

---

## Local Development

```bash
# Backend
cd backend
cp ../.env.example .env   # fill in credentials
npm install
npm run start:dev

# Frontend (in another terminal)
cd frontend
cp ../.env.example .env   # set NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev
```

Then open: http://localhost:3000/inbox/YOUR_ACCESS_TOKEN

# Deploying Miemploya AuditOps to Go54 Web Hosting

This guide outlines the steps to host your Node.js application on Go54 (formerly Whogohost) using their cPanel "Setup Node.js App" feature.

## ⚠️ Important Note
Your application has been successfully migrated to **MySQL**, which is compatible with Go54.
- `server/db.ts` uses `mysql2`.
- `shared/schema.ts` uses `mysqlTable`.
- `drizzle.config.ts` is configured for `mysql`.

You can now proceed directly to building and deploying.

### Step 1: Prepare the Codebase (Local Machine)

1.  **Fix Database Compatibility**:
    - Update `server/db.ts` to use `mysql2` and `drizzle-orm/mysql2`.
    - Update `shared/schema.ts` to replace all `pgTable` definitions with `mysqlTable` and ensure all types are imported from `drizzle-orm/mysql-core`.
    - Install MySQL dependencies: `npm install mysql2 drizzle-orm` and remove `pg`.

2.  **Build the Application**:
    Run the build script to generate the production bundle.
    ```bash
    npm run build
    ```
    This creates a `dist/` directory containing:
    - `index.cjs` (The server bundle)
    - `public/` (The frontend static files)

### Step 2: Prepare the Server (Go54 cPanel)

1.  **Create a MySQL Database**:
    - Log in to cPanel.
    - Go to **MySQL Databases**.
    - Create a new database (e.g., `username_auditops`).
    - Create a new user and password.
    - Add the user to the database with **ALL PRIVILEGES**.
    - Note down the credentials.

2.  **Setup Node.js App**:
    - Go to **Software > Setup Node.js App**.
    - Click **Create Application**.
    - **Node.js Version**: Select **20.x** (or whichever matches your local `node -v`).
    - **Application Mode**: Production.
    - **Application Root**: `auditops` (this is the folder name in File Manager).
    - **Application URL**: Select your domain.
    - **Application Startup File**: `dist/index.cjs`
    - Click **Create**.

### Step 3: Upload Files

1.  **Prepare a Zip File**:
    Compress the following files/folders from your local project into `deploy.zip`:
    - `dist/` (folder)
    - `package.json` (file)
    - `package-lock.json` (file)
    - `.env` (optional, strictly for reference; see Step 4)

2.  **Upload to cPanel**:
    - Go to **File Manager**.
    - Navigate to the `auditops` folder specificed in Step 2.
    - Upload `deploy.zip` and **Extract** it.
    - Ensure the structure is:
        ```text
        /auditops
          ├── package.json
          └── dist/
               ├── index.cjs
               └── public/
        ```

### Step 4: Configure & Install

1.  **Install Dependencies**:
    - Back in **Setup Node.js App** (edit your app).
    - Click **Run NPM Install**. This creates `node_modules` on the server.
    - *Note: This is required for external dependencies like `bcrypt`.*

2.  **Environment Variables**:
    - In the Node.js App settings, scroll to "Environment Variables".
    - Add the following keys (values from your local `.env` but updated for production):
        - `DATABASE_URL`: `mysql://db_user:db_pass@127.0.0.1:3306/db_name`
        - `NODE_ENV`: `production`
        - `SESSION_SECRET`: (your secret)
        - `PORT`: (Go54 usually assigns one automatically, but you can set `3000`)
    - Click **Save**.

### Step 5: Start the Application

1.  **Restart**:
    - Click **Restart Application** in the Node.js App interface.

2.  **Verify**:
    - Visit your website URL.
    - You should see the application running.
    - If you see an error, check the `stderr.log` in the `auditops` folder in File Manager.

## Troubleshooting
- **Database Connection Errors**: Verify `DATABASE_URL` matches your cPanel MySQL credentials.
- **500 Errors**: Check logs. If "module not found", ensure `npm install` completed successfully.
- **Static Files 404**: Ensure `server/index.ts` (now `dist/index.cjs`) correctly points to `dist/public`.

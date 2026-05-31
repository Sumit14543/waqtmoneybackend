# Waqt Money Deployment

## cPanel / Hostinger Deployment

Use the live frontend on `https://waqtmoney.com` and run the Node API on a cPanel Node.js app, preferably on `https://api.waqtmoney.com`.

### Frontend

1. Set the production frontend env:

   ```env
   VITE_API_BASE_URL=https://api.waqtmoney.com/api
   ```

2. Build locally:

   ```bash
   npm run build
   ```

3. Upload the contents of `dist/` to `public_html/`.
4. Keep `.htaccess` in `public_html/` so React routes refresh correctly.

### Backend

1. In cPanel, create a Node.js app:
   - Application root: `Server`
   - Startup file: `Server.js`
   - Node version: 20+ recommended
   - Application URL: `api.waqtmoney.com`

2. Upload the `Server/` folder without `node_modules`, `.env.local`, or `.env.production`.
3. In cPanel Terminal inside `Server/`, run:

   ```bash
   npm install --omit=dev
   ```

4. Add production environment variables in cPanel Node.js app settings. Required:

   ```env
   APP_ENV=production
   NODE_ENV=production
   CLIENT_BASE_URL=https://waqtmoney.com
   API_PUBLIC_BASE_URL=https://api.waqtmoney.com
   CORS_ORIGINS=https://waqtmoney.com,https://www.waqtmoney.com
   ALLOW_LOCAL_CORS=false
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=your_cpanel_db_name
   DB_USER=your_cpanel_db_user
   DB_PASS=your_cpanel_db_password
   JWT_SECRET=use_a_strong_secret
   APP_SECRET_KEY=use_a_different_strong_secret
   CASHFREE_ENV=production
   CASHFREE_CLIENT_ID=your_cashfree_prod_client_id
   CASHFREE_CLIENT_SECRET=your_cashfree_prod_client_secret
   CASHFREE_ALLOWED_ORIGIN=https://waqtmoney.com,https://www.waqtmoney.com
   CASHFREE_RETURN_URL=https://waqtmoney.com/repayment/make-payment?order_id={order_id}&application_id={application_id}
   ```

5. Restart the Node.js app from cPanel.

### Security Notes

- Do not commit `.env`, `.env.local`, `.env.production`, `node_modules`, `dist`, or zip backups.
- Use cPanel environment variables for secrets.
- Cashfree production checkout must be started from `https://waqtmoney.com` or `https://www.waqtmoney.com`, not localhost.

/*
 * Aurevia advanced-mode Cloudflare Worker.
 * This adapter lets the same project work with Cloudflare Pages Direct Upload
 * because dashboard drag-and-drop can compile a root _worker.js even though it
 * does not compile a /functions directory.
 */
import { onRequestPost as register } from './functions/api/auth/register.js';
import { onRequestPost as login } from './functions/api/auth/login.js';
import { onRequestPost as logout } from './functions/api/auth/logout.js';
import { onRequestGet as me } from './functions/api/auth/me.js';
import { onRequestPost as password } from './functions/api/auth/password.js';
import { onRequestPut as authProfile } from './functions/api/auth/profile.js';
import { onRequestGet as accountOverview } from './functions/api/account/overview.js';
import { onRequestGet as accountProfile, onRequestPut as accountProfilePut } from './functions/api/account/profile.js';
import { onRequestGet as beneficiaries, onRequestPost as beneficiaryCreate } from './functions/api/account/beneficiary.js';
import { onRequestGet as banks } from './functions/api/banks/index.js';
import { onRequestGet as notifications } from './functions/api/notifications.js';
import { onRequestPost as deposit } from './functions/api/transactions/deposit.js';
import { onRequestGet as history } from './functions/api/transactions/history.js';
import { onRequestPost as upgrade } from './functions/api/transactions/upgrade.js';
import { onRequestGet as verify } from './functions/api/transactions/verify.js';
import { onRequestPost as withdraw } from './functions/api/transactions/withdraw.js';
import { onRequestGet as health } from './functions/api/health.js';
import { onRequestPost as paystackWebhook } from './functions/api/payments/paystack-webhook.js';
import { onRequestPost as transferWebhook } from './functions/api/payments/transfer-webhook.js';
import { onRequestGet as adminUsers, onRequestPut as adminUsersPut } from './functions/api/admin/users.js';
import { onRequestGet as adminUser } from './functions/api/admin/user.js';
import { onRequestGet as adminTransactions } from './functions/api/admin/transactions.js';
import { onRequestGet as adminFinance, onRequestPut as adminFinancePut } from './functions/api/admin/finance.js';
import { onRequestPost as adminBootstrap } from './functions/api/admin/bootstrap.js';
import { onRequestGet as liveTrades } from './functions/api/trades/live.js';
import { onRequestGet as adminTrades, onRequestPost as adminTradesPost } from './functions/api/admin/trades.js';

const routes = {
  'POST /api/auth/register': register,
  'POST /api/auth/login': login,
  'POST /api/auth/logout': logout,
  'GET /api/auth/me': me,
  'POST /api/auth/password': password,
  'PUT /api/auth/profile': authProfile,
  'GET /api/account/overview': accountOverview,
  'GET /api/account/profile': accountProfile,
  'PUT /api/account/profile': accountProfilePut,
  'GET /api/account/beneficiary': beneficiaries,
  'POST /api/account/beneficiary': beneficiaryCreate,
  'GET /api/banks': banks,
  'GET /api/notifications': notifications,
  'POST /api/transactions/deposit': deposit,
  'GET /api/transactions/history': history,
  'POST /api/transactions/upgrade': upgrade,
  'GET /api/transactions/verify': verify,
  'POST /api/transactions/withdraw': withdraw,
  'GET /api/health': health,
  'POST /api/payments/paystack-webhook': paystackWebhook,
  'POST /api/payments/transfer-webhook': transferWebhook,
  'GET /api/admin/users': adminUsers,
  'PUT /api/admin/users': adminUsersPut,
  'GET /api/admin/user': adminUser,
  'GET /api/admin/transactions': adminTransactions,
  'GET /api/admin/finance': adminFinance,
  'PUT /api/admin/finance': adminFinancePut,
  'POST /api/admin/bootstrap': adminBootstrap,
  'GET /api/trades/live': liveTrades,
  'GET /api/admin/trades': adminTrades,
  'POST /api/admin/trades': adminTradesPost
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const key = `${request.method.toUpperCase()} ${url.pathname}`;
    const handler = routes[key];
    if (handler) {
      try {
        // Authentication/account APIs require D1. If the dashboard deployment
        // has not been given a DB binding yet, return a machine-readable 503.
        // The frontend can then use its account-continuity path instead of
        // displaying the misleading generic "Request failed" message.
        if (!env.DB && url.pathname.startsWith('/api/auth/')) {
          return Response.json({ error: 'ACCOUNT_BACKEND_NOT_CONFIGURED', message: 'Aurevia account storage is not connected to this deployment yet.' }, { status: 503 });
        }
        return await handler({ request, env, params: {}, waitUntil: ctx.waitUntil.bind(ctx), next: () => env.ASSETS.fetch(request) });
      } catch (err) {
        if (err instanceof Response) return err;
        return Response.json({ error: 'ACCOUNT_SERVICE_UNAVAILABLE', message: 'Aurevia account service is temporarily unavailable.' }, { status: 503 });
      }
    }
    if (url.pathname.startsWith('/api/')) return Response.json({ error: 'API route not found.' }, { status: 404 });
    return env.ASSETS.fetch(request);
  }
};

/**
 * Account deletion — client side.
 *
 * The actual deletion is privileged (it deletes the Auth user and bypasses
 * row ownership across several tables), which no client SDK call can do
 * safely. This just invokes the `delete-account` Appwrite Function and
 * reports back what it said; the Function is the authority on whether the
 * confirmation phrase was right and on what actually gets deleted. See
 * `functions/delete-account/` for the server-side implementation and
 * `docs/APPWRITE_SETUP.md` for how to deploy it.
 *
 * A fresh `Client` is constructed here rather than reusing the one inside
 * `@appwrite.io/react`'s provider, because the Web SDK authenticates via a
 * session cookie scoped to the endpoint + project — any `Client` pointed at
 * the same pair, in the same browser tab, is already "logged in". This keeps
 * the helper independent of exactly which services the provider's hook
 * exposes.
 */

import { Client, Functions } from 'appwrite';

import { APPWRITE, FUNCTIONS } from '../lib/appwrite';

export interface DeleteAccountOutcome {
  success: boolean;
  error?: string;
}

export async function deleteAccount(confirmationPhrase: string): Promise<DeleteAccountOutcome> {
  const client = new Client().setEndpoint(APPWRITE.endpoint).setProject(APPWRITE.projectId);
  const functions = new Functions(client);

  let execution;
  try {
    execution = await functions.createExecution({
      functionId: FUNCTIONS.deleteAccount,
      body: JSON.stringify({ confirmationPhrase }),
      async: false,
    });
  } catch {
    return { success: false, error: 'Could not reach the server. Check your connection and try again.' };
  }

  // The function always responds with JSON, success or failure, so a parse
  // failure here means something upstream (a proxy, a cold-start timeout)
  // ate the real response rather than the function itself rejecting cleanly.
  let parsed: { success?: boolean; error?: string } = {};
  try {
    parsed = JSON.parse(execution.responseBody || '{}');
  } catch {
    return { success: false, error: 'Unexpected response from the server. Nothing was deleted — try again.' };
  }

  if (execution.responseStatusCode && execution.responseStatusCode >= 400) {
    return { success: false, error: parsed.error ?? 'Account deletion failed.' };
  }

  return { success: Boolean(parsed.success), error: parsed.error };
}

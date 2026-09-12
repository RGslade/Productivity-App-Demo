import { supabase } from '../lib/supabase';
import { userService } from './userService';
import { LoginResponse } from '@/types/user';
import type { Provider } from '@supabase/supabase-js';

//const userId = (await userService.getUserProfile()).id; WOAH WOAH DO NOT USE THIS. THIS CUASES AN ERROR THAT IS ONLY RECOGNISABLE AT RUNTIME AND NOT EDIT, BUT THE ERROR INDICATES NOTHING TO DO WITH THIS LINE (TOOK ME FUCKING AGES TO FIND)

/** Masks an email address before it is written to auth diagnostics. */
const maskEmailForLog = (value: string): string => {
    const [localPart = '', domain = ''] = value.split('@');
    const maskedLocal = localPart.length <= 2
        ? `${localPart.charAt(0) || '*'}***`
        : `${localPart.slice(0, 2)}***`;

    return domain ? `${maskedLocal}@${domain}` : maskedLocal;
};

/** Formats unknown Edge Function error fields without losing object detail. */
const formatFunctionErrorDetail = (value: unknown): string | null => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    if (typeof value === 'string') {
        return value;
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

/** Detects network-level Edge Function failures that callers may handle as availability states. */
const isFunctionFetchError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const { name } = error as { name?: string };
    return name === 'FunctionsFetchError';
};

class DatabaseService {
    async getSingleOrCreate<T>(table: string, uniqueIdentifierName?: string, uniqueIdentifier?: any): Promise<{ data: T, error: any }> {
        const userId = (await userService.getUserProfile())?.id;
        const { data, error } = uniqueIdentifierName && uniqueIdentifier ? await supabase.from(table).select('*').eq('user_id', userId).eq(uniqueIdentifierName, uniqueIdentifier).single() : await supabase.from(table).select('*').eq('user_id', userId).single();
        if (error) {
            if (error.code === 'PGRST116') {
                if (error.details.includes(' 0 rows')) {
                    const insertData = { user_id: userId };
                    const { data: insertedData, error: insertError } = await supabase.from(table).insert(insertData).select().single();

                    if (insertError) {
                        if (insertError.code === '23505') {
                            const { data: existingData, error: existingError } = uniqueIdentifierName && uniqueIdentifier ? await supabase.from(table).select('*').eq('user_id', userId).eq(uniqueIdentifierName, uniqueIdentifier).single() : await supabase.from(table).select('*').eq('user_id', userId).single();
                            if (existingError) {
                                throw new Error(existingError.message);
                            }
                            return { data: existingData as T, error: null };
                        }
                        throw new Error(insertError.message);
                    }

                    return { data: insertedData as T, error: null };
                }
            }
            throw new Error(error.message);
        }
        return { data: data as T, error };
    }

    async getSingleGlobal<T>(table: string, uniqueIdentifierName: string, uniqueIdentifier: any): Promise<{ data: T, error: any }> {
        const { data, error } = await supabase.from(table).select('*').eq(uniqueIdentifierName, uniqueIdentifier).single();
        if (error) {
            if (error.details?.includes(' 0 rows')) {
                return { data: {} as T, error: null };
            }
            error.hint = table
            console.error('DBService.getsingleglobal', error, data);
            throw new Error(error.message);
        }
        return { data: data as T, error };
    }

    async getSingle<T>(table: string, additionalFields?: string | undefined, uniqueIdentifierName?: string, uniqueIdentifier?: any): Promise<{ data: T, error: any }> {
        const selectors = additionalFields ? "*, " + additionalFields : "*";

        const { data, error } = uniqueIdentifierName && uniqueIdentifier ? await supabase.from(table).select(selectors).eq(uniqueIdentifierName, uniqueIdentifier).single() : await supabase.from(table).select(selectors).eq('user_id', (await userService.getUserProfile())?.id).single();
        if (error) {
            console.error('DBService.getsingle', error, data);
            //throw new Error(error.message); Uncommented as it needs to return error for handling in calling functions
        }
        return { data: data as T, error };
    }

    async getAllGlobal<T>(table: string, orderField?: string): Promise<{ data: T[], error: any }> {
        const { data, error } = orderField ? await supabase.from(table).select('*').order(orderField) : await supabase.from(table).select('*');
        if (error) {
            console.error('DBService.getallGlobal', error, data);
            throw new Error(error.message);
        }
        return { data: data as T[], error };
    }

    async getAll<T>(table: string, orderField?: string, suppressErrorLog: boolean = false): Promise<{ data: T[], error: any }> {
        const { data, error } = orderField ? await supabase.from(table).select('*').eq('user_id', (await userService.getUserProfile())?.id).order(orderField) : await supabase.from(table).select('*').eq('user_id', (await userService.getUserProfile())?.id);
        if (error) {
            if (!suppressErrorLog) {
                console.error('DBService.getall', error, data);
            }
            throw new Error(error.message);
        }
        return { data: data as T[], error };
    }

    async getAllWithFilter<T>(table: string, filterField: string, filterValue: any, orderField?: string, suppressErrorLog: boolean = false): Promise<{ data: T[], error: any }> {
        const { data, error } = orderField ? await supabase.from(table).select('*').eq(filterField, filterValue).order(orderField) : await supabase.from(table).select('*').eq(filterField, filterValue);
        if (error) {
            if (!suppressErrorLog) {
                console.error('DBService.getAllWithFilter', error, data);
            }
            throw error;
        }
        return { data: data as T[], error };
    }

    async getRange<T>(table: string, rangeField: string, from: any, to: any, orderField?: string, uniqueIdentifierName?: string, uniqueIdentifier?: any): Promise<{ data: T[], error: any }> {
        const { data, error } = orderField ? await supabase.from(table).select('*').eq('user_id', (await userService.getUserProfile())?.id).gte(rangeField, from).lte(rangeField, to).order(orderField) : uniqueIdentifierName && uniqueIdentifier ? await supabase.from(table).select('*').eq('user_id', (await userService.getUserProfile())?.id).gte(rangeField, from).lte(rangeField, to).eq(uniqueIdentifierName, uniqueIdentifier) : await supabase.from(table).select('*').eq('user_id', (await userService.getUserProfile())?.id).gte(rangeField, from).lte(rangeField, to);
        if (error) {
            console.error('DBService.getRange', error, data);
            throw new Error(error.message);
        }

        return { data: data as T[], error };
    }

    async updateTable<T>(table: string, updates: object, additionalFields?: string, uniqueIdentifierName?: string, uniqueIdentifier?: any): Promise<{ data: T, error: any }> {
        const selectors = additionalFields ? "*, " + additionalFields : "*"
        const { data, error } = uniqueIdentifierName && uniqueIdentifier ? await supabase.from(table).update({ ...updates, updated_at: new Date().toISOString() }).eq('user_id', (await userService.getUserProfile())?.id).eq(uniqueIdentifierName, uniqueIdentifier).select(selectors).single() : await supabase.from(table).update({ ...updates, updated_at: new Date().toISOString() }).eq('user_id', (await userService.getUserProfile())?.id).select(selectors).single();
        if (error) {
            console.error('DBService.updateTable', error);
            throw new Error(error.message);
        }
        return { data: data as T, error };
    }

    async updateTableGlobal<T>(table: string, updates: object, additionalFields?: string, uniqueIdentifierName?: string, uniqueIdentifier?: any): Promise<{ data: T, error: any }> {
        const selectors = additionalFields ? "*, " + additionalFields : "*"
        const { data, error } = uniqueIdentifierName && uniqueIdentifier ? await supabase.from(table).update({ ...updates, updated_at: new Date().toISOString() }).eq(uniqueIdentifierName, uniqueIdentifier).select(selectors).single() : await supabase.from(table).update({ ...updates, updated_at: new Date().toISOString() }).select(selectors).single();
        if (error) {
            console.error('DBService.updateTable', error);
            throw new Error(error.message);
        }
        return { data: data as T, error };
    }

    async insertToTableGlobal(table: string, item: any, additionalFields?: string, uniqueIdentifierName?: string, uniqueIdentifier?: any): Promise<any> {
        const selectors = additionalFields ? "*, " + additionalFields : "*"
        const { data, error } = uniqueIdentifierName && uniqueIdentifier ? await supabase.from(table).insert({ ...item, created_at: new Date().toISOString(), user_id: (await userService.getUserProfile())?.id }).eq(uniqueIdentifierName, uniqueIdentifier).select(selectors).single() : await supabase.from(table).insert({ ...item, created_at: new Date().toISOString(), user_id: (await userService.getUserProfile())?.id }).select(selectors).single();
        if (error) {
            console.error('DBService.insertToTable', error);
            throw new Error(error.message);
        }
        return data;
    }

    async insertToTable<T>(table: string, item: any): Promise<{ data: T, error: any }> {
        const isUserScoped =
            table === 'Conversations' ||
            table === 'ToDoItems' ||
            table === 'ToDoChecklistItems' ||
            table.includes('UserSettings') ||
            table === 'Feedback' ||
            table === 'Transactions' ||
            table === 'CustomLinks' ||
            table === 'LifeNestMonthlyUsage' ||
            table === 'LifeNestTokenPurchases';
        const insertData = isUserScoped
            ? { ...item, created_at: new Date().toISOString(), user_id: (await userService.getUserProfile())?.id }
            : { ...item, created_at: new Date().toISOString() };
        const { data, error } = await supabase.from(table).insert(insertData);
        if (error) {
            console.error('DBService.insertToTable error:', error);
            throw new Error(error.message);
        }
        return { data: data as T, error };
    }

     async insertAndSelect<T>(table: string, item: any, uniqueIdentifierName?: string, uniqueIdentifier?: any, additionalFields?: string): Promise<{ data: T, error: any }> {
        const selectors = additionalFields ? "*, " + additionalFields : "*"
        const insertData = { ...item, created_at: new Date().toISOString(), user_id: (await userService.getUserProfile())?.id };
        const { data, error } = uniqueIdentifier && uniqueIdentifierName ? await supabase.from(table).insert(insertData).eq(uniqueIdentifierName, uniqueIdentifier).select(selectors).single() : await supabase.from(table).insert(insertData).select(selectors).single();
        return { data: data as T, error };
     }

    async deleteFromTable(table: string, uniqueIdentifierName?: string, uniqueIdentifier?: any): Promise<{ data: null, error: any }> {
        const query = supabase.from(table);
        const finalQuery = uniqueIdentifierName && uniqueIdentifier ? query.delete().eq(uniqueIdentifierName, uniqueIdentifier) : query.delete().eq('user_id', (await userService.getUserProfile())?.id);

        const { error } = await finalQuery;
        if (error) {
            console.error('DBService.deleteFromTable', error);
            throw new Error(error.message);
        }
        // Supabase DELETE requests do not return row data unless explicitly selected.
        // Keep the helper response consistent with the other database methods so
        // callers can safely inspect `error` on successful deletes as well.
        return { data: null, error };
    }

    async signInWithPassword(email: string, password: string): Promise<LoginResponse> {
        const maskedEmail = maskEmailForLog(email);
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        }).then(async (res) => {
            return res;
        }).catch((error) => {
            console.error('[Auth][DatabaseService] Supabase signInWithPassword threw before response', {
                email: maskedEmail,
                message: error instanceof Error ? error.message : String(error),
                code: typeof error === 'object' && error ? (error as { code?: string }).code : undefined,
                status: typeof error === 'object' && error ? (error as { status?: number }).status : undefined,
            });
            throw error;
        });

        if (error) {
            console.error('[Auth][DatabaseService] Supabase signInWithPassword returned error', {
                email: maskedEmail,
                message: error.message,
                code: error.code,
                status: error.status,
            });
            throw error;
        }

        if (!data?.user || !data?.session) {
            console.error('[Auth][DatabaseService] Supabase signInWithPassword returned an incomplete auth payload', {
                email: maskedEmail,
                hasUser: Boolean(data?.user),
                hasSession: Boolean(data?.session),
            });
            throw new Error('INVALID_CREDENTIALS');
        }
        const result = {
            id: data.user?.id || '',
            email: data.user?.email || '',
            last_sign_in_at: data.user?.last_sign_in_at || '',
            created_at: data.user?.created_at || ''
        };
        return result;
    }

    async signOut(): Promise<void> {
        await supabase.auth.signOut();
    }

    async signInWithOAuth(provider: Provider, redirectTo: string, scopes?: string): Promise<string> {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo,
                scopes,
                skipBrowserRedirect: true,
            },
        });
        if (error || !data?.url) {
            console.error('DBService.signInWithOAuth', error);
            throw error || new Error('OAuth URL was not returned');
        }
        return data.url;
    }

    async exchangeCodeForSession(code: string): Promise<void> {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error('DBService.exchangeCodeForSession', error);
            throw error;
        }
    }

    async setSessionFromOAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
        const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
        if (error) {
            console.error('DBService.setSessionFromOAuthTokens', error);
            throw error;
        }
    }

    async signUp(email: string, password: string, options?: { data?: Record<string, unknown> }): Promise<any> {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options,
        });
        return { data: signUpData, error: signUpError };
    }

    async executeFunction(functionName: string, payload: object): Promise<any> {
        const { data, error } = await supabase.functions.invoke(functionName, {
            body: JSON.stringify(payload),

        });
        if (error) {
            const enrichedMessage = [
                functionName,
                error.message || 'Function invocation failed',
                typeof error === 'object' && error && 'context' in error ? formatFunctionErrorDetail((error as { context?: unknown }).context) : null,
                typeof error === 'object' && error && 'details' in error ? formatFunctionErrorDetail((error as { details?: unknown }).details) : null,
                typeof error === 'object' && error && 'hint' in error ? formatFunctionErrorDetail((error as { hint?: unknown }).hint) : null,
            ].filter(Boolean).join(' | ');
            const log = isFunctionFetchError(error) ? console.warn : console.error;
            log('DBService.executeFunction', {
                functionName,
                payloadKeys: Object.keys(payload),
                error,
                enrichedMessage,
            });
            throw new Error(enrichedMessage);
        }
        return data;
    }

    async executeRpc(functionName: string, payload?: object): Promise<any> {
        const { data, error } = await supabase.rpc(functionName, payload);
        if (error) {
            console.error('DBService.executeRpc', functionName, error);
            throw new Error(error.message);
        }
        return data;
    }

    async updateUser(updates: object): Promise<any> {
        const { data, error } = await supabase.auth.updateUser(updates);
        if (error) {
            console.error('DBService.updateUser', error);
            throw error;
        }
        return data;
    }

    async resetPasswordForEmail(email: string, redirectTo?: string): Promise<any> {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
        if (error) {
            console.error('DBService.resetPasswordForEmail', error);
            throw error;
        }
        return data;
    }

    async verifyRecoveryCode(email: string, token: string): Promise<any> {
        const { data, error } = await supabase.auth.verifyOtp({email, token, type: 'recovery',});
        if (error) {
            console.error('DBService.verifyRecoveryCode', error);
            throw error;
        }
        return data;
    }
}
const databaseService = new DatabaseService();
export default databaseService;

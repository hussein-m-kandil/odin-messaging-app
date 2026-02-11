import { environment as devEnv } from './environment.development';

const backendHost = '';
const backendUrl = '';
const apiPath = '/api/v1';
const apiUrl = `${backendUrl}${apiPath}`;

export const environment = { ...devEnv, apiUrl, apiPath, backendUrl, backendHost };

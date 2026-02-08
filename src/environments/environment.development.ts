const apiPath = '/api/v1';
const backendHost = '127.0.0.1:8080';
const backendUrl = `http://${backendHost}`;
const apiUrl = `${backendUrl}${apiPath}`;

const title = 'Odin Messaging App';

export const environment = { title, apiUrl, apiPath, backendUrl, backendHost };

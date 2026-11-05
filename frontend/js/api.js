const USE_MOCK = true;
const API_BASE = '';
const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const LOGIN_PAGE = 'login.html';

class ApiError extends Error
{
    constructor(message, status)
    {
        super(message);
        this.status = status;
    }
}

function getToken()
{
    return localStorage.getItem(TOKEN_KEY);
}

function getUser()
{
    try
    {
        return JSON.parse(localStorage.getItem(USER_KEY));
    }
    catch (error)
    {
        return null;
    }
}

function saveSession(token, user)
{
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession()
{
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function isAuthPage()
{
    const path = window.location.pathname;
    return path.endsWith('login.html') || path.endsWith('register.html');
}

function dashboardFor(role)
{
    return role === 'recruiter' ? 'recruiter.html' : 'candidate.html';
}

function guardPage(role)
{
    const user = getUser();

    if (!getToken() || !user)
    {
        window.location.href = LOGIN_PAGE;
        return null;
    }

    if (role && user.role !== role)
    {
        window.location.href = dashboardFor(user.role);
        return null;
    }

    return user;
}

function friendlyMessage(status, serverMessage)
{
    if (serverMessage)
    {
        return serverMessage;
    }

    switch (status)
    {
        case 0:
            return 'Cannot reach the server. Please check your connection and try again.';
        case 400:
            return 'Please check the information you entered and try again.';
        case 401:
            return 'Please log in to continue.';
        case 403:
            return 'You do not have permission to do this.';
        case 404:
            return 'We could not find what you were looking for.';
        case 409:
            return 'This conflicts with existing data. Please review and try again.';
        default:
            return 'Something went wrong on our side. Please try again in a moment.';
    }
}

function handleFailure(status, serverMessage)
{
    if (status === 401 && !isAuthPage())
    {
        clearSession();
        window.location.href = LOGIN_PAGE;
        throw new ApiError('Your session has expired. Please log in again.', 401);
    }

    throw new ApiError(friendlyMessage(status, serverMessage), status);
}

async function request(method, path, body)
{
    if (USE_MOCK)
    {
        try
        {
            return await MockApi.handle(method, path, body, getToken());
        }
        catch (mockError)
        {
            return handleFailure(mockError.status || 500, mockError.message);
        }
    }

    const headers = {};
    const token = getToken();
    const options = { method: method, headers: headers };

    if (token)
    {
        headers.Authorization = 'Bearer ' + token;
    }

    if (body instanceof FormData)
    {
        options.body = body;
    }
    else if (body !== undefined)
    {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    let response;

    try
    {
        response = await fetch(API_BASE + path, options);
    }
    catch (networkError)
    {
        throw new ApiError(friendlyMessage(0), 0);
    }

    let data = null;

    try
    {
        data = await response.json();
    }
    catch (parseError)
    {
        data = null;
    }

    if (!response.ok)
    {
        const serverMessage = data ? (data.error || data.message) : null;
        return handleFailure(response.status, serverMessage);
    }

    return data;
}

const Api =
{
    get(path)
    {
        return request('GET', path);
    },

    post(path, body)
    {
        return request('POST', path, body);
    },

    put(path, body)
    {
        return request('PUT', path, body);
    },

    patch(path, body)
    {
        return request('PATCH', path, body);
    },

    del(path)
    {
        return request('DELETE', path);
    },

    upload(path, formData)
    {
        return request('POST', path, formData);
    }
};

async function logout()
{
    try
    {
        await Api.post('/api/auth/logout');
    }
    catch (error)
    {
        // Logging out locally is enough if the server cannot be reached.
    }

    clearSession();
    window.location.href = LOGIN_PAGE;
}

function showToast(message, type)
{
    let container = document.getElementById('toast-container');

    if (!container)
    {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(function ()
    {
        toast.remove();
    }, 3500);
}
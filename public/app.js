const api = '/customers'
const tabs = document.querySelectorAll('.tab')
const loginForm = document.querySelector('#login-form')
const registerForm = document.querySelector('#register-form')
const profileView = document.querySelector('#profile-view')
const notice = document.querySelector('#notice')
const kicker = document.querySelector('#panel-kicker')

function showNotice(message, isError = false) {
    notice.textContent = message
    notice.className = `notice show${isError ? ' error' : ''}`
}

function clearNotice() {
    notice.className = 'notice'
    notice.textContent = ''
}

async function request(path, options = {}) {
    const response = await fetch(`${api}${path}`, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || 'Something went wrong')
    return data
}

function switchView(view) {
    tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.view === view))
    loginForm.classList.toggle('hidden', view !== 'login')
    registerForm.classList.toggle('hidden', view !== 'register')
    profileView.classList.add('hidden')
    kicker.textContent = view === 'login' ? 'WELCOME BACK' : 'NEW CUSTOMER'
    clearNotice()
}

tabs.forEach((tab) => tab.addEventListener('click', () => switchView(tab.dataset.view)))

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(loginForm)
    try {
        await request('/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) })
        await loadProfile()
        showNotice('You are signed in. Welcome back.')
    } catch (error) { showNotice(error.message, true) }
})

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(registerForm)
    try {
        await request('/register', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) })
        loginForm.reset()
        switchView('login')
        showNotice('Account created. You can sign in now.')
    } catch (error) { showNotice(error.message, true) }
})

async function loadProfile() {
    const customer = await request('/me')
    loginForm.classList.add('hidden')
    registerForm.classList.add('hidden')
    tabs.forEach((tab) => tab.classList.remove('active'))
    profileView.classList.remove('hidden')
    kicker.textContent = 'CUSTOMER PROFILE'
    document.querySelector('#profile-name').textContent = customer.fullName
    document.querySelector('#profile-email').textContent = customer.email
    document.querySelector('#profile-phone').textContent = customer.phone
    document.querySelector('#avatar').textContent = customer.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}

document.querySelector('#logout-button').addEventListener('click', async () => {
    try { await request('/logout', { method: 'POST' }); profileView.classList.add('hidden'); switchView('login'); showNotice('You have been signed out.') } catch (error) { showNotice(error.message, true) }
})

document.querySelector('#password-button').addEventListener('click', async () => {
    const oldPassword = window.prompt('Enter your current password')
    const newPassword = window.prompt('Enter your new password (6+ characters)')
    if (!oldPassword || !newPassword) return
    try { await request('/change-password', { method: 'PATCH', body: JSON.stringify({ oldPassword, newPassword }) }); showNotice('Password changed successfully.') } catch (error) { showNotice(error.message, true) }
})

loadProfile().catch(() => {})

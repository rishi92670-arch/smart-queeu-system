// js/login.js

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    db.onReady(() => {
        const config = db.getConfig();
        if (config) {
            document.title = `Login | ${config.name}`;
            document.getElementById('orgNameNav').textContent = config.name;
        }
        lucide.createIcons();
    });

    document.getElementById('btnLogin').onclick = handleLogin;
    
    // Allow pressing enter to login
    document.getElementById('password').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
});

function handleLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    const authenticatedUser = db.authenticate(user, pass);
    
    if (authenticatedUser) {
        localStorage.setItem('qsync_user', JSON.stringify(authenticatedUser));
        window.location.href = 'dashboard.html';
    } else {
        document.getElementById('errorMsg').style.display = 'block';
    }
}

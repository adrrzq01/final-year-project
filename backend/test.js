(async () => {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@bridgify.edu', password: 'password123' })
    });
    
    if (!loginRes.ok) throw new Error('Login failed: ' + loginRes.status);
    const loginData = await loginRes.json();
    
    if (loginData.user.role !== 'ADMIN') throw new Error('Not admin');
    const token = loginData.token;
    
    try {
      const putRes = await fetch('http://localhost:5000/api/admin/settings', {
        method: 'PUT',
        headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ activeParity: 'EVEN' })
      });
      const putData = await putRes.json();
      console.log('PUT Status:', putRes.status);
      console.log('PUT Data:', putData);
    } catch(err) {
      console.error('PUT Error Response:', err.message);
    }
  } catch (err) {
    console.error('Login Error:', err.message);
  }
})();

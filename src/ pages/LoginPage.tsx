import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import axios from 'axios';

export default function LoginPage() {
  const setUser = useAppStore((s) => s.setUser);
  const setRole = useAppStore((s) => s.setRole);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      setUser(res.data.user);
      setRole(res.data.role);
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (err) {
      setError('Email ou mot de passe incorrect.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={handleLogin} className="bg-white p-8 shadow-md rounded w-80">
        <h2 className="text-xl font-bold mb-4">Connexion</h2>
        <input type="email" className="border p-2 mb-2 w-full rounded" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" className="border p-2 mb-4 w-full rounded" placeholder="Mot de passe"
          value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full">Se connecter</button>
      </form>
    </div>
  );
}

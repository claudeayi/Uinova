import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/auth/register', { email, password, name });
      navigate('/login');
    } catch (err) {
      setError('Erreur lors de la création du compte.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={handleRegister} className="bg-white p-8 shadow-md rounded w-80">
        <h2 className="text-xl font-bold mb-4">Inscription</h2>
        <input type="text" className="border p-2 mb-2 w-full rounded" placeholder="Nom complet"
          value={name} onChange={e => setName(e.target.value)} required />
        <input type="email" className="border p-2 mb-2 w-full rounded" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" className="border p-2 mb-4 w-full rounded" placeholder="Mot de passe"
          value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full">Créer un compte</button>
      </form>
    </div>
  );
}

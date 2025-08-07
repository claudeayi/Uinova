import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const user = useAppStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    axios.get('http://localhost:5000/api/projects', {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
    })
      .then(res => setProjects(res.data))
      .catch(() => {});
  }, [user]);

  if (!user) {
    return <div className="p-10">Veuillez vous connecter.</div>;
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">Mes projets</h1>
      <button className="bg-blue-600 text-white px-4 py-2 rounded mb-6"
        on

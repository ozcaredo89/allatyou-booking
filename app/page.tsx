"use client";

import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { supabase } from '../utils/supabase/client';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format, parse, getDay, locales,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
});

export default function AdminCalendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estado inicial del formulario
  const [formData, setFormData] = useState({ 
    clientName: '', 
    date: format(new Date(), 'yyyy-MM-dd'), 
    time: '09:00' 
  });

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`id, start_time, end_time, clients(name)`);
    
    if (error) return console.error(error);

    setEvents(data?.map((app: any) => ({
      id: app.id,
      title: `💅 ${app.clients?.name || 'Cita'}`,
      start: new Date(app.start_time),
      end: new Date(app.end_time),
    })) || []);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Crear cliente (MVP: Siempre crea uno nuevo o podrías buscarlo)
    const { data: client, error: cErr } = await supabase
      .from('clients')
      .insert([{ name: formData.clientName }])
      .select()
      .single();

    if (client) {
      const start = new Date(`${formData.date}T${formData.time}`);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hora de duración

      // 2. Crear la cita
      const { error: aErr } = await supabase
        .from('appointments')
        .insert([{
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          client_id: client.id,
          status: 'confirmed'
        }]);

      if (!aErr) {
        setIsModalOpen(false);
        setFormData({ ...formData, clientName: '' }); // Limpiar campo
        fetchAppointments();
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b p-5 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-pink-600">Jennifer Nails 💅</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión de Agenda</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-pink-600 text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-pink-200 active:scale-95 transition-all"
        >
          + Nueva Cita
        </button>
      </header>

      <main className="p-4 max-w-7xl mx-auto h-[calc(100vh-120px)]">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden h-full border border-slate-100">
          <Calendar 
            localizer={localizer} 
            events={events} 
            culture="es" 
            messages={{ today: "Hoy", next: ">", previous: "<", month: "Mes", agenda: "Lista" }}
            className="modern-calendar" 
          />
        </div>
      </main>

      {/* MODAL DE AGENDAMIENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">Agendar Cita</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-500">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Nombre de la Clienta</label>
                <input 
                  required 
                  className="w-full bg-slate-100 border-none rounded-2xl p-4 focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                  placeholder="Ej. Alexandra Vargas"
                  value={formData.clientName}
                  onChange={e => setFormData({...formData, clientName: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Fecha</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-100 border-none rounded-2xl p-4 outline-none"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Hora</label>
                  <input 
                    type="time" 
                    className="w-full bg-slate-100 border-none rounded-2xl p-4 outline-none"
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 font-bold text-slate-400"
                >
                  Cerrar
                </button>
                <button 
                  disabled={loading} 
                  className="flex-1 bg-pink-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-pink-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Agendando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .modern-calendar { padding: 15px; border: none !important; }
        .rbc-header { padding: 15px !important; font-weight: 800 !important; color: #94a3b8 !important; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; }
        .rbc-event { background: #db2777 !important; border-radius: 12px !important; border: none !important; padding: 5px 10px !important; font-size: 0.8rem; font-weight: 600; }
        .rbc-today { background: #fff1f2 !important; }
        .rbc-off-range-bg { background: #f8fafc !important; }
        .rbc-toolbar button { border-radius: 10px !important; border: 1px solid #f1f5f9 !important; font-weight: 700 !important; color: #64748b !important; }
        .rbc-toolbar button.rbc-active { background: #f1f5f9 !important; color: #1e293b !important; }
      `}</style>
    </div>
  );
}
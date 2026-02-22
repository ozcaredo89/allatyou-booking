"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { supabase } from '../utils/supabase/client';
import { MessageCircle } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format, parse, getDay, locales,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
});

export function AdminCalendarClient() {
  const [events, setEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({ 
    clientName: '', 
    date: format(new Date(), 'yyyy-MM-dd'), 
    time: '09:00' 
  });

  const whatsappNumber = "+573204153349";
  const whatsappMessage = encodeURIComponent("Hola Jennifer! Estoy interesad@ en agendar un arreglo de uñas ¿Me puedes agendar?");

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
    const { data: client } = await supabase.from('clients').insert([{ name: formData.clientName }]).select().single();
    if (client) {
      const start = new Date(`${formData.date}T${formData.time}`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const { error } = await supabase.from('appointments').insert([{
        start_time: start.toISOString(), end_time: end.toISOString(), client_id: client.id, status: 'confirmed'
      }]);
      if (!error) {
        setIsModalOpen(false);
        setFormData({ ...formData, clientName: '' });
        fetchAppointments();
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FFF9FB] font-sans text-slate-800">
      {/* HEADER SLIM & MODERN (GLASSMORPHISM) */}
      <header className="bg-white/80 backdrop-blur-md border-b border-pink-100/50 px-6 py-3 sticky top-0 z-30 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-8">
          {/* Logo con el nuevo SVG horizontal (Optimizado para legibilidad) */}
          <div className="relative w-56 h-12">
            <Image 
              src="/logo-jennifer3.svg" 
              alt="Jennifer Nails" 
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          
          {/* Separador visual minimalista */}
          <div className="hidden md:block h-8 w-[1.5px] bg-pink-100" /> 
          
          {/* Tagline de ubicación */}
          <div className="hidden md:block">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-tight">
              La Unión, Valle 🍇 <span className="text-pink-300 mx-1">|</span> Capital Vitivinícola
            </p>
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:shadow-gold-200/50 hover:shadow-xl text-white px-7 py-2.5 rounded-xl font-bold transition-all transform active:scale-95 text-sm"
        >
          + Nueva Cita
        </button>
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="p-4 md:p-8 max-w-[1440px] mx-auto h-[calc(100vh-80px)]">
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(255,192,203,0.15)] overflow-hidden h-full border border-white">
          <Calendar 
            localizer={localizer} 
            events={events} 
            culture="es" 
            messages={{ 
              today: "Hoy", 
              next: "Sig.", 
              previous: "Ant.", 
              month: "Mes", 
              week: "Semana", 
              day: "Día", 
              agenda: "Lista" 
            }}
            className="modern-calendar" 
          />
        </div>
      </main>

      {/* BOTÓN WHATSAPP FLOTANTE (ESTILO APP NATIVA) */}
      <a 
        href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-10 right-10 bg-[#25D366] text-white p-4 rounded-2xl shadow-2xl hover:scale-110 active:scale-90 transition-all z-50 group"
      >
        <MessageCircle size={28} />
      </a>

      {/* MODAL DE AGENDAMIENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border-t-[10px] border-[#D4AF37]">
            <h2 className="text-2xl font-black text-slate-800 mb-6 italic">Agendar Belleza ✨</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <input 
                required 
                className="w-full bg-pink-50/30 border-2 border-pink-50 rounded-2xl p-4 focus:border-[#D4AF37] focus:bg-white outline-none transition-all"
                placeholder="Nombre de la clienta"
                value={formData.clientName}
                onChange={e => setFormData({...formData, clientName: e.target.value})}
              />
              <div className="flex gap-3">
                <input type="date" className="flex-1 bg-slate-50 rounded-2xl p-4 outline-none border border-slate-100" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                <input type="time" className="w-32 bg-slate-50 rounded-2xl p-4 outline-none border border-slate-100" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
              </div>
              <button disabled={loading} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:brightness-110 transition-all">
                {loading ? 'Procesando...' : 'Confirmar Cita'}
              </button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-bold text-sm">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {/* REFINAMIENTO DE UI VÍA CSS */}
      <style jsx global>{`
        .modern-calendar { padding: 25px; border: none !important; }
        .rbc-header { 
          border-bottom: 2px solid #FFF1F2 !important; 
          padding: 15px !important; 
          font-weight: 700 !important; 
          color: #D4AF37 !important; 
          text-transform: uppercase; 
          letter-spacing: 1px;
          font-size: 0.75rem;
        }
        .rbc-month-view, .rbc-time-view { border: none !important; }
        .rbc-day-bg { border-left: 1px solid #FFF1F2 !important; }
        .rbc-day-bg:first-child { border-left: none !important; }
        .rbc-month-row { border-top: 1px solid #FFF1F2 !important; }
        .rbc-event { 
          background: #FFF1F2 !important; 
          color: #BE185D !important; 
          border: none !important; 
          border-left: 4px solid #F472B6 !important; 
          padding: 5px 10px !important; 
          border-radius: 8px !important; 
          font-weight: 700 !important;
          font-size: 0.8rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .rbc-today { background: #FFF9FB !important; }
        .rbc-off-range-bg { background: #FAFAFA !important; opacity: 0.4; }
        .rbc-toolbar { margin-bottom: 30px !important; }
        .rbc-toolbar button { 
          border: 1px solid #FFF1F2 !important; 
          color: #64748b !important; 
          font-weight: 700 !important; 
          padding: 10px 22px !important; 
          border-radius: 14px !important; 
          transition: all 0.2s;
          background: white;
        }
        .rbc-toolbar button:hover { background: #FFF1F2 !important; color: #D4AF37 !important; }
        .rbc-toolbar button.rbc-active { 
          background: #D4AF37 !important; 
          color: white !important; 
          border-color: #D4AF37 !important;
          box-shadow: 0 4px 15px rgba(212,175,55,0.3); 
        }
        .rbc-toolbar-label { font-weight: 900 !important; font-size: 1.4rem !important; color: #1e293b !important; text-transform: capitalize; }
      `}</style>
    </div>
  );
}
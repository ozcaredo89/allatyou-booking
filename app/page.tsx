"use client";

import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale/es'; // Calendario en español
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../utils/supabase/client'; 

// Configuración del idioma
const locales = {
  'es': es,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

export default function AdminCalendar() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    // Traemos las citas cruzando datos con clientes y servicios
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        status,
        clients ( name ),
        services ( title )
      `);

    if (error) {
      console.error("Error al traer citas:", error);
      return;
    }

    // Formateamos para que el calendario lo entienda
    const formattedEvents = data?.map(app => ({
      id: app.id,
      title: `${app.clients?.name || 'Bloqueo'} - ${app.services?.title || 'Personal'}`,
      start: new Date(app.start_time),
      end: new Date(app.end_time),
    })) || [];

    setEvents(formattedEvents);
  };

  return (
    <div className="p-4 md:p-8 h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto bg-white p-4 md:p-6 rounded-xl shadow-lg h-[90%] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Agenda Jennifer Nails 💅</h1>
          <button className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            + Nueva Cita
          </button>
        </div>
        
        <div className="flex-grow">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            culture="es"
            messages={{
              next: "Sig",
              previous: "Ant",
              today: "Hoy",
              month: "Mes",
              week: "Semana",
              day: "Día",
              agenda: "Agenda"
            }}
            style={{ height: '100%' }}
            className="rounded-lg border font-sans"
          />
        </div>
      </div>
    </div>
  );
}

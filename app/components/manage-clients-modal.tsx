"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../utils/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale/es";
import {
    X, Search, User, History, Image as ImageIcon,
    Trash2, Upload, Calendar as CalendarIcon, Phone,
    FileText, Loader2, Save
} from "lucide-react";

interface ManageClientsModalProps {
    onClose: () => void;
}

export function ManageClientsModal({ onClose }: ManageClientsModalProps) {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClient, setSelectedClient] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<"profile" | "history" | "gallery">("profile");

    // Estado del perfil
    const [profileData, setProfileData] = useState({ name: "", phone: "", notes: "", preferences: "" });
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Estados dependientes
    const [appointmentsH, setAppointmentsH] = useState<any[]>([]);
    const [photos, setPhotos] = useState<any[]>([]);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        const { data } = await supabase.from('clients').select('*').order('name', { ascending: true });
        setClients(data || []);
        setLoading(false);
    };

    const handleSelectClient = (client: any) => {
        setSelectedClient(client);
        setProfileData({
            name: client.name || "",
            phone: client.phone || "",
            notes: client.notes || "",
            preferences: client.preferences || ""
        });
        setActiveTab("profile");
        fetchClientData(client.id);
    };

    const fetchClientData = async (clientId: number) => {
        // Historial
        const { data: hist } = await supabase.from('appointments')
            .select('*, services(title)')
            .eq('client_id', clientId)
            .order('start_time', { ascending: false });

        setAppointmentsH(hist || []);

        // Fotos de Trabajos
        const { data: pics } = await supabase.from('client_photos')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        setPhotos(pics || []);
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) return;
        setIsSavingProfile(true);

        try {
            const { error } = await supabase.from('clients').update({
                name: profileData.name,
                phone: profileData.phone,
                notes: profileData.notes,
                preferences: profileData.preferences
            }).eq('id', selectedClient.id);

            if (error) throw error;

            // Actualizar localmente
            const updatedClient = { ...selectedClient, ...profileData };
            setSelectedClient(updatedClient);
            setClients(clients.map(c => c.id === selectedClient.id ? updatedClient : c));
            alert("Perfil actualizado!");
        } catch (error) {
            console.error(error);
            alert("Error actualizando el perfil");
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedClient) return;

        setIsUploadingPhoto(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            // 1. Subir a Cloudflare a través de nuestro endpoint seguro
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Error subiendo archivo');
            }

            const fileUrl = result.url; // URL retornada por Cloudflare

            // 2. Guardar referencia en Supabase Database
            const { error } = await supabase.from('client_photos').insert([{
                client_id: selectedClient.id,
                photo_url: fileUrl,
                description: 'Subido desde panel'
            }]);

            if (error) throw error;

            // Refrescar lista de fotos
            fetchClientData(selectedClient.id);

        } catch (error: any) {
            console.error("Upload error:", error);
            alert("Error subiendo imagen: " + error.message);
        } finally {
            setIsUploadingPhoto(false);
            // resetear el input
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDeletePhoto = async (photoId: number) => {
        if (!confirm("¿Segura de eliminar esta foto del historial de trabajos?")) return;
        try {
            const { error } = await supabase.from('client_photos').delete().eq('id', photoId);
            if (error) throw error;
            setPhotos(photos.filter(p => p.id !== photoId));
        } catch (err) {
            console.error(err);
            alert("Error eliminando foto");
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-5xl shadow-2xl border-t-[8px] border-pink-400 h-[85vh] flex overflow-hidden">

                {/* PANEL LATERAL: Lista de clientes */}
                <div className="w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-4">
                            <User className="text-pink-400" /> Clientes
                        </h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-pink-400 rounded-xl outline-none text-sm transition-all shadow-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-2">
                        {loading ? (
                            <p className="text-center text-slate-400 mt-10 animate-pulse text-sm">Cargando...</p>
                        ) : filteredClients.length > 0 ? (
                            filteredClients.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handleSelectClient(c)}
                                    className={`w-full text-left p-4 rounded-2xl transition-all border ${selectedClient?.id === c.id ? 'bg-pink-50 border-pink-200 shadow-sm' : 'bg-white border-transparent hover:border-slate-200 hover:shadow-sm'}`}
                                >
                                    <p className={`font-bold ${selectedClient?.id === c.id ? 'text-pink-900' : 'text-slate-700'}`}>{c.name}</p>
                                    <p className="text-xs text-slate-500 font-medium font-mono mt-1">{c.phone}</p>
                                </button>
                            ))
                        ) : (
                            <p className="text-center text-slate-400 mt-10 text-sm">No se encontraron clientes.</p>
                        )}
                    </div>
                </div>

                {/* PANEL PRINCIPAL: Detalles del Cliente */}
                <div className="w-2/3 bg-white flex flex-col h-full relative">
                    <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                        <X size={18} />
                    </button>

                    {!selectedClient ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                            <User size={64} className="mb-4 opacity-50" />
                            <p className="font-medium">Selecciona un cliente para ver detalles</p>
                        </div>
                    ) : (
                        <>
                            {/* Header Cliente */}
                            <div className="p-8 border-b border-slate-100 pt-10">
                                <h3 className="text-3xl font-black text-slate-800">{selectedClient.name}</h3>
                                <p className="text-slate-500 font-medium mt-1 flex items-center gap-1.5 font-mono text-sm">
                                    <Phone size={14} /> {selectedClient.phone}
                                </p>

                                {/* TABS */}
                                <div className="flex gap-6 mt-8 border-b border-slate-100">
                                    <button onClick={() => setActiveTab('profile')} className={`pb-3 font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'profile' ? 'text-pink-600 border-b-2 border-pink-500' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <User size={16} /> Perfil y Preferencias
                                    </button>
                                    <button onClick={() => setActiveTab('history')} className={`pb-3 font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'history' ? 'text-pink-600 border-b-2 border-pink-500' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <History size={16} /> Historial Citas
                                    </button>
                                    <button onClick={() => setActiveTab('gallery')} className={`pb-3 font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'gallery' ? 'text-pink-600 border-b-2 border-pink-500' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <ImageIcon size={16} /> Galería de Trabajos
                                    </button>
                                </div>
                            </div>

                            {/* Contenido (Scrolleable) */}
                            <div className="flex-1 overflow-y-auto scrollbar-hide p-8 bg-slate-50/50">

                                {/* TAB 1: PERFIL */}
                                {activeTab === 'profile' && (
                                    <form onSubmit={handleSaveProfile} className="max-w-xl space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Nombre Completo</label>
                                            <input required className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:border-pink-400 outline-none transition-all shadow-sm" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase ml-1 block mb-1">Teléfono o WhatsApp</label>
                                            <input required className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:border-pink-400 outline-none transition-all shadow-sm font-mono" value={profileData.phone} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 ml-1 mb-1">
                                                <FileText size={14} /> Notas Internas
                                            </label>
                                            <textarea className="w-full bg-white border border-slate-200 rounded-xl p-3.5 focus:border-pink-400 outline-none transition-all shadow-sm min-h-[80px]" placeholder="Ej. Sensible a la lima, paga por transferencia..." value={profileData.notes} onChange={e => setProfileData({ ...profileData, notes: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-pink-500 uppercase flex items-center gap-1.5 ml-1 mb-1">
                                                ✨ Preferencias de Diseños / Estilos
                                            </label>
                                            <textarea className="w-full bg-pink-50/20 border border-pink-200 rounded-xl p-3.5 focus:border-pink-400 outline-none transition-all shadow-sm min-h-[100px]" placeholder="Ej. Acepta solo acrílico, prefiere tonos pasteles, diseño de animal print..." value={profileData.preferences} onChange={e => setProfileData({ ...profileData, preferences: e.target.value })} />
                                        </div>

                                        <div className="pt-2">
                                            <button disabled={isSavingProfile} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg flex items-center gap-2">
                                                {isSavingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                                Guardar Perfil
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* TAB 2: HISTORIAL */}
                                {activeTab === 'history' && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        {appointmentsH.length === 0 ? (
                                            <p className="text-slate-400 text-sm italic">No hay citas registradas para {selectedClient.name}.</p>
                                        ) : (
                                            <div className="relative border-l-2 border-pink-100 ml-4 pl-6 space-y-6">
                                                {appointmentsH.map(app => {
                                                    const date = new Date(app.start_time);
                                                    return (
                                                        <div key={app.id} className="relative bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                                                            <span className="absolute -left-[31px] top-6 w-4 h-4 rounded-full bg-pink-400 ring-4 ring-slate-50"></span>
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <h4 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                                                                        <CalendarIcon size={16} className="text-pink-500" />
                                                                        {format(date, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                                                                    </h4>
                                                                    <p className="text-slate-500 text-sm mt-1 font-medium bg-slate-50 inline-block px-2 py-1 rounded-md">
                                                                        {format(date, 'hh:mm a')}
                                                                    </p>
                                                                </div>
                                                                <span className="bg-pink-100/50 text-pink-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                                                    {app.services?.title || "Servicio General"}
                                                                </span>
                                                            </div>
                                                            {app.notes && (
                                                                <p className="mt-3 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                                                                    "{app.notes}"
                                                                </p>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 3: GALERÍA */}
                                {activeTab === 'gallery' && (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="flex justify-between items-end mb-6">
                                            <p className="text-sm text-slate-500">Documenta los trabajos realizados para {selectedClient.name.split(' ')[0]}.</p>

                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    ref={fileInputRef}
                                                    onChange={handleUploadPhoto}
                                                    disabled={isUploadingPhoto}
                                                />
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploadingPhoto}
                                                    className="bg-pink-50 text-pink-600 px-4 py-2.5 rounded-xl font-bold hover:bg-pink-100 transition-all shadow-sm flex items-center gap-2 text-sm border border-pink-200"
                                                >
                                                    {isUploadingPhoto ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                                    {isUploadingPhoto ? 'Subiendo...' : 'Subir Foto'}
                                                </button>
                                            </div>
                                        </div>

                                        {photos.length === 0 ? (
                                            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-slate-400">
                                                <ImageIcon size={48} className="mb-3 opacity-20" />
                                                <p>No hay fotos en el historial.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                {photos.map(p => (
                                                    <div key={p.id} className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm bg-slate-200 border border-slate-200">
                                                        <img src={p.photo_url} alt="Nails" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-3">
                                                            <span className="text-white/80 text-xs font-medium">
                                                                {format(new Date(p.created_at), 'MMM dd, yyyy')}
                                                            </span>
                                                            <button onClick={() => handleDeletePhoto(p.id)} className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-sm transition-colors">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}

// pages/CopyPage.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import Head from 'next/head';
import Layout from '@/components/layout';
// Removed Sidebar import
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Campaign, list as listCampaigns } from '@/entities/Campaign';
import axios, { AxiosResponse } from 'axios';
import { Trash2, Edit, PlusCircle, Brain, ClipboardCopy, Loader2, Save, Sparkles, Bot, ListChecks } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";

// --- INTERFACES ---
interface CopyFormData {
    title: string;
    content: string;
    cta: string;
    target_audience: string;
    status: string;
    campaign_id: string | number | null;
}

interface Copy {
    id: string;
    title: string;
    content: string;
    cta: string;
    target_audience?: string;
    status?: string;
    campaign_id: string | number | null;
    created_date?: string;
    clicks?: number;
    impressions?: number;
    conversions?: number;
    performance?: any;
}

export default function CopyPage() {
    // --- ESTADOS ---
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [copies, setCopies] = useState<Copy[]>([]);
    const [selectedCopy, setSelectedCopy] = useState<Copy | null>(null);
    const initialFormData: CopyFormData = {
        title: '', content: '', cta: '', target_audience: '',
        status: 'draft',
        campaign_id: null,
    };
    const [formData, setFormData] = useState<CopyFormData>(initialFormData);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingData, setIsFetchingData] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    // Removed Sidebar state

    // --- Style constants ---
    const neonColor = '#1E90FF';
    const neonColorMuted = '#4682B4';
    const neonRedColor = '#FF4444';
    const neonGreenColor = '#32CD32';

    const cardStyle = "bg-[#141414]/80 backdrop-blur-sm shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg border border-[hsl(var(--border))]/30";
    const neumorphicInputStyle = "bg-[#141414] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] placeholder:text-gray-500 border border-[hsl(var(--border))]/20 focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2 focus:ring-offset-[#0e1015]";
    const neumorphicButtonStyle = `bg-[#141414] border border-[hsl(var(--border))]/30 text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:bg-[hsl(var(--primary))]/10 active:scale-[0.98] active:brightness-95 transition-all duration-150 ease-out`;
    const primaryButtonStyle = `bg-gradient-to-r from-[hsl(var(--primary))] to-[${neonColorMuted}] hover:from-[${neonColorMuted}] hover:to-[hsl(var(--primary))] text-primary-foreground font-semibold shadow-[0_4px_10px_rgba(30,144,255,0.3)] transition-all duration-300 ease-in-out transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0e1015] focus:ring-[#5ca2e2]`;
    const destructiveButtonStyle = `bg-gradient-to-r from-red-600 to-red-800 hover:from-red-800 hover:to-red-600 text-white font-semibold shadow-[0_4px_10px_rgba(255,68,68,0.3)]`;
    const statusColors: { [key: string]: string } = {
        draft: 'bg-gray-600/80 border-gray-500/50',
        active: `bg-green-600/80 border-green-500/50 text-green-100 shadow-[0_0_5px_${neonGreenColor}]`,
        paused: 'bg-yellow-600/80 border-yellow-500/50 text-yellow-100',
        archived: 'bg-slate-700/80 border-slate-600/50 text-slate-300',
    };
     const getStatusBadgeClass = (status?: string) => {
        return cn("text-xs border px-2 py-0.5 rounded-full shadow-sm", statusColors[status || 'draft'] || statusColors['draft']);
     };

     // --- FUNÇÕES ---

    const loadCampaigns = async () => {
        setIsFetchingData(true); setError(null);
        try {
            const campaignData = await listCampaigns();
            setCampaigns(campaignData || []);
            if (!formData.campaign_id && campaignData && campaignData.length > 0) {
                const defaultCampaignId = campaignData[0].id;
                setFormData(prev => ({ ...initialFormData, campaign_id: defaultCampaignId }));
            }
        } catch (err: any) {
            console.error("Erro ao carregar campanhas:", err);
            setError("Falha ao carregar campanhas.");
            toast({ title: "Erro", description: "Falha ao carregar campanhas.", variant: "destructive" });
        } finally {
            setIsFetchingData(false);
        }
    };

    useEffect(() => { loadCampaigns(); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const fetchCopiesForCampaign = async () => {
            if (!formData.campaign_id) {
                setCopies([]);
                return;
            }
            setIsLoading(true); setError(null);
            try {
                const response = await axios.get(`/api/copies?campaign_id=${formData.campaign_id}`);
                setCopies(response.data || []);
            } catch (err: any) {
                console.error(`Erro ao buscar cópias para campanha ${formData.campaign_id}:`, err);
                setError("Falha ao buscar cópias para esta campanha.");
                toast({ title: "Erro", description: "Falha ao buscar cópias.", variant: "destructive" });
                setCopies([]);
            } finally {
                setIsLoading(false);
            }
        };
        if (formData.campaign_id && !isFetchingData) {
            fetchCopiesForCampaign();
        } else if (!formData.campaign_id) {
            setCopies([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.campaign_id, isFetchingData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: keyof CopyFormData) => (value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectCampaignChange = (value: string) => {
        const selectedId = campaigns.find(c => String(c.id) === value)?.id ?? null;
        if (selectedId) {
             setFormData({ ...initialFormData, campaign_id: selectedId });
             setSelectedCopy(null);
             setError(null);
        } else {
            setFormData({ ...initialFormData, campaign_id: null });
            setSelectedCopy(null);
            setCopies([]);
        }
    };

    const handleSaveCopy = async (e: React.FormEvent) => {
        e.preventDefault(); setError(null);
        if (!formData.campaign_id) {
            setError("Selecione uma campanha primeiro.");
            toast({ title: "Erro", description: "Selecione uma campanha.", variant: "destructive" });
            return;
        }
        if (!formData.title.trim() || !formData.content.trim() || !formData.cta.trim()) {
            setError("Título, Conteúdo e CTA são obrigatórios.");
            toast({ title: "Erro", description: "Preencha Título, Conteúdo e CTA.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        const apiData = {
            title: formData.title.trim(),
            content: formData.content.trim(),
            cta: formData.cta.trim(),
            target_audience: formData.target_audience?.trim() || null,
            status: formData.status || 'draft',
            campaign_id: String(formData.campaign_id),
            clicks: selectedCopy?.clicks ?? 0,
            impressions: selectedCopy?.impressions ?? 0,
            conversions: selectedCopy?.conversions ?? 0,
        };

        try {
            let response: AxiosResponse<Copy>;
            let successMessage = '';
            if (selectedCopy) {
                response = await axios.put(`/api/copies?id=${selectedCopy.id}`, apiData);
                successMessage = 'Cópia atualizada com sucesso.';
                setCopies(copies.map(c => (c.id === selectedCopy!.id ? response.data : c)));
            } else {
                response = await axios.post('/api/copies', apiData);
                successMessage = 'Nova cópia criada com sucesso.';
                setCopies(prev => [response.data, ...prev]);
            }
            toast({ title: "Sucesso!", description: successMessage });
            resetFormFields(formData.campaign_id);
            setSelectedCopy(null);
        } catch (err: any) {
            console.error("Erro ao salvar cópia:", err.response?.data || err.message);
            const errorMsg = err.response?.data?.message || "Falha ao salvar a cópia.";
            setError(errorMsg);
            toast({ title: "Erro", description: errorMsg, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateCopy = async () => {
        if (!formData.campaign_id) {
             toast({ title: "Atenção", description: "Selecione uma campanha primeiro.", variant: "default" });
             return;
        }
        setIsGenerating(true); setError(null);
        toast({ title: "IA Pensando...", description: "Gerando sugestões de copy...", variant: "default" });
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
             const generatedTitle = `Título Gerado pela IA ${Math.floor(Math.random() * 100)}`;
             const generatedContent = `Este é um conteúdo fantástico gerado automaticamente pela IA para a campanha selecionada. Ele foca em ${formData.target_audience || 'no público definido'} e promove a ação de "${formData.cta || 'clicar'}". Oferece benefícios incríveis!`;
             const generatedCta = formData.cta || "Teste Agora";
             setFormData(prev => ({ ...prev, title: generatedTitle, content: generatedContent, cta: generatedCta }));
             toast({ title: "Sucesso!", description: "Conteúdo gerado pela IA preenchido no formulário." });
        } catch (error) {
            console.error("Erro na geração IA (simulado):", error);
             setError("Falha ao gerar conteúdo com IA.");
            toast({ title: "Erro", description: "Não foi possível gerar o conteúdo.", variant: "destructive" });
        } finally {
             setIsGenerating(false);
        }
    };

    const handleSelectCopy = (copy: Copy) => {
        setSelectedCopy(copy);
        setFormData({
            title: copy.title,
            content: copy.content,
            cta: copy.cta,
            target_audience: copy.target_audience || '',
            status: copy.status || 'draft',
            campaign_id: copy.campaign_id,
        });
        setError(null);
    };

    const handleDeleteCopy = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta cópia?")) return;
        setIsLoading(true); setError(null);
        try {
            await axios.delete(`/api/copies?id=${id}`);
            setCopies(copies.filter(c => c.id !== id));
            toast({ title: "Cópia Excluída" });
            if (selectedCopy?.id === id) {
                resetFormFields(formData.campaign_id);
                setSelectedCopy(null);
            }
        } catch (err: any) {
            console.error("Erro ao excluir cópia:", err.response?.data || err.message);
            const errorMsg = err.response?.data?.message || "Falha ao excluir a cópia.";
            setError(errorMsg);
            toast({ title: "Erro", description: errorMsg, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const resetFormFields = (campaignIdToKeep: string | number | null = null) => {
        setFormData({ ...initialFormData, campaign_id: campaignIdToKeep });
        setSelectedCopy(null);
        setError(null);
    };

    const copyToClipboard = (text: string | undefined) => {
        if (text) {
            navigator.clipboard.writeText(text)
                .then(() => toast({ title: "Copiado!", description: "Conteúdo copiado para a área de transferência." }))
                .catch(err => toast({ title: "Erro", description: "Não foi possível copiar.", variant: "destructive" }));
        }
    };

    // Removed toggleSidebar function

    // --- RENDERIZAÇÃO ---
    return (
        <Layout>
          <> {/* Wrapper Fragment */}
            <Head> <title>Planejamento de Copy - USBMKT</title> </Head>
            {/* Removed outer flex div and Sidebar component */}
            <div className="space-y-6">
                <h1 className="text-2xl font-black text-white mb-6" style={{ textShadow: `0 0 8px ${neonColor}` }}>
                    Planejamento de Copy
                </h1>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Coluna Formulário e Geração IA */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className={cn(cardStyle)}>
                            <CardHeader>
                                <CardTitle className="flex items-center text-lg font-semibold text-white" style={{ textShadow: `0 0 6px ${neonColor}` }}>
                                    {selectedCopy ? <Edit size={18} className="mr-2" /> : <PlusCircle size={18} className="mr-2" />}
                                    {selectedCopy ? 'Editar Cópia' : 'Nova Cópia'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {error && <p className={cn("text-sm mb-4 p-3 rounded border text-center", destructiveButtonStyle, "bg-red-900/30 border-red-700/50 text-red-300")} style={{ textShadow: `0 0 4px ${neonRedColor}` }}>{error}</p>}
                                <form onSubmit={handleSaveCopy} className="space-y-4">
                                    {/* Select Campanha */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="campaign_id" className="text-sm text-gray-300" style={{ textShadow: `0 0 3px ${neonColorMuted}` }}>Campanha*</Label>
                                        <Select value={formData.campaign_id ? String(formData.campaign_id) : ''} onValueChange={handleSelectCampaignChange} required disabled={isFetchingData || isLoading} >
                                            <SelectTrigger id="campaign_id" className={cn(neumorphicInputStyle, "w-full h-9")}> <SelectValue placeholder={isFetchingData ? "Carregando..." : "Selecione uma campanha..."} /> </SelectTrigger>
                                            <SelectContent className="bg-[#1a1c23] border-[#2d62a3]/50 text-white">
                                                {isFetchingData && campaigns.length === 0 && <SelectItem value="loading" disabled className="text-gray-400">Carregando...</SelectItem>}
                                                {!isFetchingData && campaigns.length === 0 && <SelectItem value="no-camps" disabled className="text-gray-400">Nenhuma campanha encontrada</SelectItem>}
                                                {campaigns.map((camp) => ( <SelectItem key={camp.id} value={String(camp.id)} className="hover:bg-[#2d62a3]/30 focus:bg-[#2d62a3]/40 cursor-pointer"> {camp.name} </SelectItem> ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                     {/* Fields */}
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div className="space-y-1.5 md:col-span-2">
                                             <Label htmlFor="title" className="text-sm text-gray-300" style={{ textShadow: `0 0 3px ${neonColorMuted}` }}>Título*</Label>
                                             <Input id="title" name="title" value={formData.title} onChange={handleInputChange} placeholder="Ex: Descubra a solução ideal!" required className={cn(neumorphicInputStyle, "h-9")} />
                                         </div>
                                         <div className="space-y-1.5 md:col-span-2">
                                             <Label htmlFor="content" className="text-sm text-gray-300" style={{ textShadow: `0 0 3px ${neonColorMuted}` }}>Conteúdo*</Label>
                                             <Textarea id="content" name="content" value={formData.content} onChange={handleInputChange} placeholder="Detalhe a oferta, benefícios e diferenciais aqui..." className={cn(neumorphicInputStyle, "min-h-[120px]")} required />
                                         </div>
                                         <div className="space-y-1.5">
                                             <Label htmlFor="cta" className="text-sm text-gray-300" style={{ textShadow: `0 0 3px ${neonColorMuted}` }}>CTA* (Chamada para Ação)</Label>
                                             <Input id="cta" name="cta" value={formData.cta} onChange={handleInputChange} placeholder="Ex: Saiba Mais, Compre Agora" required className={cn(neumorphicInputStyle, "h-9")} />
                                         </div>
                                          <div className="space-y-1.5">
                                             <Label htmlFor="target_audience" className="text-sm text-gray-300" style={{ textShadow: `0 0 3px ${neonColorMuted}` }}>Público-Alvo</Label>
                                             <Input id="target_audience" name="target_audience" value={formData.target_audience} onChange={handleInputChange} placeholder="Ex: Jovens adultos interessados em..." className={cn(neumorphicInputStyle, "h-9")} />
                                         </div>
                                         <div className="space-y-1.5">
                                            <Label htmlFor="status" className="text-sm text-gray-300" style={{ textShadow: `0 0 3px ${neonColorMuted}` }}>Status</Label>
                                            <Select value={formData.status} onValueChange={handleSelectChange('status')} disabled={isLoading} >
                                                <SelectTrigger id="status" className={cn(neumorphicInputStyle, "w-full h-9")}> <SelectValue /> </SelectTrigger>
                                                <SelectContent className="bg-[#1a1c23] border-[#2d62a3]/50 text-white">
                                                    <SelectItem value="draft" className="hover:bg-[#2d62a3]/30 focus:bg-[#2d62a3]/40 cursor-pointer">Rascunho</SelectItem>
                                                    <SelectItem value="active" className="hover:bg-[#2d62a3]/30 focus:bg-[#2d62a3]/40 cursor-pointer">Ativa</SelectItem>
                                                    <SelectItem value="paused" className="hover:bg-[#2d62a3]/30 focus:bg-[#2d62a3]/40 cursor-pointer">Pausada</SelectItem>
                                                    <SelectItem value="archived" className="hover:bg-[#2d62a3]/30 focus:bg-[#2d62a3]/40 cursor-pointer">Arquivada</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                     </div>
                                    {/* Buttons */}
                                    <div className="flex justify-end gap-3 pt-4">
                                        <Button type="button" variant="outline" onClick={() => resetFormFields(formData.campaign_id)} className={cn(neumorphicButtonStyle, "text-gray-300 h-9 px-4 text-sm")} disabled={isLoading}> Limpar </Button> {/* Applied neumorphic style */}
                                        <Button type="submit" disabled={isLoading || isFetchingData || !formData.campaign_id || !formData.title.trim() || !formData.content.trim() || !formData.cta.trim()} className={cn(primaryButtonStyle, "h-9 px-4 text-sm")} > {/* Applied primary style */}
                                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                            {isLoading ? 'Salvando...' : (selectedCopy ? 'Salvar Alterações' : 'Salvar Cópia')}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                        {/* IA Generation Card */}
                        <Card className={cn(cardStyle)}>
                            <CardHeader> <CardTitle className="flex items-center text-lg font-semibold text-white" style={{ textShadow: `0 0 6px ${neonColor}` }}> <Bot size={18} className="mr-2" /> Assistente IA </CardTitle> </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-400 mb-4" style={{ textShadow: `0 0 3px ${neonColorMuted}` }}>Gere sugestões de título, conteúdo e CTA com base nos dados da campanha e público (se informado).</p>
                                <Button onClick={handleGenerateCopy} disabled={isGenerating || !formData.campaign_id || isLoading} className={cn(primaryButtonStyle, "w-full h-9 px-4 text-sm")} > {/* Applied primary style */}
                                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                    {isGenerating ? 'Gerando...' : 'Gerar Sugestões'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                    {/* Coluna Cópias da Campanha */}
                    <div className="lg:col-span-1">
                        <Card className={cn(cardStyle, "h-full flex flex-col")}>
                            <CardHeader className="flex-shrink-0 p-4 border-b border-[hsl(var(--border))]/30"> {/* Consistent padding */}
                                <CardTitle className="flex items-center text-lg font-semibold text-white" style={{ textShadow: `0 0 6px ${neonColor}` }}> <ListChecks size={18} className="mr-2" /> Cópias da Campanha </CardTitle>
                            </CardHeader>
                             <CardContent className="flex-grow p-0 overflow-hidden">
                                 <ScrollArea className="h-full px-4 py-2"> {/* Padding inside ScrollArea */}
                                     {isLoading && copies.length === 0 && ( <div className="flex justify-center items-center h-40"> <Loader2 className="h-6 w-6 animate-spin text-primary" style={{ filter: `drop-shadow(0 0 4px ${neonColor})` }} /> </div> )}
                                     {!isLoading && !formData.campaign_id && ( <p className="text-center text-gray-400 p-6 text-sm">Selecione uma campanha para ver as cópias.</p> )}
                                     {!isLoading && formData.campaign_id && copies.length === 0 && ( <p className="text-center text-gray-400 p-6 text-sm">Nenhuma cópia encontrada para esta campanha.</p> )}
                                      {!isLoading && copies.length > 0 && (
                                          <div className="space-y-3">
                                              {copies.map((copy) => (
                                                  <Card key={copy.id} className={cn( "cursor-pointer transition-all duration-200 ease-out", "bg-[#181a1f]/70 border border-[hsl(var(--border))]/20", "shadow-[3px_3px_5px_rgba(0,0,0,0.2),-3px_-3px_5px_rgba(255,255,255,0.03)]", "hover:bg-[#1E90FF]/10 hover:border-[hsl(var(--primary))]/40", selectedCopy?.id === copy.id && "ring-2 ring-[hsl(var(--primary))] ring-offset-2 ring-offset-[#0e1015] bg-[#1E90FF]/15 border-[hsl(var(--primary))]/50" )} onClick={() => handleSelectCopy(copy)} >
                                                      <CardContent className="p-3 space-y-1.5">
                                                          <div className="flex justify-between items-start gap-2">
                                                               <p className="text-sm font-semibold text-white truncate flex-1 pr-2" title={copy.title} style={{ textShadow: `0 0 4px ${selectedCopy?.id === copy.id ? neonColor : 'transparent'}` }}> {copy.title} </p>
                                                                <div className="flex gap-1 flex-shrink-0">
                                                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white p-1 transition-colors" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }} onClick={(e) => { e.stopPropagation(); copyToClipboard(copy.content); }} title="Copiar Conteúdo"> <ClipboardCopy size={12} /> </Button>
                                                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-400 hover:bg-red-900/30 p-1 transition-colors" style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '4px' }} onClick={(e) => { e.stopPropagation(); handleDeleteCopy(copy.id); }} title="Excluir Cópia" disabled={isLoading}> <Trash2 size={12} style={{ filter: `drop-shadow(0 0 3px ${neonRedColor})` }} /> </Button>
                                                               </div>
                                                          </div>
                                                          <p className="text-xs text-gray-400 line-clamp-2" title={copy.content}>{copy.content}</p>
                                                          <div className="flex justify-between items-center pt-1 gap-2">
                                                              <Badge className={getStatusBadgeClass(copy.status)}>{copy.status || 'draft'}</Badge>
                                                              <p className="text-xs text-gray-500 truncate" title={`CTA: ${copy.cta}`}>CTA: {copy.cta}</p>
                                                          </div>
                                                      </CardContent>
                                                  </Card>
                                              ))}
                                          </div>
                                      )}
                                 </ScrollArea>
                             </CardContent>
                            <CardFooter className="p-4 border-t border-[hsl(var(--border))]/30 flex-shrink-0">
                                <Button variant="outline" className={cn(neumorphicButtonStyle, "w-full h-9 px-4 text-sm")} onClick={() => resetFormFields(formData.campaign_id)} disabled={!formData.campaign_id || isLoading} > {/* Applied neumorphic style */}
                                    <PlusCircle className="mr-2 h-4 w-4" style={{ filter: `drop-shadow(0 0 3px ${neonColor})` }} /> Criar Nova Cópia Vazia
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
         </> {/* End Wrapper Fragment */}
        </Layout>
    );
}
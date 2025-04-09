// pages/export.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Layout from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label"; // <<< GARANTIR QUE ESTA LINHA ESTÁ AQUI E CORRETA
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Download, Loader2, FileText, BarChart3, DollarSign, Filter, TrendingUp, LineChart, Calendar as CalendarIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios';
import { format, subDays, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Campaign } from '@/entities/Campaign';

// --- Interfaces ---
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
  lastAutoTable?: { finalY: number };
}
interface ReportLoadingState { campaigns: boolean; budget: boolean; metrics: boolean; funnel: boolean; ltv: boolean; general: boolean; }
interface CampaignSelectItem { id: string; name: string; }
interface FunnelStage { name: string; value: number; displayValue: string; color: string; }
type ReportType = keyof ReportLoadingState;

// --- Constantes ---
const DATE_FORMAT_DISPLAY = 'dd/MM/yyyy';
const DATE_FORMAT_API = 'yyyy-MM-dd';
const DEFAULT_PERIOD_DAYS = 14;
const NEON_COLOR = '#1E90FF';
const NEON_COLOR_MUTED = '#4682B4';
const NEON_COLOR_RGB = [30, 144, 255];
const TEXT_COLOR_LIGHT = [230, 230, 230];
const TEXT_COLOR_MUTED = [160, 160, 160];
const TEXT_COLOR_HEADER = [255, 255, 255];
const TEXT_COLOR_ERROR = [255, 80, 80];
const BG_COLOR_DARK = [20, 20, 20];
const BG_TABLE_BODY = [30, 30, 30];
const BG_TABLE_ALT = [40, 40, 40];
const LOGO_PATH = '/logo.png';
const LOGO_WIDTH_MM = 30;
const LOGO_HEIGHT_MM = 12;
const PAGE_MARGIN = 15;
const FOOTER_HEIGHT = 15;

// --- Funções Auxiliares ---
const formatCurrency = (value: number): string => { if (isNaN(value)) return 'R$ 0,00'; return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
const formatNumber = (value: number): string => { if (isNaN(value)) return '0'; return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); };

// --- Componente ---
export default function ExportPage() {
    const { toast } = useToast();
    const [campaigns, setCampaigns] = useState<CampaignSelectItem[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
    const [campaignsLoading, setCampaignsLoading] = useState<boolean>(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), DEFAULT_PERIOD_DAYS - 1), to: new Date(),
    });
    const [isLoading, setIsLoading] = useState<ReportLoadingState>({
        campaigns: false, budget: false, metrics: false, funnel: false, ltv: false, general: false
    });
    const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
    const [popoverOpen, setPopoverOpen] = useState(false);

    // --- Estilos ---
    const cardStyle = "bg-[#141414]/80 backdrop-blur-sm shadow-[5px_5px_10px_rgba(0,0,0,0.4),-5px_-5px_10px_rgba(255,255,255,0.05)] rounded-lg border border-[hsl(var(--border))]/30";
    const primaryButtonStyle = `bg-gradient-to-r from-[hsl(var(--primary))] to-[${NEON_COLOR_MUTED}] hover:from-[${NEON_COLOR_MUTED}] hover:to-[hsl(var(--primary))] text-primary-foreground font-semibold shadow-[0_4px_10px_rgba(30,144,255,0.3)] transition-all duration-300 ease-in-out transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0e1015] focus:ring-[#5ca2e2]`;
    const titleStyle = "text-base font-semibold text-white";
    const neumorphicBaseStyle = "bg-[#141414] border-none text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)]";
    const selectTriggerStyle = cn(neumorphicBaseStyle, `hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:bg-[${NEON_COLOR}]/10 focus:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]`);
    const popoverContentStyle = `bg-[#1e2128] border-[${NEON_COLOR}]/30 text-white`;

     // --- Carregar Logo ---
     useEffect(() => { /* ... */ const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const img = new Image(); img.crossOrigin = "Anonymous"; img.src = LOGO_PATH; img.onload = () => { canvas.width = img.naturalWidth || 250; canvas.height = img.naturalHeight || 100; ctx?.drawImage(img, 0, 0, canvas.width, canvas.height); try { const dataUrl = canvas.toDataURL('image/png'); setLogoDataUrl(dataUrl); console.log("[PDF Gen] Logo carregado."); } catch (e) { console.error("[PDF Gen] Erro Data URL:", e); } }; img.onerror = () => { console.error("[PDF Gen] Erro ao carregar logo:", LOGO_PATH); }; }, []);
    // --- Busca Campanhas ---
    const fetchCampaignsClient = useCallback(async () => { /* ... */ setCampaignsLoading(true); try { const response = await axios.get<CampaignSelectItem[]>('/api/campaigns?fields=id,name'); setCampaigns(response.data || []); } catch (error: any) { console.error('Erro:', error); toast({ title: "Erro", description: "Falha campanhas.", variant: "destructive" }); } finally { setCampaignsLoading(false); } }, [toast]);
    useEffect(() => { fetchCampaignsClient(); }, [fetchCampaignsClient]);
    // --- Formatar Datas ---
    const getFormattedDateRange = (): { start: string; end: string } | null => { /* ... */ if (dateRange?.from && dateRange?.to && isValid(dateRange.from) && isValid(dateRange.to)) { return { start: format(dateRange.from, DATE_FORMAT_API), end: format(dateRange.to, DATE_FORMAT_API) }; } return null; };

    // --- Funções de Geração de Conteúdo PDF (Recebem 'doc') ---
    const addPdfHeaderFooter = (doc: jsPDF, pageNum: number, pageCount: number, title: string, campaignName: string, dateRangeStr: string) => { /* ... como antes ... */
        const pageHeight = doc.internal.pageSize.height; const pageWidth = doc.internal.pageSize.width;
        const originalColor = doc.getTextColor();
        doc.setFillColor(BG_COLOR_DARK[0], BG_COLOR_DARK[1], BG_COLOR_DARK[2]); doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setTextColor(TEXT_COLOR_LIGHT[0], TEXT_COLOR_LIGHT[1], TEXT_COLOR_LIGHT[2]);
        if (logoDataUrl) { try { const logoX = (pageWidth - LOGO_WIDTH_MM) / 2; doc.addImage(logoDataUrl, 'PNG', logoX, PAGE_MARGIN - 12, LOGO_WIDTH_MM, LOGO_HEIGHT_MM); } catch (imgError) { console.error("[PDF Gen] Erro logo:", imgError); } }
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(NEON_COLOR_RGB[0], NEON_COLOR_RGB[1], NEON_COLOR_RGB[2]); doc.text(title, pageWidth / 2, PAGE_MARGIN + LOGO_HEIGHT_MM, { align: 'center' });
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(NEON_COLOR_RGB[0], NEON_COLOR_RGB[1], NEON_COLOR_RGB[2]); doc.text(`${campaignName} | ${dateRangeStr}`, pageWidth / 2, PAGE_MARGIN + LOGO_HEIGHT_MM + 6, { align: 'center' });
        doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        const footerTextLeft = "Criado por USB ABC Conteúdo criativo 2025"; const footerTextRight = `Página ${pageNum} de ${pageCount}`; const dateStr = format(new Date(), "dd/MM/yyyy HH:mm");
        doc.text(footerTextLeft, PAGE_MARGIN, pageHeight - 8); doc.text(dateStr, pageWidth / 2, pageHeight - 8, { align: 'center' }); doc.text(footerTextRight, pageWidth - PAGE_MARGIN, pageHeight - 8, { align: 'right' });
        doc.setTextColor(originalColor[0], originalColor[1], originalColor[2]);
    };

    const addPdfText = (doc: jsPDF, text: string, x: number, y: number, options?: any, size?: number, style?: 'normal' | 'bold', color: number[] = TEXT_COLOR_LIGHT): { y: number, addedPage: boolean } => { /* ... como antes ... */
         const pageHeight = doc.internal.pageSize.height; const pageWidth = doc.internal.pageSize.width; const lineHeight = (size || 10) / 2.5 + 0.5; const lines = doc.splitTextToSize(text, pageWidth - PAGE_MARGIN * 2); const needed = lines.length * lineHeight; let newY = y; let addedPage = false;
         if (y + needed > pageHeight - PAGE_MARGIN - FOOTER_HEIGHT) { doc.addPage(); newY = PAGE_MARGIN + LOGO_HEIGHT_MM + 20; addedPage = true; }
         doc.setFontSize(size || 10); doc.setFont('helvetica', style || 'normal'); doc.setTextColor(color[0], color[1], color[2]); doc.text(lines, x, newY, options); return { y: newY + needed, addedPage };
     };

    const addCampaignsContent = (doc: jsPDFWithAutoTable, data: any[], currentY: number): { y: number, pageNum: number } => { /* ... como antes ... */
        console.log("[PDF Gen] addCampaignsContent"); let y = currentY; let pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber; if (!Array.isArray(data) || data.length === 0) { const res = addPdfText(doc, "Nenhuma campanha encontrada.", PAGE_MARGIN, y, undefined, 10, 'normal', TEXT_COLOR_MUTED); return { y: res.y, pageNum: res.addedPage ? pageNum + 1 : pageNum };}
        doc.autoTable({ startY: y, head: [['Nome', 'Plataforma', 'Objetivo', 'Orçamento Total', 'Orç. Diário', 'Duração(d)']], body: data.map(c => [ c.name || 'N/A', (Array.isArray(c.platform) ? c.platform.join(', ') : c.platform) || 'N/A', (Array.isArray(c.objective) ? c.objective.join(', ') : c.objective) || 'N/A', formatCurrency(c.budget || 0), formatCurrency(c.daily_budget || 0), c.duration || 'N/A' ]), theme: 'grid', headStyles: { fillColor: NEON_COLOR_RGB, textColor: TEXT_COLOR_HEADER, fontStyle: 'bold' }, bodyStyles: { fillColor: BG_TABLE_BODY, textColor: TEXT_COLOR_LIGHT }, alternateRowStyles: { fillColor: BG_TABLE_ALT }, styles: { cellPadding: 1.5, fontSize: 8, overflow: 'linebreak' }, didDrawPage: (hookData) => { y = PAGE_MARGIN + LOGO_HEIGHT_MM + 20; pageNum = hookData.pageNumber; } });
        y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 10; console.log("[PDF Gen] addCampaignsContent FIM, Y:", y, "Pág:", pageNum); return { y, pageNum };
    };
    const addBudgetContent = (doc: jsPDF, data: any, currentY: number): { y: number, pageNum: number } => { /* ... como antes ... */
         console.log("[PDF Gen] addBudgetContent"); let pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber; if (!data || typeof data !== 'object') { const res = addPdfText(doc, "Dados de orçamento inválidos.", PAGE_MARGIN, currentY, undefined, 10, 'normal', TEXT_COLOR_ERROR); return { y: res.y, pageNum: res.addedPage ? pageNum + 1 : pageNum }; } let y = currentY; let res; res = addPdfText(doc, `Orçamento Total: ${data.totalBudgetFmt || 'N/A'}`, PAGE_MARGIN, y, undefined, 11, 'bold', NEON_COLOR_RGB); y = res.y; if(res.addedPage) pageNum++; y += 4; res = addPdfText(doc, `- Custo Tráfego: ${data.trafficCostFmt || 'N/A'} (${data.trafficPerc || 0}%)`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Custo Criativos: ${data.creativeCostFmt || 'N/A'} (${data.creativePerc || 0}%)`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Custo Operacional: ${data.operationalCostFmt || 'N/A'} (${data.opPerc || 0}%)`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Lucro Esperado: ${data.profitFmt || 'N/A'} (${data.profitPerc || 0}%)`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; if (data.unallocatedValue > 0.01) { res = addPdfText(doc, `- Não Alocado: ${data.unallocatedFmt || 'N/A'} (${data.unallocatedPerc || 0}%)`, PAGE_MARGIN, y, undefined, 10, 'normal', TEXT_COLOR_MUTED); y = res.y; if(res.addedPage) pageNum++; } console.log("[PDF Gen] addBudgetContent FIM, Y:", y, "Pág:", pageNum); return { y, pageNum };
     };
    const addFunnelContent = (doc: jsPDF, data: any, currentY: number): { y: number, pageNum: number } => { /* ... como antes ... */
        console.log("[PDF Gen] addFunnelContent"); let pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber; if (!data || typeof data !== 'object') { const res = addPdfText(doc, "Dados do funil inválidos.", PAGE_MARGIN, currentY, undefined, 10, 'normal', TEXT_COLOR_ERROR); return { y: res.y, pageNum: res.addedPage ? pageNum + 1 : pageNum }; } let y = currentY; let res; res = addPdfText(doc, `Cliente: ${data.clientName || 'N/A'} | Produto: ${data.productName || 'N/A'}`, PAGE_MARGIN, y, undefined, 11, 'bold', NEON_COLOR_RGB); y = res.y; if(res.addedPage) pageNum++; y += 4; if (data.funnelData && Array.isArray(data.funnelData)) { res = addPdfText(doc, "Etapas do Funil (Diário):", PAGE_MARGIN, y, undefined, 10, 'bold'); y = res.y; if(res.addedPage) pageNum++; for (const stage of data.funnelData) { res = addPdfText(doc, `  - ${stage.name}: ${stage.displayValue || formatNumber(stage.value || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; } } else { res = addPdfText(doc, "Dados das etapas não disponíveis.", PAGE_MARGIN, y, undefined, 10, 'normal', TEXT_COLOR_MUTED); y = res.y; if(res.addedPage) pageNum++; } y += 4; res = addPdfText(doc, "Resumo Financeiro (Diário):", PAGE_MARGIN, y, undefined, 10, 'bold'); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `  - Volume Vendas: ${formatNumber(data.volume?.daily || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `  - Faturamento: ${formatCurrency(data.revenue?.daily || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `  - Lucro: ${formatCurrency(data.profit?.daily || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; console.log("[PDF Gen] addFunnelContent FIM, Y:", y, "Pág:", pageNum); return { y, pageNum };
     };
    const addMetricsContent = (doc: jsPDFWithAutoTable, data: any, currentY: number): { y: number, pageNum: number } => { /* ... como antes ... */
         console.log("[PDF Gen] addMetricsContent"); let pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber; if (!data || !data.totals) { const res = addPdfText(doc, "Dados de métricas inválidos.", PAGE_MARGIN, currentY, undefined, 10, 'normal', TEXT_COLOR_ERROR); return { y: res.y, pageNum: res.addedPage ? pageNum + 1 : pageNum }; } let y = currentY; let res; res = addPdfText(doc, "Principais Métricas (Período)", PAGE_MARGIN, y, undefined, 11, 'bold', NEON_COLOR_RGB); y = res.y; if(res.addedPage) pageNum++; y += 4; res = addPdfText(doc, `- Cliques: ${formatNumber(data.totals.clicks || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Impressões: ${formatNumber(data.totals.impressions || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Conversões: ${formatNumber(data.totals.conversions || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Custo Total: ${formatCurrency(data.totals.cost || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Receita Total: ${formatCurrency(data.totals.revenue || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- CTR: ${data.totals.ctr?.toFixed(2) || '0.00'}%`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- CPC: ${formatCurrency(data.totals.cpc || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Taxa Conv.: ${data.totals.conversionRate?.toFixed(2) || '0.00'}%`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Custo p/ Conv.: ${formatCurrency(data.totals.costPerConversion || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- ROI: ${isFinite(data.totals.roi) ? (data.totals.roi?.toFixed(1) || '0.0') + '%' : '∞'}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; y += 5; if (data.dailyData && data.dailyData.length > 0) { res = addPdfText(doc, "Dados Diários:", PAGE_MARGIN, y, undefined, 10, 'bold'); y = res.y; if(res.addedPage) pageNum++; doc.autoTable({ startY: y, head: [['Data', 'Cliques', 'Conv.', 'Custo', 'Receita']], body: data.dailyData.map((d: any) => [ d.date ? format(parseISO(d.date), DATE_FORMAT_DISPLAY) : 'N/A', formatNumber(d.clicks || 0), formatNumber(d.conversions || 0), formatCurrency(d.cost || 0), formatCurrency(d.revenue || 0) ]), theme: 'grid', headStyles: { fillColor: NEON_COLOR_RGB, textColor: TEXT_COLOR_HEADER, fontStyle: 'bold' }, bodyStyles: { fillColor: BG_TABLE_BODY, textColor: TEXT_COLOR_LIGHT }, alternateRowStyles: { fillColor: BG_TABLE_ALT }, styles: { cellPadding: 1.5, fontSize: 8, overflow: 'linebreak' }, didDrawPage: (hookData) => { y = PAGE_MARGIN + LOGO_HEIGHT_MM + 20; pageNum = hookData.pageNumber; } }); y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 10; } else { res = addPdfText(doc, "Nenhum dado diário encontrado.", PAGE_MARGIN, y, undefined, 10, 'normal', TEXT_COLOR_MUTED); y = res.y; if(res.addedPage) pageNum++; } console.log("[PDF Gen] addMetricsContent FIM, Y:", y, "Pág:", pageNum); return { y, pageNum };
     };
    const addLtvContent = (doc: jsPDF, data: any, currentY: number): { y: number, pageNum: number } => { /* ... como antes ... */
         console.log("[PDF Gen] addLtvContent"); let pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber; if (!data || !data.inputs) { const res = addPdfText(doc, "Dados de LTV inválidos.", PAGE_MARGIN, currentY, undefined, 10, 'normal', TEXT_COLOR_ERROR); return { y: res.y, pageNum: res.addedPage ? pageNum + 1 : pageNum }; } let y = currentY; let res; res = addPdfText(doc, "Cálculo de Lifetime Value (LTV)", PAGE_MARGIN, y, undefined, 11, 'bold', NEON_COLOR_RGB); y = res.y; if(res.addedPage) pageNum++; y += 4; res = addPdfText(doc, `- Ticket Médio: ${formatCurrency(data.inputs.avgTicket || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Frequência Compra (mês): ${data.inputs.purchaseFrequency?.toFixed(1) || '0.0'}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Tempo de Vida (meses): ${data.inputs.customerLifespan?.toFixed(0) || '0'}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; y += 4; res = addPdfText(doc, `LTV Estimado: ${formatCurrency(data.result || 0)}`, PAGE_MARGIN, y, undefined, 10, 'bold', NEON_COLOR_RGB); y = res.y; if(res.addedPage) pageNum++; console.log("[PDF Gen] addLtvContent FIM, Y:", y, "Pág:", pageNum); return { y, pageNum };
     };
    const addGeneralContent = (doc: jsPDF, data: any, currentY: number): { y: number, pageNum: number } => { /* ... como antes ... */
         console.log("[PDF Gen] addGeneralContent"); let pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber; if (!data) { const res = addPdfText(doc, "Dados gerais inválidos.", PAGE_MARGIN, currentY, undefined, 10, 'normal', TEXT_COLOR_ERROR); return { y: res.y, pageNum: res.addedPage ? pageNum + 1 : pageNum }; } let y = currentY; let res; res = addPdfText(doc, "Resumo Geral Consolidado", PAGE_MARGIN, y, undefined, 12, 'bold', NEON_COLOR_RGB); y = res.y; if(res.addedPage) pageNum++; y += 6; if(data.metrics?.totals){ res = addPdfText(doc, "Métricas Chave (Período)", PAGE_MARGIN, y, undefined, 10, 'bold'); y = res.y; if(res.addedPage) pageNum++; y += 4; res = addPdfText(doc, `- Custo Total: ${formatCurrency(data.metrics.totals.cost || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Receita Total: ${formatCurrency(data.metrics.totals.revenue || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- ROI: ${isFinite(data.metrics.totals.roi) ? (data.metrics.totals.roi?.toFixed(1) || '0.0') + '%' : '∞'}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Custo p/ Conv.: ${formatCurrency(data.metrics.totals.costPerConversion || 0)}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; y += 6; } else { res = addPdfText(doc, "Métricas Chave não disponíveis.", PAGE_MARGIN, y, undefined, 10, 'normal', TEXT_COLOR_MUTED); y = res.y; if(res.addedPage) pageNum++; y += 6;} if(data.campaigns){ res = addPdfText(doc, "Campanhas Consideradas", PAGE_MARGIN, y, undefined, 10, 'bold'); y = res.y; if(res.addedPage) pageNum++; y += 4; if (data.campaigns.length > 0) { for(const c of data.campaigns.slice(0,8)) { res = addPdfText(doc, `  - ${c.name}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; } if(data.campaigns.length > 8) { res = addPdfText(doc, "  ...", PAGE_MARGIN, y, undefined, 10, 'normal', TEXT_COLOR_MUTED); y = res.y; if(res.addedPage) pageNum++; } } else { res = addPdfText(doc, "  Nenhuma campanha encontrada.", PAGE_MARGIN, y, undefined, 10, 'normal', TEXT_COLOR_MUTED); y = res.y; if(res.addedPage) pageNum++; } y += 6; } else { res = addPdfText(doc, "Campanhas não disponíveis.", PAGE_MARGIN, y, undefined, 10, 'normal', TEXT_COLOR_MUTED); y = res.y; if(res.addedPage) pageNum++; y += 6;} if(data.budget){ res = addPdfText(doc, "Orçamento Resumido", PAGE_MARGIN, y, undefined, 10, 'bold'); y = res.y; if(res.addedPage) pageNum++; y += 4; res = addPdfText(doc, `- Total: ${data.budget.totalBudgetFmt || 'N/A'}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; res = addPdfText(doc, `- Alocado(%): ${(data.budget && data.budget.unallocatedValue <= 0.01) ? '100%' : `${(100 - (data.budget.unallocatedPerc || 0)).toFixed(0)}%`}`, PAGE_MARGIN, y); y = res.y; if(res.addedPage) pageNum++; } else { res = addPdfText(doc, "Orçamento não disponível.", PAGE_MARGIN, y, undefined, 10, 'normal', TEXT_COLOR_MUTED); y = res.y; if(res.addedPage) pageNum++; y += 6; } console.log("[PDF Gen] addGeneralContent FIM, Y:", y, "Pág:", pageNum); return { y, pageNum };
     };

    // --- Função Principal de Geração ---
    const generatePdf = async (reportType: ReportType, title: string, fetchData: (params: any) => Promise<any>) => {
        if (isLoading[reportType]) return;
        console.log(`[PDF Gen] Iniciando: ${reportType}`);
        setIsLoading(prev => ({ ...prev, [reportType]: true }));
        toast({ title: `Gerando: ${title}...`, description: "Aguarde..." });
        const campaignIdForFetch = selectedCampaignId === 'all' ? null : selectedCampaignId;
        const formattedDateRange = getFormattedDateRange();
        if (!formattedDateRange && ['metrics', 'general'].includes(reportType)) { toast({ title: "Erro", description: "Selecione período.", variant: "destructive" }); setIsLoading(prev => ({ ...prev, [reportType]: false })); return; }
        const fetchParams = { campaignId: campaignIdForFetch, startDate: formattedDateRange?.start, endDate: formattedDateRange?.end };

        try {
            const data = await fetchData(fetchParams);
            if (!data) { throw new Error("Dados não retornados."); }

            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
            let currentY = PAGE_MARGIN + LOGO_HEIGHT_MM + 20;
            let currentPage = 1;

            const contentFunctions: Record<ReportType, (doc: any, data: any, y: number) => {y: number, pageNum: number}> = {
                campaigns: addCampaignsContent, budget: addBudgetContent, metrics: addMetricsContent, funnel: addFunnelContent, ltv: addLtvContent, general: addGeneralContent,
            };

            const contentRenderer = contentFunctions[reportType];
            if (contentRenderer) {
                console.log(`[PDF Gen] Chamando renderer: ${reportType}`);
                const result = contentRenderer(doc, data, currentY);
                currentY = result.y; currentPage = result.pageNum;
            } else {
                console.error(`[PDF Gen] Renderizador NULO: ${reportType}`);
                const res = addPdfText(doc, `Erro: Renderizador não implementado.`, PAGE_MARGIN, currentY, undefined, 10, 'normal', TEXT_COLOR_ERROR); currentY = res.y; if(res.addedPage) currentPage++;
            }

            // --- Finaliza e Salva ---
            const totalPages = (doc as any).internal.pages.length -1 || 1;
            console.log(`[PDF Gen] Finalizando ${totalPages} páginas...`);
             for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                const campaignName = campaignIdForFetch ? campaigns.find(c => c.id === campaignIdForFetch)?.name || `ID ${campaignIdForFetch}` : 'Todas Campanhas';
                const dateRangeStr = formattedDateRange ? `Período: ${format(parseISO(formattedDateRange.start), DATE_FORMAT_DISPLAY)} a ${format(parseISO(formattedDateRange.end), DATE_FORMAT_DISPLAY)}` : 'Período não aplicável';
                addPdfHeaderFooter(doc, i, totalPages, title, campaignName, dateRangeStr);
            }
            doc.setPage(1);

            const fileName = `${reportType}_relatorio_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
            console.log(`[PDF Gen] Salvando ${fileName}...`);
            doc.save(fileName);
            console.log(`[PDF Gen] Download iniciado.`);
            toast({ title: "Sucesso!", description: `Relatório "${title}" gerado.` });

        } catch (error: any) {
            console.error(`[PDF Gen] Erro CRÍTICO ${reportType}:`, error);
            toast({ title: "Erro ao Gerar PDF", description: error.message || "Verifique o console.", variant: "destructive" });
        } finally {
            console.log(`[PDF Gen] Finalizando isLoading: ${reportType}.`);
            setIsLoading(prev => ({ ...prev, [reportType]: false }));
        }
    };

     // --- Funções de Fetch (mantidas) ---
     const fetchCampaignData = async (params: { campaignId: string | null }) => { console.log('[fetchCampaignData]', params); const url = params.campaignId ? `/api/campaigns?id=${params.campaignId}` : '/api/campaigns'; const response = await axios.get(url); if (params.campaignId && response.data && !Array.isArray(response.data)) { return [response.data]; } return response.data || []; };
     const fetchBudgetData = async (params: { campaignId: string | null }) => { console.log("Fetching Budget (Simulated)", params); await new Promise(resolve => setTimeout(resolve, 300)); const factor = params.campaignId ? 0.7 : 1; const total = 5000 * factor; const trafficP = 55, creativeP = 20, opP = 10, profitP = 15; const trafficV = total * (trafficP / 100); const creativeV = total * (creativeP / 100); const opV = total * (opP / 100); const profitV = total * (profitP / 100); const unallocP = Math.max(0, 100 - (trafficP + creativeP + opP + profitP)); const unallocV = total * (unallocP / 100); return { totalBudgetFmt: formatCurrency(total), trafficCostFmt: formatCurrency(trafficV), trafficPerc: trafficP, creativeCostFmt: formatCurrency(creativeV), creativePerc: creativeP, operationalCostFmt: formatCurrency(opV), opPerc: opP, profitFmt: formatCurrency(profitV), profitPerc: profitP, unallocatedFmt: formatCurrency(unallocV), unallocatedPerc: unallocP, unallocatedValue: unallocV, }; };
     const fetchFunnelData = async (params: { campaignId: string | null }) => { console.log("Fetching Funnel (Simulated)", params); await new Promise(resolve => setTimeout(resolve, 350)); const factor = params.campaignId ? 0.8 : 1; const dailyInvestment = 279.70 * factor; const cpc = 1.95 / factor; const productPrice = 97.00; const organicReach = 12000 * factor; const reachToClickConversion = 2.0 / 100; const siteConversionRate = 2.5 / 100; const cliquesPagos = cpc > 0 ? dailyInvestment / cpc : 0; const visitantesPagos = cliquesPagos; const visitantesOrganicos = organicReach * reachToClickConversion; const totalVisitantes = visitantesPagos + visitantesOrganicos; const vendasDiarias = totalVisitantes * siteConversionRate; const faturamentoDiario = vendasDiarias * productPrice; const lucroDiario = faturamentoDiario - dailyInvestment; return { clientName: params.campaignId ? `Cliente Camp. ${params.campaignId.substring(0, 5)}` : "Cliente Geral", productName: params.campaignId ? "Produto Específico" : "Produto Geral", funnelData: [ { name: "Investimento", value: dailyInvestment, displayValue: `${formatCurrency(dailyInvestment)}/d`, color: '#1E90FF' }, { name: "Visit. Pagos", value: visitantesPagos, displayValue: `${formatNumber(visitantesPagos)}/d`, color: '#22C55E' }, { name: "Visit. Orgân.", value: visitantesOrganicos, displayValue: `${formatNumber(visitantesOrganicos)}/d`, color: '#3abf9a' }, { name: "Total Visit.", value: totalVisitantes, displayValue: `${formatNumber(totalVisitantes)}/d`, color: '#FACC15' }, { name: "Vendas", value: vendasDiarias, displayValue: `${formatNumber(vendasDiarias)}/d`, color: '#F97316' }, { name: "Faturamento", value: faturamentoDiario, displayValue: `${formatCurrency(faturamentoDiario)}/d`, color: '#FF5722' }, ], volume: { daily: vendasDiarias }, revenue: { daily: faturamentoDiario }, profit: { daily: lucroDiario }, }; };
     const fetchMetricsData = async (params: { campaignId: string | null, startDate?: string, endDate?: string }) => { console.log("Fetching Metrics (Simulated)", params); await new Promise(resolve => setTimeout(resolve, 400)); const start = params.startDate && isValid(parseISO(params.startDate)) ? parseISO(params.startDate) : subDays(new Date(), DEFAULT_PERIOD_DAYS -1); const end = params.endDate && isValid(parseISO(params.endDate)) ? parseISO(params.endDate) : new Date(); const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1); const factor = params.campaignId ? 0.6 : 1; const dailyData = Array.from({ length: days }).map((_, i) => { const date = format(subDays(end, i), DATE_FORMAT_API); const clicks = Math.floor((80 + Math.random() * 40) * factor); const impressions = clicks * (10 + Math.random() * 5); const conversions = Math.max(0, Math.floor(clicks * (0.04 + Math.random() * 0.04) * factor)); const cost = clicks * (0.7 + Math.random() * 0.5) / factor; const revenue = conversions * (80 + Math.random() * 30); return { date, clicks, impressions, conversions, cost, revenue }; }).reverse(); const totals = dailyData.reduce((acc, day) => { acc.clicks += day.clicks; acc.impressions += day.impressions; acc.conversions += day.conversions; acc.cost += day.cost; acc.revenue += day.revenue; return acc; }, { clicks: 0, impressions: 0, conversions: 0, cost: 0, revenue: 0 }); const safeClicks = totals.clicks || 1; const safeImpressions = totals.impressions || 1; const safeConversions = totals.conversions || 1; const safeCost = totals.cost || 1; const summary = { clicks: totals.clicks, impressions: totals.impressions, conversions: totals.conversions, cost: totals.cost, revenue: totals.revenue, ctr: (totals.clicks / safeImpressions) * 100, cpc: totals.cost / safeClicks, conversionRate: (totals.conversions / safeClicks) * 100, costPerConversion: totals.cost / safeConversions, roi: totals.cost > 0 ? ((totals.revenue - totals.cost) / totals.cost) * 100 : (totals.revenue > 0 ? Infinity : 0) }; return { totals: summary, dailyData }; };
     const fetchLtvData = async (params: { campaignId: string | null }) => { console.log("Fetching LTV (Simulated)", params); await new Promise(resolve => setTimeout(resolve, 250)); const factor = params.campaignId ? 1.1 : 1; const avgTicket = 110 * factor; const purchaseFrequency = 1.8 * factor; const customerLifespan = 10 * factor; const ltv = avgTicket * purchaseFrequency * customerLifespan; return { inputs: { avgTicket, purchaseFrequency, customerLifespan }, result: ltv }; };
     const fetchGeneralData = async (params: { campaignId: string | null, startDate?: string, endDate?: string }) => { console.log("Fetching General (Simulated)", params); await new Promise(resolve => setTimeout(resolve, 500)); const [campaignsData, budgetData, metricsData] = await Promise.all([ fetchCampaignData({ campaignId: params.campaignId }), fetchBudgetData({ campaignId: params.campaignId }), fetchMetricsData(params) ]); return { campaigns: Array.isArray(campaignsData) ? campaignsData.map(c => ({ id: c.id, name: c.name })) : [], budget: budgetData, metrics: metricsData, }; };

    // --- Renderização ---
    return (
        <Layout>
            <Head> <title>Exportar Relatórios - USBMKT</title> </Head>
            <div className="space-y-4">
                 <h1 className="text-2xl font-black text-white mb-4" style={{ textShadow: `0 0 8px ${NEON_COLOR}` }}> Exportar Relatórios PDF </h1>
                 {/* Filtros */}
                 <Card className={cn(cardStyle, "p-3")}> <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-3 items-end"> <div className="space-y-1"> <Label htmlFor="campaign_select_export" className="text-xs text-gray-300 pl-1" style={{ textShadow: `0 0 4px ${NEON_COLOR_MUTED}` }}>Campanha</Label> <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId} disabled={campaignsLoading || Object.values(isLoading).some(Boolean)}> <SelectTrigger id="campaign_select_export" className={cn(selectTriggerStyle, "w-full h-9 px-3 text-xs")}> <SelectValue placeholder={campaignsLoading ? "Carregando..." : "Selecionar..."} /> </SelectTrigger> <SelectContent className={cn(popoverContentStyle)}> <SelectItem value="all" className="text-xs hover:!bg-[#1E90FF]/20 focus:!bg-[#1E90FF]/30">-- Todas --</SelectItem> {campaigns.length === 0 && !campaignsLoading && <div className="px-3 py-2 text-xs text-gray-500">Nenhuma.</div>} {campaigns.map(campaign => ( <SelectItem key={campaign.id} value={campaign.id} className="text-xs hover:!bg-[#1E90FF]/20 focus:!bg-[#1E90FF]/30"> {campaign.name} </SelectItem> ))} </SelectContent> </Select> </div> <div className="space-y-1"> <Label htmlFor="date_range_export_label" className="text-xs text-gray-300 pl-1" style={{ textShadow: `0 0 4px ${NEON_COLOR_MUTED}` }}>Período</Label> <Popover open={popoverOpen} onOpenChange={setPopoverOpen}> <PopoverTrigger asChild> <div id="date_range_export_trigger_wrapper" role="button" aria-expanded={popoverOpen} aria-haspopup="dialog" tabIndex={0} className={cn( selectTriggerStyle, "flex items-center w-full justify-start text-left font-normal h-9 px-3 text-xs cursor-pointer", !dateRange && "text-muted-foreground" )} onClick={() => !Object.values(isLoading).some(Boolean) && setPopoverOpen(true)} onKeyDown={(e) => { if (!Object.values(isLoading).some(Boolean) && (e.key === 'Enter' || e.key === ' ')) setPopoverOpen(true); }} aria-disabled={Object.values(isLoading).some(Boolean)} > <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-400 flex-shrink-0" style={{ filter: `drop-shadow(0 0 3px ${NEON_COLOR})` }} /> <span className="truncate flex-grow"> {dateRange?.from && isValid(dateRange.from) ? ( dateRange.to && isValid(dateRange.to) ? ( `${format(dateRange.from, "dd/MM/y", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/y", { locale: ptBR })}` ) : ( format(dateRange.from, "dd/MM/y", { locale: ptBR }) ) ) : ( "Selecione" )} </span> </div> </PopoverTrigger> <PopoverContent className={cn(popoverContentStyle, "w-auto p-0")} align="start"> <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={(range) => {setDateRange(range); setPopoverOpen(false);}} numberOfMonths={2} locale={ptBR} className="text-white [&>div>table>tbody>tr>td>button]:text-white [&>div>table>tbody>tr>td>button]:border-[#1E90FF]/20 [&>div>table>thead>tr>th]:text-gray-400 [&>div>div>button]:text-white [&>div>div>button:hover]:bg-[#1E90FF]/20 [&>div>div>div]:text-white" /> </PopoverContent> </Popover> </div> </CardContent> </Card>
                 {/* Grid de Relatórios */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {[ { key: 'campaigns', title: 'Campanhas', desc: 'Lista das campanhas.', icon: FileText, fetchFn: fetchCampaignData }, { key: 'budget', title: 'Orçamento', desc: 'Distribuição e valores.', icon: DollarSign, fetchFn: fetchBudgetData }, { key: 'metrics', title: 'Métricas', desc: 'Desempenho e custos.', icon: BarChart3, fetchFn: fetchMetricsData }, { key: 'funnel', title: 'Funil', desc: 'Simulação de vendas.', icon: Filter, fetchFn: fetchFunnelData }, { key: 'ltv', title: 'LTV', desc: 'Cálculo do Lifetime Value.', icon: LineChart, fetchFn: fetchLtvData }, { key: 'general', title: 'Geral', desc: 'Resumo consolidado.', icon: TrendingUp, fetchFn: fetchGeneralData }, ].map((report) => ( <Card key={report.key} className={cn(cardStyle)}> <CardHeader className="pb-2"> <CardTitle className={cn(titleStyle, "flex items-center")}> <report.icon className="mr-2 h-4 w-4" style={{ filter: `drop-shadow(0 0 4px ${NEON_COLOR})` }} /> {report.title} </CardTitle> <CardDescription className="text-xs text-gray-400 pt-1">{report.desc}</CardDescription> </CardHeader> <CardContent> <Button className={cn(primaryButtonStyle, "w-full h-9 text-sm")} onClick={() => generatePdf(report.key as keyof ReportLoadingState, `Relatório de ${report.title}`, report.fetchFn)} disabled={isLoading[report.key as keyof ReportLoadingState]}> {isLoading[report.key as keyof ReportLoadingState] ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />} {isLoading[report.key as keyof ReportLoadingState] ? 'Gerando...' : 'Exportar'} </Button> </CardContent> </Card> ))} </div>
            </div>
        </Layout>
    );
}